import { lireBandeau } from "@/domaine/contenus";
import { messagesPromotions } from "@/domaine/fidelite/promotions";
import { RotationBandeau } from "./RotationBandeau";

/**
 * Bandeau promotionnel (FR-002) : affiché seulement en période de promotion, impossible à
 * masquer ; aucun message actif → rien n'est rendu, sans espace vide.
 */
export async function BandeauPromo() {
  // F06 (FR-032) : messages éditoriaux, puis promotions en cours annoncées automatiquement.
  const messages = [...(await lireBandeau()), ...(await messagesPromotions())];
  if (messages.length === 0) return null;
  return <RotationBandeau messages={messages} />;
}
