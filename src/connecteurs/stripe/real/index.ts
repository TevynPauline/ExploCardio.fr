import { ConfigurationIncomplete } from "../../erreurs";
import { implementationRefusee } from "../../non-livre";
import type { ConnecteurStripe, EvenementPaiement, MoyenPaiement } from "../interfaces";
import { traduireErreurStripe } from "./erreurs";
import { construireEvenementStripe, traduireEvenement, typeCarte, type LecteurStripe } from "./evenements";
import { creerSdk, type SdkStripe } from "./sdk";

// Mode réel du connecteur Stripe (F24, contracts/stripe-reel.md). Configuration incomplète ou
// clé incohérente avec l'environnement → ConfigurationIncomplete à chaque opération, sans jamais
// basculer en démonstration (FR-003, FR-004).
// Lot 1 : réception signée des événements. Paiements, abonnements et opérations de l'équipe :
// lots 2 et 3.

type Env = Record<string, string | undefined>;

export function creerStripeReel(variablesManquantes: string[], env: Env = process.env, options: { sdk?: SdkStripe } = {}): ConnecteurStripe {
  if (variablesManquantes.length) return implementationRefusee<ConnecteurStripe>("stripe", variablesManquantes);

  const cle = env.STRIPE_SECRET_KEY!;
  const secret = env.STRIPE_WEBHOOK_SECRET!;
  const sdk = options.sdk ?? creerSdk(cle);
  const masquer = (texte: string) => texte.split(cle).join("***").split(secret).join("***");

  /** Exécute un appel au SDK en traduisant ses erreurs dans celles du contrat. */
  async function appel<T>(f: () => Promise<T>, objet?: string): Promise<T> {
    try {
      return await f();
    } catch (e) {
      throw traduireErreurStripe(e, masquer, objet);
    }
  }

  const lecteur: LecteurStripe = {
    async paiement(paiementId) {
      const pi = await appel(() => sdk.paymentIntents.retrieve(paiementId, { expand: ["payment_method"] }), "Paiement");
      const pm = typeof pi.payment_method === "object" ? pi.payment_method : null;
      const moyen: MoyenPaiement | null = pm?.type === "sepa_debit" ? "sepa" : pm?.type === "card" ? "carte" : null;
      return { metadata: pi.metadata ?? {}, moyen, carte: typeCarte(pm?.card?.brand) };
    },
    async paiementDeFacture(factureId) {
      const liste = await appel(() => sdk.invoicePayments.list({ invoice: factureId, limit: 10 }), "Facture");
      const p = liste.data.find((x) => x.payment?.type === "payment_intent" && x.payment.payment_intent);
      const pi = p?.payment.payment_intent;
      return typeof pi === "string" ? pi : (pi?.id ?? null);
    },
  };

  const nonLivre = () => new ConfigurationIncomplete("stripe", []);

  return {
    async verifierEvenement(contenu: string, signature: string): Promise<EvenementPaiement | null> {
      return traduireEvenement(construireEvenementStripe(sdk, contenu, signature, secret), lecteur);
    },
    async ouvrirSessionPaiement() {
      throw nonLivre();
    },
    async ouvrirSessionAbonnement() {
      throw nonLivre();
    },
    async ouvrirGestionMoyenPaiement() {
      throw nonLivre();
    },
    async rembourser() {
      throw nonLivre();
    },
    async resilierAbonnement() {
      throw nonLivre();
    },
    async retirerElementAbonnement() {
      throw nonLivre();
    },
    async retablirElementAbonnement() {
      throw nonLivre();
    },
    async preleverPonctuel() {
      throw nonLivre();
    },
    async libererAutorisation() {
      throw nonLivre();
    },
  };
}
