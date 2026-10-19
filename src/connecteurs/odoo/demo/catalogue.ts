import type { Prisma } from "@generated/demo/client";
import { NotFound } from "../../erreurs";
import type {
  Article,
  CatalogueOdoo,
  Categorie,
  FiltresArticles,
  PrixClient,
  ReferenceArticle,
  ResumeArticle,
} from "../interfaces";
import type { EtatDisponibilite, MensualiteForcee, Palier } from "../interfaces";
import { INCLURE_DISPONIBILITE, etatsAchat } from "./disponibilite";
import { db } from "./outils";

// Domaine « Catalogue » en démonstration (contracts/odoo.md §1).

const INCLURE_MODELE = {
  categorie: true,
  variantes: { include: INCLURE_DISPONIBILITE, orderBy: { id: "asc" } },
} as const satisfies Prisma.ModeleArticleInclude;

type ModeleComplet = Prisma.ModeleArticleGetPayload<{ include: typeof INCLURE_MODELE }>;

/** Disponibilités à l'achat de toutes les variantes de ces modèles (packs compris). */
async function etatsDesModeles(modeles: ModeleComplet[]) {
  return etatsAchat(modeles.flatMap((m) => m.variantes));
}

function resumer(m: ModeleComplet, dispo: Map<string, EtatDisponibilite>): ResumeArticle | null {
  const premiere = m.variantes[0];
  if (!premiere) return null;
  const prix = Math.min(...m.variantes.map((v) => v.prixHtCentimes));
  // Disponibilité de l'article : la meilleure de ses variantes.
  const etats = m.variantes.map((v) => dispo.get(v.defaultCode)!);
  const disponibilite =
    etats.find((e) => e.etat === "disponible") ??
    etats
      .filter((e) => e.etat === "delai")
      .sort((a, b) => (a.etat === "delai" && b.etat === "delai" ? a.delaiJours - b.delaiJours : 0))[0] ??
    etats[0] ?? { etat: "indisponible" as const };
  return {
    reference: premiere.defaultCode,
    nom: m.nom,
    marque: m.marque,
    type: m.type,
    categorie: m.categorie.code,
    prixAPartirDeHt: prix,
    formules: m.formules as ResumeArticle["formules"],
    disponibilite,
    referenceFictive: m.referenceFictive,
    prixInvente: m.variantes.some((v) => v.prixInvente),
    estFictif: m.estFictif,
  };
}

function nonNul<T>(x: T | null): x is T {
  return x !== null;
}

export const catalogueDemo: CatalogueOdoo = {
  async listerCategories(): Promise<Categorie[]> {
    const categories = await db().categorie.findMany({
      include: { parent: true },
      orderBy: [{ ordre: "asc" }, { nom: "asc" }],
    });
    return categories.map((c) => ({
      code: c.code,
      nom: c.nom,
      ordre: c.ordre,
      parentCode: c.parent?.code ?? null,
      estFictif: c.estFictif,
    }));
  },

  async listerArticles(categorie: string, filtres: FiltresArticles = {}): Promise<ResumeArticle[]> {
    const modeles = await db().modeleArticle.findMany({
      where: {
        OR: [{ categorie: { code: categorie } }, { categorie: { parent: { code: categorie } } }],
        ...(filtres.marque ? { marque: filtres.marque } : {}),
        ...(filtres.type ? { type: filtres.type } : {}),
      },
      include: INCLURE_MODELE,
      orderBy: [{ marque: "asc" }, { nom: "asc" }],
    });
    const dispo = await etatsDesModeles(modeles);
    return modeles
      .map((m) => resumer(m, dispo))
      .filter(nonNul)
      .filter((a) => !filtres.disponibilite || a.disponibilite.etat === filtres.disponibilite);
  },

  async lireArticle(reference: string): Promise<Article> {
    const variante = await db().variante.findUnique({
      where: { defaultCode: reference },
      select: { modeleId: true },
    });
    if (!variante) throw new NotFound("Article", reference);
    const m = await db().modeleArticle.findUniqueOrThrow({
      where: { id: variante.modeleId },
      include: INCLURE_MODELE,
    });
    const bareme = m.formules.includes("financement")
      ? await db().baremeFinancement.findMany({ orderBy: { dureeMois: "asc" } })
      : [];
    const publiques = await reglesPubliques();
    return {
      reference: m.variantes[0]?.defaultCode ?? reference,
      nom: m.nom,
      marque: m.marque,
      type: m.type,
      categorie: m.categorie.code,
      description: m.description,
      formules: m.formules as Article["formules"],
      eligibleBonsAchat: m.eligibleBonsAchat,
      suiviNumeroSerie: m.suiviNumeroSerie,
      referenceFictive: m.referenceFictive,
      compatibleAvec: m.compatibleAvec,
      estFictif: m.estFictif,
      variantes: m.variantes.map((v) => ({
        defaultCode: v.defaultCode,
        referenceFabricant: v.referenceFabricant,
        configuration: v.configuration,
        attributs: v.attributs as Record<string, string>,
        prixHt: v.prixHtCentimes,
        tauxTva: Number(v.tauxTva),
        prixInvente: v.prixInvente,
        estFictif: v.estFictif,
        offreMiseADisposition: v.offreMad
          ? {
              premierMoisHt: v.offreMad.premierMoisCentimes,
              moisSuivantsHt: v.offreMad.moisSuivantsCentimes,
              kitRequis: v.offreMad.kitRequis,
              valeurRemplacementHt: v.offreMad.valeurRemplacementCentimes,
              logiciel: v.offreMad.logiciel,
              contenuPack: v.offreMad.contenuPack,
            }
          : null,
        quantiteParLot: v.quantiteParLot,
        composants: v.composants,
        paliers: paliersDe(publiques, v.defaultCode),
        mensualitesForcees: m.formules.includes("financement") ? mensualitesDe(publiques, v.defaultCode) : [],
      })),
      baremeFinancement: bareme.map((b) => ({
        dureeMois: b.dureeMois,
        coefficientPourcent: Number(b.coefficient),
      })),
    };
  },

  async lirePrixClient(partenaireRef: string, references: string[]): Promise<PrixClient[]> {
    return prixClient(partenaireRef, references);
  },

  async rechercher(texte: string): Promise<ResumeArticle[]> {
    const t = texte.trim();
    if (!t) return [];
    const modeles = await db().modeleArticle.findMany({
      where: {
        OR: [
          { nom: { contains: t, mode: "insensitive" } },
          { marque: { contains: t, mode: "insensitive" } },
          { variantes: { some: { defaultCode: { contains: t, mode: "insensitive" } } } },
          { variantes: { some: { referenceFabricant: { contains: t, mode: "insensitive" } } } },
        ],
      },
      include: INCLURE_MODELE,
      orderBy: [{ marque: "asc" }, { nom: "asc" }],
      take: 30,
    });
    const dispo = await etatsDesModeles(modeles);
    return modeles.map((m) => resumer(m, dispo)).filter(nonNul);
  },

  async listerReferences(): Promise<ReferenceArticle[]> {
    const modeles = await db().modeleArticle.findMany({
      include: INCLURE_MODELE,
      orderBy: [{ categorie: { ordre: "asc" } }, { marque: "asc" }, { nom: "asc" }],
    });
    const dispo = await etatsDesModeles(modeles);
    return modeles.flatMap((m) =>
      m.variantes.map((v) => ({
        defaultCode: v.defaultCode,
        referenceFabricant: v.referenceFabricant,
        referenceArticle: m.variantes[0]!.defaultCode,
        nom: m.nom,
        marque: m.marque,
        type: m.type,
        categorie: m.categorie.code,
        configuration: v.configuration,
        prixHt: v.prixHtCentimes,
        disponibilite: dispo.get(v.defaultCode)!,
        estFictif: v.estFictif,
      })),
    );
  },
};

