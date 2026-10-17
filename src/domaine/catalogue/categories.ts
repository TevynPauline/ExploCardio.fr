import type { EtatDisponibilite } from "@/connecteurs/odoo/interfaces";
import { lireCatalogue, type EntreeCatalogue } from "./lecture";
import { photosDe, type PhotoProduit } from "./publication";

// Page catégorie (F03, US1, FR-005 à FR-007) : cartes des articles publiés, filtres marque,
// type (sous-catégorie) et disponibilité, combinables, et tri.

export type EtatFiltre = EtatDisponibilite["etat"];
const ETATS: EtatFiltre[] = ["disponible", "delai", "indisponible"];

export type FiltresCategorie = { marque?: string; type?: string; dispo?: EtatFiltre; tri?: "ordre" | "prix" };

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
  typeSlug: string | null;
  ordre: number;
};

export type ResultatCategorie = {
  cartes: Carte[];
  total: number;
  filtresDisponibles: { marques: string[]; types: { slug: string; libelle: string }[]; dispos: EtatFiltre[] };
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
    typeSlug: contenu.sousCategorie?.slug ?? null,
    ordre: contenu.ordre,
  };
}

/** Cartes d'une catégorie, filtrées et triées (logique pure, testée). */
export function cartesDeCategorie(entrees: EntreeCatalogue[], categorie: string, filtres: FiltresCategorie): Omit<ResultatCategorie, "indisponible"> {
  const deLaCategorie = entrees.filter((e) => e.article.categorie === categorie);
  const toutes = deLaCategorie.map(carteDe);
  const dispo = filtres.dispo && ETATS.includes(filtres.dispo) ? filtres.dispo : undefined;
  const cartes = toutes
    .filter((c) => !filtres.marque || c.marque === filtres.marque)
    .filter((c) => !filtres.type || c.typeSlug === filtres.type)
    .filter((c) => !dispo || c.disponibilite.etat === dispo)
    .sort((a, b) => (filtres.tri === "prix" ? a.prixHt - b.prixHt : 0) || a.ordre - b.ordre || a.nom.localeCompare(b.nom, "fr"));
  const types = new Map<string, { slug: string; libelle: string; ordre: number }>();
  for (const e of deLaCategorie) {
    const sc = e.contenu.sousCategorie;
    if (sc) types.set(sc.slug, { slug: sc.slug, libelle: sc.libelle, ordre: sc.ordre });
  }
  return {
    cartes,
    total: cartes.length,
    filtresDisponibles: {
      marques: [...new Set(toutes.map((c) => c.marque))].sort((a, b) => a.localeCompare(b, "fr")),
      types: [...types.values()]
        .sort((a, b) => a.ordre - b.ordre || a.libelle.localeCompare(b.libelle, "fr"))
        .map(({ slug, libelle }) => ({ slug, libelle })),
      dispos: ETATS.filter((x) => toutes.some((c) => c.disponibilite.etat === x)),
    },
  };
}

/** Lit et normalise les filtres de l'adresse (?marque=…&type=…&dispo=…&tri=prix). */
export function filtresDepuisAdresse(p: Record<string, string | string[] | undefined>): FiltresCategorie {
  const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  const dispo = un(p.dispo);
  return {
    marque: un(p.marque),
    type: un(p.type),
    dispo: ETATS.includes(dispo as EtatFiltre) ? (dispo as EtatFiltre) : undefined,
    tri: un(p.tri) === "prix" ? "prix" : "ordre",
  };
}

export async function listerCategorie(categorie: string, filtres: FiltresCategorie): Promise<ResultatCategorie> {
  const catalogue = await lireCatalogue();
  return { ...cartesDeCategorie(catalogue.entrees, categorie, filtres), indisponible: catalogue.indisponible };
}
