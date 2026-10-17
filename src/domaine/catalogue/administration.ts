import { registre } from "@/connecteurs/registre";
import type { Article } from "@/connecteurs/odoo/interfaces";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { invaliderDepuisAction } from "@/lib/cache";
import { dbSite } from "@/lib/db/site";
import type { ContenuProduit, SousCategorie } from "@generated/site/client";
import { invaliderIndexRecherche } from "../recherche/index";
import { slugArticle, versSlug } from "../slugs";
import { manquantsPublication, photosDe, textesDe, type DocumentProduit, type PhotoProduit, type TextesProduit } from "./publication";

// Back-office du catalogue (F03, US6, FR-036 à FR-040) : seuls les contenus de présentation se
// gèrent ici ; produits, configurations, prix, stocks, références et formules restent dans
// Odoo (principe III). Chaque modification est journalisée avec son auteur (FR-040).

export type Auteur = { id: string; libelle: string };

export class ContenuInvalide extends Error {
  constructor(readonly erreurs: Record<string, string>) {
    super("Contenu invalide");
  }
}

export type LigneAdmin = {
  reference: string;
  article: Article | null;
  contenu: (ContenuProduit & { sousCategorie: SousCategorie | null }) | null;
  etat: "a_rediger" | "preparation" | "publie" | "retire" | "orphelin";
  manquants: string[];
};

async function journal(auteur: Auteur, action: string, objet: string, detail: unknown) {
  await dbSite().journalAction.create({
    data: { auteurId: auteur.id, auteur: auteur.libelle, action, objet, detail: JSON.parse(JSON.stringify(detail ?? {})) },
  });
}

function invaliderCatalogue() {
  invaliderDepuisAction("catalogue");
  invaliderIndexRecherche();
}

/** Articles d'Odoo, lus sans cache (l'équipe voit l'état réel), ou `null` si Odoo est injoignable. */
async function articlesOdoo(): Promise<Article[] | null> {
  try {
    const odoo = registre.odoo().catalogue;
    const references = await odoo.listerReferences();
    return Promise.all([...new Set(references.map((r) => r.referenceArticle))].map((r) => odoo.lireArticle(r)));
  } catch (e) {
    if (estErreurConnecteur(e)) return null;
    throw e;
  }
}

/** Liste du back-office : chaque article d'Odoo et son contenu ; marque les orphelins. */
export async function listerPourAdmin(): Promise<{ lignes: LigneAdmin[]; odooIndisponible: boolean }> {
  const [articles, contenus] = await Promise.all([
    articlesOdoo(),
    dbSite().contenuProduit.findMany({ include: { sousCategorie: true } }),
  ]);
  if (!articles) {
    return {
      odooIndisponible: true,
      lignes: contenus.map((c) => ({ reference: c.defaultCode, article: null, contenu: c, etat: c.orphelin ? "orphelin" : c.etat, manquants: [] })),
    };
  }
  const parRef = new Map(articles.map((a) => [a.reference, a]));
  // Article disparu d'Odoo : contenu orphelin, invisible du public ; revenu : de nouveau rattaché.
  const orphelins = contenus.filter((c) => !parRef.has(c.defaultCode) && !c.orphelin).map((c) => c.id);
  const rattaches = contenus.filter((c) => parRef.has(c.defaultCode) && c.orphelin).map((c) => c.id);
  if (orphelins.length) await dbSite().contenuProduit.updateMany({ where: { id: { in: orphelins } }, data: { orphelin: true } });
  if (rattaches.length) await dbSite().contenuProduit.updateMany({ where: { id: { in: rattaches } }, data: { orphelin: false } });
  if (orphelins.length || rattaches.length) invaliderCatalogue();

  const lignes: LigneAdmin[] = articles.map((a) => {
    const c = contenus.find((x) => x.defaultCode === a.reference) ?? null;
    return {
      reference: a.reference,
      article: a,
      contenu: c,
      etat: !c ? "a_rediger" : c.etat,
      manquants: c ? manquantsPublication(c, a) : ["La description courte.", "L'adresse de la fiche."],
    };
  });
  for (const c of contenus.filter((x) => !parRef.has(x.defaultCode))) {
    lignes.push({ reference: c.defaultCode, article: null, contenu: c, etat: "orphelin", manquants: manquantsPublication(c, null) });
  }
  return { lignes, odooIndisponible: false };
}

export async function lireArticleAdmin(reference: string): Promise<{ article: Article | null; contenu: LigneAdmin["contenu"]; odooIndisponible: boolean }> {
  const contenu = await dbSite().contenuProduit.findUnique({ where: { defaultCode: reference }, include: { sousCategorie: true } });
  try {
    return { article: await registre.odoo().catalogue.lireArticle(reference), contenu, odooIndisponible: false };
  } catch (e) {
    if (!estErreurConnecteur(e)) throw e;
    return { article: null, contenu, odooIndisponible: (e as { code?: string }).code !== "NOT_FOUND" };
  }
}

