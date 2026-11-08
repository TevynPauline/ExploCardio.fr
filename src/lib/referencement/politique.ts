import { domainesPageAttente, estHotePageAttente } from "@/lib/page-attente";

// Règle d'indexation unique (F21, R1) : qui peut être indexé par les moteurs de recherche.
// - « attente » : adresse de la page d'attente (DOMAINES_PAGE_ATTENTE) ;
// - « ouvert »  : site de production (SITE_MODE=prod) ;
// - « ferme »   : tout le reste (démonstration, configuration absente ou inconnue).
// Sûre par défaut : en cas de doute, rien n'est indexable (constitution V).

export type PolitiqueIndexation = "attente" | "ouvert" | "ferme";

type Env = Record<string, string | undefined>;

export function politiqueIndexation(hote: string | null | undefined, env: Env = process.env): PolitiqueIndexation {
  if (hote && estHotePageAttente(hote, env)) return "attente";
  if (env.SITE_MODE === "prod") return "ouvert";
  return "ferme";
}

export function estIndexable(politique: PolitiqueIndexation): boolean {
  return politique !== "ferme";
}

/** Origine des adresses canoniques, sans barre finale. */
export function origineCanonique(politique: PolitiqueIndexation, env: Env = process.env): string {
  if (politique === "attente") {
    const domaine = domainesPageAttente(env)[0];
    if (domaine) return `https://${domaine}`;
  }
  return (env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}
