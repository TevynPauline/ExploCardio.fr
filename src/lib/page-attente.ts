// Page d'attente (F17) : adresses (ex. www.explocardio.fr) qui n'affichent que la page
// d'attente, déclarées dans DOMAINES_PAGE_ATTENTE (liste séparée par des virgules, sans port).

export const CHEMIN_PAGE_ATTENTE = "/bientot";

export function domainesPageAttente(env: Record<string, string | undefined> = process.env): string[] {
  return (env.DOMAINES_PAGE_ATTENTE ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export function estHotePageAttente(hote: string | null, env: Record<string, string | undefined> = process.env): boolean {
  if (!hote) return false;
  const nom = hote.trim().toLowerCase().replace(/:\d+$/, "");
  return domainesPageAttente(env).includes(nom);
}

/** Fichiers dont la page d'attente a besoin (polices, logos, robots.txt). */
const RESSOURCES = [/^\/fonts\//, /^\/marque\//, /^\/robots\.txt$/];

export function estRessourcePageAttente(chemin: string): boolean {
  return RESSOURCES.some((r) => r.test(chemin));
}
