import { lireNavigation } from "@/domaine/navigation";
import { BarreNavigation } from "./BarreNavigation";

/** En-tête commun (FR-001, FR-003, FR-006 ; F27) : données préparées côté serveur. */
export async function EnTete() {
  const { entrees, liensSecondaires } = await lireNavigation();
  // Pastille du panier : lue par la barre après l'affichage (F04).
  return <BarreNavigation entrees={entrees} liensSecondaires={liensSecondaires} articlesPanier={0} />;
}
