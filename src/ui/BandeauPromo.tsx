import { lireBandeau, lireOrganisation } from "@/domaine/contenus";
import { lireVignettes } from "@/domaine/vignettes";
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
  // F23 (FR-003, FR-004) : lien vers le carrousel de l'accueil, s'il est affiché et a une offre.
  const [organisation, vignettes] = await Promise.all([lireOrganisation(), lireVignettes()]);
  const lienOffres = organisation.some((p) => p.bloc === "offres" && p.affiche) && vignettes.length > 0;
  return <RotationBandeau messages={messages} lienOffres={lienOffres} />;
}
