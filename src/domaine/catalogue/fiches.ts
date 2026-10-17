import { registre } from "@/connecteurs/registre";
import type { Article, EtatDisponibilite, MensualiteForcee, OffreMiseADisposition, Palier } from "@/connecteurs/odoo/interfaces";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { lireParametre } from "@/lib/parametres";
import { dbSite } from "@/lib/db/site";
import { FAMILLES, type CleFamille } from "../familles";
import { carteDe, type Carte } from "./categories";
import { cheminFicheDe, lireCatalogue, lireContenus, lireNoms, type ContenuComplet, type EntreeCatalogue } from "./lecture";
import { mensualites, type Mensualite } from "./prix";
import { photosDe, textesDe, type DocumentProduit, type PhotoProduit, type TextesProduit } from "./publication";

// Fiche produit (F03, US2 à US5) : partie publique lue dans le catalogue mis en cache ;
// prix et mensualités propres au client connecté lus à chaque affichage, hors cache partagé,
// et jamais rendus pour un autre visiteur (FR-046, C1).

import type { FormuleFiche } from "./formules";

export { FORMULE_PAR_SLUG, SLUG_FORMULE, type FormuleFiche } from "./formules";

export type VarianteFiche = {
  defaultCode: string;
  configuration: string | null;
  referenceFabricant: string | null;
  prixHt: number;
  prixCatalogueHt: number;
  tauxTva: number;
  quantiteParLot: number;
  paliers: Palier[];
  achat: EtatDisponibilite | null;
  miseADisposition: EtatDisponibilite | null;
  quantiteDisponible: number | null;
  delaiReassortJours: number | null;
  offreMad: OffreMiseADisposition | null;
  kitRequis: { defaultCode: string; nom: string; prixHt: number } | null;
  mensualites: Mensualite[];
};

export type Fiche = {
  type: "equipement" | "consommable";
  reference: string;
  chemin: string;
  categorie: { libelle: string; chemin: string };
  nom: string;
  marque: string;
  textes: TextesProduit;
  photos: PhotoProduit[];
  documents: DocumentProduit[];
  formules: FormuleFiche[];
  variantes: VarianteFiche[];
  /** Consommables compatibles (équipement) ou équipements compatibles (consommable). */
  compatibles: (Carte & { variantes: VarianteFiche[] })[];
  associes: Carte[];
  mentionFinancement: string;
  /** Odoo injoignable : ni prix ni disponibilité affirmés (US5-5). */
  indisponible: false;
};

export type FicheIndisponible = {
  indisponible: true;
  nom: string;
  marque: string | null;
  textes: TextesProduit;
  photos: PhotoProduit[];
  categorie: { libelle: string; chemin: string };
};

export type ResultatFiche =
  | { type: "fiche"; fiche: Fiche }
  | { type: "indisponible"; fiche: FicheIndisponible }
  | { type: "redirection"; chemin: string }
  | { type: "retire"; nom: string; categorie: { libelle: string; chemin: string } }
  | null;

const TYPES_EQUIPEMENT = new Set<Article["type"]>(["equipement", "logiciel"]);

function documentsDe(c: { documents: unknown }): DocumentProduit[] {
  return Array.isArray(c.documents) ? (c.documents as DocumentProduit[]) : [];
}

