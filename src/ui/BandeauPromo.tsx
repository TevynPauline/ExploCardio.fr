import { lireBandeau } from "@/domaine/contenus";
import { RotationBandeau } from "./RotationBandeau";

/**
 * Bandeau promotionnel (FR-002) : affiché seulement en période de promotion, impossible à
 * masquer ; aucun message actif → rien n'est rendu, sans espace vide.
 */
export async function BandeauPromo() {
  const messages = await lireBandeau();
  if (messages.length === 0) return null;
  return <RotationBandeau messages={messages} />;
}
