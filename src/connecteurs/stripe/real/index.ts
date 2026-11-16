import { ConfigurationIncomplete } from "../../erreurs";
import { implementationRefusee } from "../../non-livre";
import type { ConnecteurStripe, EvenementPaiement, MoyenPaiement } from "../interfaces";
import { traduireErreurStripe } from "./erreurs";
import { libererAutorisation, preleverPonctuel, resilier, retablirElement, retirerElement } from "./abonnements";
import { clientExistant } from "./clients";
import { construireEvenementStripe, traduireEvenement, typeCarte, type LecteurStripe } from "./evenements";
import { absolue, ouvrirSessionAbonnement, ouvrirSessionPaiement } from "./sessions";
import { creerSdk, type SdkStripe } from "./sdk";

// Mode réel du connecteur Stripe (F24, contracts/stripe-reel.md). Configuration incomplète ou
// clé incohérente avec l'environnement → ConfigurationIncomplete à chaque opération, sans jamais
// basculer en démonstration (FR-003, FR-004).
// Événements signés, pages de paiement (achat, abonnement), gestion du moyen de paiement,
// opérations de l'équipe (retrait de location, résiliation, ponctuel, libération, remboursement).

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
    async rembourser(d, cle) {
      // FR-019 : un montant supérieur au restant remboursable est refusé par Stripe → OperationRefusee.
      const r = await appel(() => sdk.refunds.create({ payment_intent: d.paiementRef, amount: d.montantTtc, metadata: { motif: d.motif.slice(0, 450) } }, { idempotencyKey: cle }), "Paiement");
      return { remboursementRef: r.id };
    },
    async resilierAbonnement(abonnementRef, dateFin) {
      await appel(() => resilier(sdk, abonnementRef, dateFin), "Abonnement de paiement");
    },
    async retirerElementAbonnement(abonnementRef, element, dateEffet) {
      await appel(() => retirerElement(sdk, abonnementRef, element, dateEffet), "Abonnement de paiement");
    },
    async retablirElementAbonnement(abonnementRef, element) {
      await appel(() => retablirElement(sdk, abonnementRef, element), "Abonnement de paiement");
    },
    async preleverPonctuel(d, cle) {
      return appel(() => preleverPonctuel(sdk, d, cle), "Abonnement de paiement");
    },
    async libererAutorisation(abonnementRef) {
      await appel(() => libererAutorisation(sdk, abonnementRef), "Abonnement de paiement");
    },
  };
}