function humaniser(slug: string): string {
  const t = slug.replace(/-/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Montants propres au client connecté : prix (remises) et mensualités forcées, par variante. */
async function montantsClient(compteId: string | null | undefined, codes: string[]) {
  const vide = new Map<string, { prixHt: number; mensualitesForcees: MensualiteForcee[] }>();
  if (!compteId) return vide;
  const compte = await dbSite().compteClient.findUnique({ where: { id: compteId }, select: { odooPartnerRef: true } });
  if (!compte?.odooPartnerRef) return vide;
  try {
    const prix = await registre.odoo().catalogue.lirePrixClient(compte.odooPartnerRef, codes);
    return new Map(prix.map((p) => [p.defaultCode, { prixHt: p.prixHt, mensualitesForcees: p.mensualitesForcees }]));
  } catch (e) {
    if (estErreurConnecteur(e)) return vide; // prix publics, sans remise
    throw e;
  }
}

function variantesDe(
  e: EntreeCatalogue,
  client: Map<string, { prixHt: number; mensualitesForcees: MensualiteForcee[] }>,
  parCode: Map<string, EntreeCatalogue>,
): VarianteFiche[] {
  return e.article.variantes.map((v) => {
    const c = client.get(v.defaultCode);
    const prixHt = c?.prixHt ?? v.prixHt;
    const dispo = e.disponibilites.get(v.defaultCode);
    const kit = v.offreMiseADisposition?.kitRequis ? parCode.get(v.offreMiseADisposition.kitRequis) : undefined;
    const varianteKit = kit?.article.variantes.find((x) => x.defaultCode === v.offreMiseADisposition?.kitRequis);
    return {
      defaultCode: v.defaultCode,
      configuration: v.configuration,
      referenceFabricant: v.referenceFabricant,
      prixHt,
      prixCatalogueHt: v.prixHt,
      tauxTva: v.tauxTva,
      quantiteParLot: v.quantiteParLot,
      paliers: v.paliers,
      achat: dispo?.achat ?? null,
      miseADisposition: dispo?.miseADisposition ?? null,
      quantiteDisponible: dispo?.quantiteDisponible ?? null,
      delaiReassortJours: dispo?.delaiReassortJours ?? null,
      offreMad: v.offreMiseADisposition,
      kitRequis: kit && varianteKit ? { defaultCode: varianteKit.defaultCode, nom: kit.article.nom, prixHt: varianteKit.prixHt } : null,
      mensualites: e.article.formules.includes("financement")
        ? mensualites({ prixHt, mensualitesForcees: v.mensualitesForcees }, e.article.baremeFinancement, c?.mensualitesForcees ?? [])
        : [],
    };
  });
}

/** Contenu correspondant à l'adresse (slug actuel ou ancien). */
async function contenuPourSlug(contenus: ContenuComplet[], slug: string) {
  return contenus.find((c) => c.slug === slug) ?? contenus.find((c) => c.anciensSlugs.includes(slug)) ?? null;
}

export async function lireFiche(cle: CleFamille, slug: string, compteId?: string | null): Promise<ResultatFiche> {
  const famille = FAMILLES[cle];
  const categorie = { libelle: famille.libelle, chemin: famille.chemin };
  const contenus = await lireContenus();
  const contenu = await contenuPourSlug(contenus, slug);
  if (!contenu || contenu.etat === "preparation") return null;

  const catalogue = await lireCatalogue();
  if (catalogue.indisponible) {
    const noms = await lireNoms();
    const n = noms[contenu.defaultCode];
    if (n && n.categorie !== famille.categorie) return null;
    return {
      type: "indisponible",
      fiche: { indisponible: true, nom: n?.nom ?? humaniser(contenu.slug), marque: n?.marque ?? null, textes: textesDe(contenu), photos: photosDe(contenu), categorie },
    };
  }

  const entree = catalogue.entrees.find((e) => e.contenu.id === contenu.id);
  if (!entree) {
    // Publié mais retiré (ou disparu d'Odoo) : l'adresse ne mène pas à une erreur brute.
    const noms = await lireNoms();
    return { type: "retire", nom: noms[contenu.defaultCode]?.nom ?? humaniser(contenu.slug), categorie };
  }
  if (entree.article.categorie !== famille.categorie) return null;
  if (contenu.slug !== slug) return { type: "redirection", chemin: entree.chemin };

  const parCode = new Map<string, EntreeCatalogue>();
  for (const e of catalogue.entrees) for (const v of e.article.variantes) parCode.set(v.defaultCode, e);

  const type = TYPES_EQUIPEMENT.has(entree.article.type) ? "equipement" : "consommable";
  const codes = new Set(entree.article.variantes.map((v) => v.defaultCode));
  const ajouts = new Set(contenu.compatibilites);
  const compatiblesEntrees =
    type === "equipement"
      ? catalogue.entrees.filter(
          (e) =>
            !TYPES_EQUIPEMENT.has(e.article.type) &&
            (e.article.compatibleAvec.some((c) => codes.has(c)) || e.contenu.compatibilites.some((c) => codes.has(c)) || ajouts.has(e.article.reference)),
        )
      : catalogue.entrees.filter(
          (e) =>
            TYPES_EQUIPEMENT.has(e.article.type) &&
            (e.article.variantes.some((v) => entree.article.compatibleAvec.includes(v.defaultCode)) || ajouts.has(e.article.reference)),
        );

  const codesClient = [...codes, ...compatiblesEntrees.flatMap((e) => e.article.variantes.map((v) => v.defaultCode))];
  const client = await montantsClient(compteId, codesClient);

  const associesChoisis = contenu.produitsAssocies
    .map((ref) => parCode.get(ref))
    .filter((e): e is EntreeCatalogue => Boolean(e) && e!.contenu.id !== contenu.id);
  const associes = (associesChoisis.length ? associesChoisis : type === "equipement" ? compatiblesEntrees : []).slice(0, 4).map(carteDe);

  return {
    type: "fiche",
    fiche: {
      type,
      reference: entree.article.reference,
      chemin: entree.chemin,
      categorie,
      nom: entree.article.nom,
      marque: entree.article.marque,
      textes: textesDe(contenu),
      photos: photosDe(contenu),
      documents: documentsDe(contenu),
      formules: type === "consommable" ? ["achat"] : entree.article.formules,
      variantes: variantesDe(entree, client, parCode),
      compatibles: compatiblesEntrees.map((e) => ({ ...carteDe(e), variantes: variantesDe(e, client, parCode) })),
      associes,
      mentionFinancement:
        (await lireParametre("financement.mention")) ?? "Montant indicatif, sous réserve d'acceptation par notre partenaire financier.",
      indisponible: false,
    },
  };
}

export { cheminFicheDe };
