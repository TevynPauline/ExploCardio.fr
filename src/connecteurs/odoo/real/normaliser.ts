/** Libellé comparable : sans accents, minuscules, ponctuation réduite à des espaces. */
export function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Euros d'Odoo (nombre ou texte « 35,50 ») → centimes ; null si vide ou invalide. */
export function versCentimes(valeur: unknown): number | null {
  if (typeof valeur === "number" && Number.isFinite(valeur)) return Math.round(valeur * 100);
  if (typeof valeur === "string" && valeur.trim()) {
    // Saisie libre tolérée : « 125 € », « 1 250,50 », « 35.5 EUR ».
    const nettoye = valeur.replace(/\s/g, "").replace(/€|eur(os)?/gi, "").replace(",", ".");
    if (!nettoye) return null;
    const n = Number(nettoye);
    return Number.isFinite(n) ? Math.round(n * 100) : null;
  }
  return null;
}
