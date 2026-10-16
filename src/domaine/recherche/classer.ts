import { normaliserReference, normaliserTexte } from "./normaliser";
import type { ElementIndex, TypeGroupe } from "./index";

// Classement et groupement des résultats (FR-010, FR-011, R4, contracts/recherche.md).

export const ORDRE_GROUPES: { type: TypeGroupe; libelle: string }[] = [
  { type: "produits", libelle: "Produits" },
  { type: "consommables", libelle: "Consommables et accessoires" },
  { type: "services", libelle: "Services" },
  { type: "tutoriels", libelle: "Tutoriels" },
  { type: "faq", libelle: "Questions fréquentes" },
];

export type Suggestion = {
  code: string;
  titre: string;
  sousTitre: string;
  destination: string;
  prixHt: number | null;
  correspondanceExacte: boolean;
};

export type Groupe = { type: TypeGroupe; libelle: string; elements: Suggestion[] };
export type ResultatRecherche = { requete: string; groupes: Groupe[] };

export const MAX_PAR_GROUPE = 8;

function score(e: ElementIndex, texte: string, compacte: string, mots: string[]): number {
  if (compacte.length >= 2 && e.references.includes(compacte)) return 1000;
  let s = 0;
  if (compacte.length >= 3 && e.references.some((r) => r.startsWith(compacte))) s = Math.max(s, 400);
  if (mots.every((m) => e.texte.includes(m))) {
    s = Math.max(s, 100);
    if (e.titreNormalise.startsWith(texte)) s = Math.max(s, 300);
    else if (mots.every((m) => e.titreNormalise.includes(m))) s = Math.max(s, 200);
  }
  return s;
}

export function rechercherDans(
  elements: ElementIndex[],
  saisie: string,
  { maxParGroupe = MAX_PAR_GROUPE }: { maxParGroupe?: number } = {},
): ResultatRecherche {
  const texte = normaliserTexte(saisie);
  const compacte = normaliserReference(saisie);
  if (compacte.length < 2) return { requete: saisie, groupes: [] };
  const mots = texte.split(" ").filter(Boolean);

  const trouves = elements
    .map((e) => ({ e, s: score(e, texte, compacte, mots) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.e.titre.localeCompare(b.e.titre, "fr"));

  // Hors référence exacte, un seul résultat par article (pas une ligne par configuration).
  const vus = new Set<string>();
  const retenus = trouves.filter(({ e, s }) => {
    if (s >= 1000) return true;
    if (vus.has(e.article)) return false;
    vus.add(e.article);
    return true;
  });

  const groupes = ORDRE_GROUPES.map(({ type, libelle }) => ({
    type,
    libelle,
    elements: retenus
      .filter(({ e }) => e.groupe === type)
      .slice(0, maxParGroupe)
      .map(({ e, s }) => ({
        code: e.code,
        titre: e.titre,
        sousTitre: e.sousTitre,
        destination: e.destination,
        prixHt: e.prixHt,
        correspondanceExacte: s >= 1000,
      })),
  })).filter((g) => g.elements.length > 0);

  // Une correspondance exacte place son groupe en tête (FR-011).
  const exact = groupes.findIndex((g) => g.elements[0]?.correspondanceExacte);
  if (exact > 0) groupes.unshift(...groupes.splice(exact, 1));
  return { requete: saisie, groupes };
}
