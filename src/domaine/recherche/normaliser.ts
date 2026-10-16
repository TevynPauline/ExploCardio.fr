// Normalisation de la recherche (FR-012, R4).

/** Minuscules, sans accents ; tirets et ponctuation légère deviennent des espaces. */
export function normaliserTexte(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[-_./\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Références : seuls les lettres et les chiffres comptent (« 98-0239-22 » = « 98023922 »). */
export function normaliserReference(reference: string): string {
  return normaliserTexte(reference).replace(/[^a-z0-9]/g, "");
}
