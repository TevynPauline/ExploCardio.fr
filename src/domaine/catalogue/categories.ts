import type { Categorie, EtatDisponibilite } from "@/connecteurs/odoo/interfaces";
import { lireCatalogue, lireCategories, type EntreeCatalogue } from "./lecture";
import { photosDe, type PhotoProduit } from "./publication";

// Page catégorie (F03, US1, FR-005 à FR-007) : cartes des articles publiés, filtres marque,
// catégorie d'Odoo (F27, à la place des « types » propres au site) et disponibilité,
// combinables, et tri.

export type EtatFiltre = EtatDisponibilite["etat"];
const ETATS: EtatFiltre[] = ["disponible", "delai", "indisponible"];

export type FiltresCategorie = { marque?: string; categorie?: string; dispo?: EtatFiltre; tri?: "ordre" | "prix" };

/** Sous-catégorie proposée en filtre, avec son niveau (1 ou 2) pour l'indentation. */
export type FiltreCategorie = { code: string; libelle: string; niveau: number };

export type Carte = {
  defaultCode: string;
  chemin: string;
  nom: string;
  marque: string;
  photo: PhotoProduit | null;
  /** Prix d'achat HT « à partir de », ou mensualité si l'article n'est proposé qu'en mise à disposition. */
  prixHt: number;
  tauxTva: number;
  aPartirDe: boolean;
  mensuel: boolean;
  /** « Disponible en location » (FR-006). */
  location: boolean;
  disponibilite: EtatDisponibilite;
  /** Catégorie la plus précise d'Odoo (F27). */
  categorieDetail: string;
  ordre: number;
};

export type ResultatCategorie = {
  cartes: Carte[];
  total: number;
  filtresDisponibles: { marques: string[]; categories: FiltreCategorie[]; dispos: EtatFiltre[] };
  /** Sous-catégorie filtrée, pour le titre et le fil d'Ariane. */
  categorieChoisie: Categorie | null;
  indisponible: boolean;
};

/** La meilleure disponibilité : disponible, puis le délai le plus court, puis indisponible. */
function meilleure(etats: EtatDisponibilite[]): EtatDisponibilite {
  const rang = (e: EtatDisponibilite) => (e.etat === "disponible" ? 0 : e.etat === "delai" ? 1 + e.delaiJours / 10_000 : 2);
  return [...etats].sort((a, b) => rang(a) - rang(b))[0] ?? { etat: "indisponible" };
}

export function carteDe(e: EntreeCatalogue): Carte {
  const { article, contenu } = e;
  const achat = article.formules.includes("achat");
  const mad = article.formules.includes("mise_a_disposition");
  const avecOffre = article.variantes.some((v) => v.offreMiseADisposition);
  const location = mad && avecOffre;
  // Proposé seulement au mois : mise à disposition (prix des mois suivants) ou abonnement
  // (logiciel Cloud, au prix de l'article).
  const mensuel = !achat && mad;
  const montants =
    mensuel && avecOffre
      ? article.variantes.flatMap((v) => (v.offreMiseADisposition ? [v.offreMiseADisposition.moisSuivantsHt] : []))
      : article.variantes.map((v) => v.prixHt);
  const etats = article.variantes.flatMap((v) => {
    const d = e.disponibilites.get(v.defaultCode);
    if (!d) return [];
    if (mensuel && avecOffre) return d.miseADisposition ? [d.miseADisposition] : [];
    return [d.achat];
  });
  return {
    defaultCode: article.reference,
    chemin: e.chemin,
    nom: article.nom,
    marque: article.marque,
    photo: photosDe(contenu)[0] ?? null,
    prixHt: Math.min(...montants),
    tauxTva: article.variantes[0]?.tauxTva ?? 20,
    aPartirDe: (mensuel && avecOffre) || new Set(montants).size > 1,
    mensuel,
    location,
    disponibilite: meilleure(etats),
    categorieDetail: article.categorieDetail,
    ordre: contenu.ordre,
  };
}

/** Cartes d'une catégorie, filtrées et triées (logique pure, testée). */
/** La carte appartient à cette catégorie ou à l'un de ses sous-niveaux. */
export const dansLaCategorie = (categorieDetail: string, code: string) => categorieDetail === code || categorieDetail.startsWith(`${code}/`);

export function cartesDeCategorie(
  entrees: EntreeCatalogue[],
  categorie: string,
  filtres: FiltresCategorie,
  arbre: Categorie[] = [],
): Omit<ResultatCategorie, "indisponible"> {
  const deLaCategorie = entrees.filter((e) => e.article.categorie === categorie);
  const toutes = deLaCategorie.map(carteDe);
  const dispo = filtres.dispo && ETATS.includes(filtres.dispo) ? filtres.dispo : undefined;
  const cartes = toutes
    .filter((c) => !filtres.marque || c.marque === filtres.marque)
    .filter((c) => !filtres.categorie || dansLaCategorie(c.categorieDetail, filtres.categorie))
    .filter((c) => !dispo || c.disponibilite.etat === dispo)
    .sort((a, b) => (filtres.tri === "prix" ? a.prixHt - b.prixHt : 0) || a.ordre - b.ordre || a.nom.localeCompare(b.nom, "fr"));
  // Sous-catégories de la rubrique qui contiennent au moins un article publié, dans l'ordre de l'arbre.
  const categories = arbre
    .filter((c) => c.niveau > 0 && c.rubrique === categorie && toutes.some((x) => dansLaCategorie(x.categorieDetail, c.code)))
    .map((c) => ({ code: c.code, libelle: c.nom, niveau: c.niveau }));
  const ordonnees: FiltreCategorie[] = [];
  for (const c of categories.filter((x) => x.niveau === 1)) {
    ordonnees.push(c, ...categories.filter((x) => x.niveau === 2 && x.code.startsWith(`${c.code}/`)));
  }
  return {
    cartes,
    total: cartes.length,
    filtresDisponibles: {
      marques: [...new Set(toutes.map((c) => c.marque))].sort((a, b) => a.localeCompare(b, "fr")),
      categories: ordonnees,
      dispos: ETATS.filter((x) => toutes.some((c) => c.disponibilite.etat === x)),
    },
    categorieChoisie: (filtres.categorie && arbre.find((c) => c.code === filtres.categorie && c.rubrique === categorie && c.niveau > 0)) || null,
  };
}

/** Lit et normalise les filtres de l'adresse (?marque=…&categorie=…&dispo=…&tri=prix) ; l'ancien ?type= est ignoré. */
export function filtresDepuisAdresse(p: Record<string, string | string[] | undefined>): FiltresCategorie {
  const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  const dispo = un(p.dispo);
  return {
    marque: un(p.marque),
    categorie: un(p.categorie),
    dispo: ETATS.includes(dispo as EtatFiltre) ? (dispo as EtatFiltre) : undefined,
    tri: un(p.tri) === "prix" ? "prix" : "ordre",
  };
}

export async function listerCategorie(categorie: string, filtres: FiltresCategorie): Promise<ResultatCategorie> {
  const [catalogue, arbre] = await Promise.all([lireCatalogue(), lireCategories()]);
  return { ...cartesDeCategorie(catalogue.entrees, categorie, filtres, arbre), indisponible: catalogue.indisponible };
}
