import { ConfigurationIncomplete } from "../../erreurs";
import { implementationRefusee } from "../../non-livre";
import type { ConnecteurStripe, EvenementPaiement, MoyenPaiement } from "../interfaces";
import { traduireErreurStripe } from "./erreurs";
import { clientExistant } from "./clients";
import { construireEvenementStripe, traduireEvenement, typeCarte, type LecteurStripe } from "./evenements";
import { absolue, ouvrirSessionAbonnement, ouvrirSessionPaiement } from "./sessions";
import { creerSdk, type SdkStripe } from "./sdk";

// Mode réel du connecteur Stripe (F24, contracts/stripe-reel.md). Configuration incomplète ou
// clé incohérente avec l'environnement → ConfigurationIncomplete à chaque opération, sans jamais
// basculer en démonstration (FR-003, FR-004).
// Lots 1 et 2 : événements signés, pages de paiement (achat, abonnement), gestion du moyen de
// paiement. Opérations de l'équipe sur les abonnements et remboursements : lot 3.

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
  // Les parcours donnent des chemins ; Stripe exige des adresses absolues.
  const site = () => {
    if (!env.SITE_URL) throw new ConfigurationIncomplete("stripe", ["SITE_URL"]);
    return env.SITE_URL;
  };

  return {
    async verifierEvenement(contenu: string, signature: string): Promise<EvenementPaiement | null> {
      return traduireEvenement(construireEvenementStripe(sdk, contenu, signature, secret), lecteur);
    },
    async ouvrirSessionPaiement(session, cle) {
      return appel(() => ouvrirSessionPaiement(sdk, session, cle, site()));
    },
    async ouvrirSessionAbonnement(session, cle) {
      return appel(() => ouvrirSessionAbonnement(sdk, session, cle, site()));
    },
    async ouvrirGestionMoyenPaiement(d) {
      // FR-015 : portail client de Stripe, configuré dans le tableau de bord pour la seule mise à
      // jour du moyen de paiement (research R13).
      return appel(async () => {
        const customer = await clientExistant(sdk, d.partenaireRef);
        const portail = await sdk.billingPortal.sessions.create({ customer, return_url: absolue(d.urlRetour, site()), locale: "fr" });
        return { url: portail.url };
      }, "Client de paiement");
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
