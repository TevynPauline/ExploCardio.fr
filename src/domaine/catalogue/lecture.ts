import { unstable_cache } from "next/cache";
import { registre } from "@/connecteurs/registre";
import type { Article, Disponibilite } from "@/connecteurs/odoo/interfaces";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { ETIQUETTES } from "@/lib/cache";
import { dbSite } from "@/lib/db/site";
import type { ContenuProduit, SousCategorie } from "@generated/site/client";
import { cheminDeCategorie } from "../familles";
import { estVisible } from "./publication";

// Lecture du catalogue (F03, R1, R5) : articles d'Odoo lus par le connecteur et mis en cache
// (étiquettes catalogue et prix, 5 minutes), disponibilités lues à part (étiquette stock,
// 1 minute) — une seule source pour les cartes, les fiches, les listes et la recherche —,
// contenus de présentation lus dans la base du site. Les montants propres à un client ne
// passent jamais par ce cache partagé (FR-046).

const lireArticlesOdoo = unstable_cache(
  async (): Promise<Article[]> => {
    const odoo = registre.odoo().catalogue;
    const references = await odoo.listerReferences();
    const articles = [...new Set(references.map((r) => r.referenceArticle))];
    return Promise.all(articles.map((ref) => odoo.lireArticle(ref)));
  },
  ["f03-articles"],
  { tags: [ETIQUETTES.catalogue, ETIQUETTES.prix], revalidate: 300 },
);

const lireDisponibilitesOdoo = unstable_cache(
  async (): Promise<Disponibilite[]> => {
    const references = await registre.odoo().catalogue.listerReferences();
    return registre.odoo().stock.lireDisponibilite(references.map((r) => r.defaultCode));
  },
  ["f03-disponibilites"],
  { tags: [ETIQUETTES.stock], revalidate: 60 },
);

/**
 * Noms et marques des articles, gardés un jour à part : une fiche reste présentable (titre)
 * pendant une panne d'Odoo, sans affirmer ni prix ni disponibilité (US5-5).
 */
const lireNomsOdoo = unstable_cache(
  async (): Promise<Record<string, { nom: string; marque: string; categorie: string }>> => {
    const references = await registre.odoo().catalogue.listerReferences();
    return Object.fromEntries(references.map((r) => [r.referenceArticle, { nom: r.nom, marque: r.marque, categorie: r.categorie }]));
  },
  ["f03-noms"],
  { tags: ["catalogue-noms"], revalidate: 86_400 },
);

export async function lireNoms(): Promise<Record<string, { nom: string; marque: string; categorie: string }>> {
  try {
    return await lireNomsOdoo();
  } catch (e) {
    if (estErreurConnecteur(e)) return {};
    throw e;
  }
}

export type ContenuComplet = ContenuProduit & { sousCategorie: SousCategorie | null };

export type EntreeCatalogue = {
  contenu: ContenuComplet;
  article: Article;
  /** Adresse de la fiche : /<catégorie>/<slug>. */
  chemin: string;
  /** Disponibilité de chaque variante (achat et mise à disposition). */
  disponibilites: Map<string, Disponibilite>;
};

export type Catalogue = {
  /** Articles visibles du public, dans l'ordre de l'administrateur. */
  entrees: EntreeCatalogue[];
  /** Le connecteur Odoo est injoignable : prix et disponibilités ne sont pas affirmés. */
  indisponible: boolean;
};

export function cheminFicheDe(categorie: string, slug: string): string {
  return `${cheminDeCategorie(categorie)}/${slug}`;
}

export async function lireContenus(): Promise<ContenuComplet[]> {
  return dbSite().contenuProduit.findMany({ include: { sousCategorie: true }, orderBy: [{ ordre: "asc" }, { slug: "asc" }] });
}

/** Articles d'Odoo et disponibilités ; `null` si le connecteur est injoignable. */
export async function lireDonneesOdoo(): Promise<{ articles: Article[]; disponibilites: Map<string, Disponibilite> } | null> {
  try {
    const [articles, dispos] = await Promise.all([lireArticlesOdoo(), lireDisponibilitesOdoo()]);
    return { articles, disponibilites: new Map(dispos.map((d) => [d.defaultCode, d])) };
  } catch (e) {
    if (estErreurConnecteur(e)) return null;
    throw e;
  }
}

/** Catalogue public : articles publiés, présents dans Odoo et complets. */
export async function lireCatalogue(): Promise<Catalogue> {
  const [contenus, odoo] = await Promise.all([lireContenus(), lireDonneesOdoo()]);
  if (!odoo) return { entrees: [], indisponible: true };
  // Garde à jour la copie des noms (un jour), utilisée pendant une panne d'Odoo.
  await lireNoms();
  const parReference = new Map(odoo.articles.map((a) => [a.reference, a]));
  const entrees: EntreeCatalogue[] = [];
  for (const contenu of contenus) {
    const article = parReference.get(contenu.defaultCode) ?? null;
    if (!article || !estVisible(contenu, article)) continue;
    const disponibilites = new Map<string, Disponibilite>();
    for (const v of article.variantes) {
      const d = odoo.disponibilites.get(v.defaultCode);
      if (d) disponibilites.set(v.defaultCode, d);
    }
    entrees.push({ contenu, article, chemin: cheminFicheDe(article.categorie, contenu.slug), disponibilites });
  }
  return { entrees, indisponible: false };
}

/** Adresse de la fiche d'un article publié, à partir de la référence de n'importe laquelle de ses variantes. */
export async function cheminsDesFiches(): Promise<Map<string, string>> {
  const { entrees } = await lireCatalogue();
  const chemins = new Map<string, string>();
  for (const e of entrees) for (const v of e.article.variantes) chemins.set(v.defaultCode, e.chemin);
  return chemins;
}
