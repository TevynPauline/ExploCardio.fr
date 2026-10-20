import { programmerPaniers } from "./panier";
import { programmerReapprovisionnement } from "./reapprovisionnement";

// Scénarios automatisés de F10 (FR-008) : relevés par les tâches planifiées, ou lancés à la
// demande depuis l'outil de démonstration. Chaque scénario ne programme qu'un envoi par échéance.

export type BilanScenarios = { reapprovisionnement: number; paniers: number; impayes: number };

/** Tâche quotidienne `emails-scenarios`. */
export async function traiterScenariosQuotidiens(maintenant = new Date()): Promise<Omit<BilanScenarios, "paniers">> {
  const { relances } = await programmerReapprovisionnement(maintenant);
  const { programmerImpayes } = await import("./impayes");
  const { relances: impayes } = await programmerImpayes(maintenant);
  return { reapprovisionnement: relances, impayes };
}

/** Tâche horaire `emails-paniers`. */
export async function traiterPaniers(maintenant = new Date()): Promise<{ paniers: number }> {
  return { paniers: (await programmerPaniers(maintenant)).rappels };
}

/** Outil de démonstration : tous les scénarios, tout de suite. */
export async function traiterTousLesScenarios(maintenant = new Date()): Promise<BilanScenarios> {
  return { ...(await traiterScenariosQuotidiens(maintenant)), ...(await traiterPaniers(maintenant)) };
}
