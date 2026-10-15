import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { traiterEvenementPaiement } from "@/domaine/paiements";

// Gestionnaire des événements de paiement (T076) : reçoit les événements de Stripe en mode réel
// et ceux de la page de paiement de démonstration en mode démonstration. La signature est
// vérifiée par le connecteur ; le traitement est idempotent.

export async function POST(requete: Request) {
  const contenu = await requete.text();
  const signature = requete.headers.get("stripe-signature") ?? requete.headers.get("x-demo-signature") ?? "";
  let evenement;
  try {
    evenement = await registre.stripe().verifierEvenement(contenu, signature);
  } catch (e) {
    if (estErreurConnecteur(e) && e.code === "INVALID_SIGNATURE") {
      return Response.json({ erreur: "signature invalide" }, { status: 400 });
    }
    throw e;
  }
  const resultat = await traiterEvenementPaiement(evenement);
  return Response.json(resultat);
}