export type SaisieContenu = {
  slug: string;
  sousCategorieId: string;
  ordre: string;
  descriptionCourte: string;
  caracteristiques: string;
  contenuCoffret: string;
  contenuPackMad: string;
  logicielAssocie: string;
  garantie: string;
  compatibilites: string;
  produitsAssocies: string;
  /** Textes de remplacement des photos existantes, dans l'ordre. */
  textesPhotos: string[];
  photosRetirees: string[];
  documentsRetires: string[];
  nouvellesPhotos: PhotoProduit[];
  nouveauxDocuments: DocumentProduit[];
};

/** « Libellé : valeur », une par ligne → liste de caractéristiques. */
export function lireCaracteristiques(texte: string): { libelle: string; valeur: string }[] {
  return texte
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf(":");
      return i > 0 ? { libelle: l.slice(0, i).trim(), valeur: l.slice(i + 1).trim() } : { libelle: l, valeur: "" };
    });
}

export function ecrireCaracteristiques(liste: TextesProduit["caracteristiques"]): string {
  return (liste ?? []).map((c) => (c.valeur ? `${c.libelle} : ${c.valeur}` : c.libelle)).join("\n");
}

function references(texte: string): string[] {
  return [...new Set(texte.split(/[\s,;]+/).map((r) => r.trim().toUpperCase()).filter(Boolean))];
}

/** Enregistre les contenus d'un article (sans publier) ; erreurs par champ, saisie conservée. */
export async function enregistrerContenu(reference: string, s: SaisieContenu, auteur: Auteur): Promise<void> {
  const { article } = await lireArticleAdmin(reference);
  const e: Record<string, string> = {};
  const slug = versSlug(s.slug || (article ? slugArticle(article.marque, article.nom) : ""));
  if (!slug) e.slug = "Indiquez l'adresse de la fiche (lettres, chiffres et tirets).";
  const existant = await dbSite().contenuProduit.findUnique({ where: { defaultCode: reference } });
  if (slug) {
    const pris = await dbSite().contenuProduit.findFirst({
      where: { defaultCode: { not: reference }, OR: [{ slug }, { anciensSlugs: { has: slug } }] },
    });
    if (pris) e.slug = "Cette adresse est déjà utilisée par un autre produit.";
  }
  const ordre = s.ordre.trim() === "" ? 0 : Number(s.ordre);
  if (!Number.isInteger(ordre) || ordre < 0 || ordre > 9999) e.ordre = "Indiquez un nombre entier positif.";
  if (s.descriptionCourte.length > 400) e.descriptionCourte = "400 caractères au plus.";

  const compatibilites = references(s.compatibilites);
  const associes = references(s.produitsAssocies);
  const connues = new Set((await registre.odoo().catalogue.listerReferences().catch(() => [])).flatMap((r) => [r.defaultCode, r.referenceArticle]));
  if (connues.size) {
    const inconnues = compatibilites.filter((r) => !connues.has(r));
    if (inconnues.length) e.compatibilites = `Références inconnues dans Odoo : ${inconnues.join(", ")}.`;
    const inconnuesA = associes.filter((r) => !connues.has(r));
    if (inconnuesA.length) e.produitsAssocies = `Références inconnues dans Odoo : ${inconnuesA.join(", ")}.`;
  }
  if (s.sousCategorieId) {
    const sc = await dbSite().sousCategorie.findUnique({ where: { id: s.sousCategorieId } });
    if (!sc || (article && sc.categorie !== article.categorie)) e.sousCategorieId = "Choisissez un type de cette catégorie.";
  }

  const photos = existant ? photosDe(existant) : [];
  const gardees = photos
    .map((p, i) => ({ ...p, texteRemplacement: (s.textesPhotos[i] ?? p.texteRemplacement).trim() }))
    .filter((p) => !s.photosRetirees.includes(p.chemin));
  const toutesPhotos = [...gardees, ...s.nouvellesPhotos];
  if (toutesPhotos.some((p) => !p.texteRemplacement)) e.photos = "Chaque photo doit avoir un texte de remplacement (description pour les personnes qui ne la voient pas).";
  if (Object.keys(e).length) throw new ContenuInvalide(e);

  const documents = (existant && Array.isArray(existant.documents) ? (existant.documents as DocumentProduit[]) : [])
    .filter((d) => !s.documentsRetires.includes(d.chemin))
    .concat(s.nouveauxDocuments);
  const textes: TextesProduit = {
    ...textesDe(existant ?? { textes: {} }),
    descriptionCourte: s.descriptionCourte.trim(),
    caracteristiques: lireCaracteristiques(s.caracteristiques),
    contenuCoffret: s.contenuCoffret.trim(),
    contenuPackMad: s.contenuPackMad.trim(),
    logicielAssocie: s.logicielAssocie.trim(),
    garantie: s.garantie.trim(),
  };
  const anciensSlugs = existant && existant.slug !== slug ? [...new Set([...existant.anciensSlugs, existant.slug])].filter((x) => x !== slug) : (existant?.anciensSlugs ?? []);
  const donnees = {
    slug,
    anciensSlugs,
    sousCategorieId: s.sousCategorieId || null,
    ordre,
    textes,
    photos: toutesPhotos,
    documents,
    compatibilites,
    produitsAssocies: associes,
  };
  await dbSite().contenuProduit.upsert({ where: { defaultCode: reference }, create: { defaultCode: reference, ...donnees }, update: donnees });
  await journal(auteur, "catalogue.contenu", reference, { slug, avant: existant?.slug ?? null });
  invaliderCatalogue();
}

