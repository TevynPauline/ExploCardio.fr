import { lireNavigation } from "@/domaine/navigation";
import { BarreNavigation } from "./BarreNavigation";

/** En-tête commun (FR-001, FR-003, FR-006) : données préparées côté serveur. */
export async function EnTete() {
  const entrees = await lireNavigation();
  // Le panier arrive avec F04 : en attendant, il est toujours vide (pas de pastille).
  return <BarreNavigation entrees={entrees} articlesPanier={0} />;
}
