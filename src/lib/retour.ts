/** Chemin de retour interne sûr (jamais une autre origine) ; `null` sinon. */
export function cheminDeRetour(brut: string | null | undefined): string | null {
  const r = (brut ?? "").trim();
  return r.startsWith("/") && !r.startsWith("//") && !r.includes("\\") ? r : null;
}