/** Publication contrôlée (FR-037, US6-5) : refusée avec la liste de ce qui manque. */
export async function publier(reference: string, auteur: Auteur): Promise<{ ok: true } | { ok: false; manquants: string[] }> {
  const { article, contenu } = await lireArticleAdmin(reference);
  if (!contenu) return { ok: false, manquants: ["La description courte.", "L'adresse de la fiche."] };
  const manquants = manquantsPublication(contenu, article);
  if (manquants.length) return { ok: false, manquants };
  await dbSite().contenuProduit.update({ where: { defaultCode: reference }, data: { etat: "publie", publieLe: new Date(), orphelin: false } });
  await journal(auteur, "catalogue.publication", reference, {});
  invaliderCatalogue();
  return { ok: true };
}

/**
 * Retrait du public : « preparation » (invisible, l'adresse n'existe plus) ou « retire » (l'adresse
 * indique que le produit n'est plus proposé et mène à sa catégorie).
 */
export async function retirer(reference: string, etat: "preparation" | "retire", auteur: Auteur): Promise<void> {
  await dbSite().contenuProduit.update({ where: { defaultCode: reference }, data: { etat } });
  await journal(auteur, etat === "retire" ? "catalogue.retrait" : "catalogue.preparation", reference, {});
  invaliderCatalogue();
}

// --- Sous-catégories (filtre « type ») -----------------------------------------------------------

export async function creerSousCategorie(categorie: string, libelle: string, auteur: Auteur) {
  const propre = libelle.trim();
  if (!propre) throw new ContenuInvalide({ libelle: "Indiquez un libellé." });
  const slug = versSlug(propre);
  const doublon = await dbSite().sousCategorie.findFirst({ where: { categorie, OR: [{ libelle: propre }, { slug }] } });
  if (doublon) throw new ContenuInvalide({ libelle: "Ce type existe déjà dans cette catégorie." });
  const ordre = (await dbSite().sousCategorie.count({ where: { categorie } })) + 1;
  await dbSite().sousCategorie.create({ data: { categorie, libelle: propre, slug, ordre } });
  await journal(auteur, "catalogue.sous_categorie", categorie, { libelle: propre });
  invaliderDepuisAction("catalogue");
}

export async function deplacerSousCategorie(id: string, sens: -1 | 1, auteur: Auteur) {
  const sc = await dbSite().sousCategorie.findUniqueOrThrow({ where: { id } });
  const liste = await dbSite().sousCategorie.findMany({ where: { categorie: sc.categorie }, orderBy: { ordre: "asc" } });
  const i = liste.findIndex((x) => x.id === id);
  const voisin = liste[i + sens];
  if (!voisin) return;
  await dbSite().$transaction([
    dbSite().sousCategorie.update({ where: { id: sc.id }, data: { ordre: voisin.ordre } }),
    dbSite().sousCategorie.update({ where: { id: voisin.id }, data: { ordre: sc.ordre } }),
  ]);
  await journal(auteur, "catalogue.sous_categorie", sc.categorie, { deplace: sc.libelle });
  invaliderDepuisAction("catalogue");
}

/** Suppression refusée si un produit utilise ce type. */
export async function supprimerSousCategorie(id: string, auteur: Auteur) {
  const utilises = await dbSite().contenuProduit.count({ where: { sousCategorieId: id } });
  if (utilises) throw new ContenuInvalide({ libelle: `Ce type est utilisé par ${utilises} produit${utilises > 1 ? "s" : ""} : changez-leur de type d'abord.` });
  const sc = await dbSite().sousCategorie.delete({ where: { id } });
  await journal(auteur, "catalogue.sous_categorie", sc.categorie, { supprime: sc.libelle });
  invaliderDepuisAction("catalogue");
}
