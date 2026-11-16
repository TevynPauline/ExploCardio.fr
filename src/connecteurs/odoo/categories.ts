// Codes des catégories du catalogue (F27, contracts/odoo-catalogue.md), communs aux deux modes du
// connecteur Odoo : la rubrique garde son code ; une sous-catégorie reçoit
// `<rubrique>/<segments slugifiés>`, sur deux niveaux au plus sous la rubrique.

export const NIVEAU_MAX = 2;

/** Segment d'adresse : sans accents, minuscules, mots séparés par des tirets. */
export function slugSegment(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Code d'une catégorie d'après sa rubrique et ses noms sous la rubrique (tronqués au niveau 2). */
export function codeCategorie(rubrique: string, noms: readonly string[]): string {
  const segments = noms.slice(0, NIVEAU_MAX).map(slugSegment).filter(Boolean);
  return segments.length ? `${rubrique}/${segments.join("/")}` : rubrique;
}

/**
 * Ordre d'affichage sous un même parent (Odoo n'ordonne pas ses catégories) : les appareils
 * d'abord, puis les accessoires, puis les consommables ; alphabétique à rang égal.
 */
const rang = (nom: string) => (/^accessoire/i.test(nom) ? 1 : /^consommable/i.test(nom) ? 2 : 0);
export const parNom = (a: { nom: string }, b: { nom: string }) => rang(a.nom) - rang(b.nom) || a.nom.localeCompare(b.nom, "fr");
