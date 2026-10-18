import { lireNavigation } from "@/domaine/navigation";
import { BarreNavigation } from "./BarreNavigation";

/** En-tête commun (FR-001, FR-003, FR-006) : données préparées côté serveur. */
export async function EnTete() {
  const entrees = await lireNavigation();
  // Pastille du panier : lue par la barre après l'affichage (F04).
  return <BarreNavigation entrees={entrees} articlesPanier={0} />;
}
