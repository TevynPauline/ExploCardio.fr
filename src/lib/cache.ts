import { revalidateTag, updateTag } from "next/cache";

// Étiquettes de cache des données lues par les connecteurs (R10). En mode réel, le catalogue
// est mis en cache 5 minutes ; en démonstration, chaque modification de l'écran de
// démonstration invalide aussitôt les pages concernées (FR-026, SC-009 : < 5 s).

export const ETIQUETTES = {
  catalogue: "catalogue",
  prix: "prix",
  stock: "stock",
  fidelite: "fidelite",
  /** Contenus éditoriaux du site (bandeau, tuiles, actualités, paramètres, menus, marques). */
  contenus: "contenus",
} as const;

export type Etiquette = (typeof ETIQUETTES)[keyof typeof ETIQUETTES];

/** À appeler depuis une action serveur : la page suivante relit les nouvelles valeurs. */
export function invaliderDepuisAction(...etiquettes: Etiquette[]) {
  for (const e of etiquettes) updateTag(e);
}

/** À appeler hors d'une action serveur (tâche de fond, commande). */
export function invalider(...etiquettes: Etiquette[]) {
  for (const e of etiquettes) revalidateTag(e, "max");
}
