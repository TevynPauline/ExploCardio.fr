import type { VarianteFiche } from "@/domaine/catalogue/fiches";
import { ChoixConditionnement } from "./ChoixConditionnement";

/** Partie achat de la fiche consommable (F03, US3) : conditionnements, dégressifs, ajout rapide. */
export function FicheConsommable({ nom, variantes, configInitiale }: { nom: string; variantes: VarianteFiche[]; configInitiale: string | null }) {
  return <ChoixConditionnement nom={nom} variantes={variantes} configInitiale={configInitiale} />;
}
