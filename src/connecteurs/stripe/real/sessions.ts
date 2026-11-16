import type Stripe from "stripe";
import type { MoyenPaiement, SessionAbonnement, SessionPaiement } from "../interfaces";
import { clientStripe } from "./clients";
import type { SdkStripe } from "./sdk";

// Pages de paiement hébergées par Stripe (F24, research R4, R5). Montants TTC en centimes
// calculés par le site ; ni taxe ni facture Stripe (FR-027, FR-028).

const JOUR_S = 24 * 3600;
/** Stripe exige une fin de période d'essai au moins 48 h après l'ouverture de la page. */
const ESSAI_MINIMUM_S = 2 * JOUR_S + 3600;

/** Rend absolue une adresse relative du site (les parcours fournissent des chemins). */
export function absolue(url: string, siteUrl: string): string {
  return new URL(url, siteUrl).toString();
}

const methodes = (moyens: MoyenPaiement[]): Stripe.Checkout.SessionCreateParams.AllowedPaymentMethodType[] => [
  ...new Set(moyens.map((m): Stripe.Checkout.SessionCreateParams.AllowedPaymentMethodType => (m === "sepa" ? "sepa_debit" : "card"))),
];

/** Suffixe du libellé de relevé : la référence de commande, 22 caractères au plus. */
export function suffixeLibelle(ref: string): string {
  return ref.replace(/[<>\\'"*]/g, "").slice(0, 22);
}

export async function ouvrirSessionPaiement(sdk: SdkStripe, s: SessionPaiement, cle: string, siteUrl: string) {
  const customer = await clientStripe(sdk, s.client);
  const session = await sdk.checkout.sessions.create(
    {
      mode: "payment",
      // Achats : carte seulement (Apple Pay et Google Pay en sont des portefeuilles) ; le
      // virement reste hors Stripe (F04, FR-007).
      allowed_payment_method_types: ["card"],
      customer,
      client_reference_id: s.commandeRef,
      metadata: { commandeRef: s.commandeRef },
      line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: s.montantTtc, product_data: { name: `Commande ${s.commandeRef}` } } }],
      payment_intent_data: { metadata: { commandeRef: s.commandeRef }, statement_descriptor_suffix: suffixeLibelle(s.commandeRef) },
      success_url: absolue(s.urlRetour, siteUrl),
      cancel_url: absolue(s.urlAnnulation, siteUrl),
      locale: "fr",
    },
    { idempotencyKey: cle },
  );
  return { sessionId: session.id, url: session.url! };
}

export async function ouvrirSessionAbonnement(sdk: SdkStripe, s: SessionAbonnement, cle: string, siteUrl: string, maintenant = new Date()) {
  const customer = await clientStripe(sdk, s.client);
  const libelle = s.objet === "logiciel" ? "Abonnement logiciel" : "Mise à disposition";
  // Un article par location (FR-011), sinon un article unique au montant mensuel.
  const elements = s.elements?.length ? s.elements : [{ element: s.abonnementRef, premierMontantTtc: s.premierMontantTtc, montantMensuelTtc: s.montantMensuelTtc }];
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = elements.map((e) => ({
    quantity: 1,
    price_data: {
      currency: "eur",
      unit_amount: e.montantMensuelTtc,
      recurring: { interval: "month" },
      product_data: { name: `${libelle} — ${e.element}`, metadata: { element: e.element, abonnementRef: s.abonnementRef } },
    },
  }));

  const subscription_data: Stripe.Checkout.SessionCreateParams.SubscriptionData = { metadata: { abonnementRef: s.abonnementRef, objet: s.objet } };
  let discounts: Stripe.Checkout.SessionCreateParams.Discount[] | undefined;

  if (s.debutPrelevements) {
    // F12 (FR-013) : autorisation recueillie maintenant, première mensualité à la date prévue.
    const debut = Math.floor(s.debutPrelevements.getTime() / 1000);
    subscription_data.trial_end = Math.max(debut, Math.floor(maintenant.getTime() / 1000) + ESSAI_MINIMUM_S);
  } else {
    // Premier mois à un autre montant que les suivants (F05) : écart sur la première facture.
    const ecart = s.premierMontantTtc - elements.reduce((t, e) => t + e.montantMensuelTtc, 0);
    if (ecart > 0) {
      line_items.push({ quantity: 1, price_data: { currency: "eur", unit_amount: ecart, product_data: { name: "Premier mois : frais d'envoi et de retour" } } });
    } else if (ecart < 0) {
      const coupon = await sdk.coupons.create({ amount_off: -ecart, currency: "eur", duration: "once", name: "Tarif du premier mois" }, { idempotencyKey: `coupon:${cle}` });
      discounts = [{ coupon: coupon.id }];
    }
  }

  const session = await sdk.checkout.sessions.create(
    {
      mode: "subscription",
      allowed_payment_method_types: methodes(s.moyens),
      customer,
      client_reference_id: s.abonnementRef,
      metadata: { abonnementRef: s.abonnementRef },
      line_items,
      subscription_data,
      ...(discounts ? { discounts } : {}),
      success_url: absolue(s.urlRetour, siteUrl),
      cancel_url: absolue(s.urlAnnulation, siteUrl),
      locale: "fr",
    },
    { idempotencyKey: cle },
  );
  return { sessionId: session.id, url: session.url! };
}