type RegleListePrix = {
  defaultCode: string;
  prixHtCentimes?: number;
  remisePourcent?: number;
  /** Prix dégressif : s'applique à partir de cette quantité (min_quantity d'Odoo). */
  quantiteMin?: number;
  /** Mensualité de financement forcée pour cette durée. */
  dureeMois?: number;
  mensualiteCentimes?: number;
};

/** Règles des listes de prix sans partenaire (liste publique). */
async function reglesPubliques(): Promise<RegleListePrix[]> {
  const listes = await db().listePrix.findMany({ where: { partenaireId: null } });
  return listes.flatMap((l) => l.regles as RegleListePrix[]);
}

function paliersDe(regles: RegleListePrix[], defaultCode: string): Palier[] {
  return regles
    .filter((r) => r.defaultCode === defaultCode && r.quantiteMin && r.prixHtCentimes !== undefined)
    .map((r) => ({ quantiteMin: r.quantiteMin!, prixHt: r.prixHtCentimes! }))
    .sort((a, b) => a.quantiteMin - b.quantiteMin);
}

function mensualitesDe(regles: RegleListePrix[], defaultCode: string): MensualiteForcee[] {
  return regles
    .filter((r) => r.defaultCode === defaultCode && r.dureeMois && r.mensualiteCentimes !== undefined)
    .map((r) => ({ dureeMois: r.dureeMois!, montantHt: r.mensualiteCentimes! }))
    .sort((a, b) => a.dureeMois - b.dureeMois);
}

/** Prix applicables à un client : liste de prix, remises, mensualités forcées (F03). */
export async function prixClient(
  partenaireRef: string,
  references: string[],
  tx: Pick<ReturnType<typeof db>, "partenaire" | "variante"> = db(),
): Promise<PrixClient[]> {
  const partenaire = await tx.partenaire.findUnique({
    where: { ref: partenaireRef },
    include: { listesPrix: true },
  });
  if (!partenaire) throw new NotFound("Partenaire", partenaireRef);
  const regles = partenaire.listesPrix.flatMap((l) => l.regles as RegleListePrix[]);
  const variantes = await tx.variante.findMany({ where: { defaultCode: { in: references } } });
  const manquante = references.find((r) => !variantes.some((v) => v.defaultCode === r));
  if (manquante) throw new NotFound("Article", manquante);
  return references.map((ref) => {
    const v = variantes.find((x) => x.defaultCode === ref)!;
    // Règle de prix du client (hors paliers et mensualités, traités à part).
    const regle = regles.find((r) => r.defaultCode === ref && !r.quantiteMin && !r.dureeMois);
    let prix = v.prixHtCentimes;
    if (regle?.prixHtCentimes !== undefined) prix = regle.prixHtCentimes;
    else if (regle?.remisePourcent) prix = Math.round(prix * (1 - regle.remisePourcent / 100));
    return {
      defaultCode: ref,
      prixCatalogueHt: v.prixHtCentimes,
      prixHt: prix,
      remisePourcent: regle?.remisePourcent ?? null,
      mensualitesForcees: mensualitesDe(regles, ref),
    };
  });
}
