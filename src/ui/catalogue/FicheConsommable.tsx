import type { VarianteFiche } from "@/domaine/catalogue/fiches";
import { ChoixConditionnement } from "./ChoixConditionnement";

/** Partie achat de la fiche consommable (F03, US3) : conditionnements, dégressifs, ajout rapide. */
export function FicheConsommable({ variantes, configInitiale }: { variantes: VarianteFiche[]; configInitiale: string | null }) {
  return <ChoixConditionnement variantes={variantes} configInitiale={configInitiale} />;
}
