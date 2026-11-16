import { describe, expect, it } from "vitest";
import { evenementSigne, fauxStripe } from "./faux-stripe";

// T016 (F24, US4, research R12) : signature vérifiée, événements Stripe → événements du site.

const PI = { metadata: { commandeRef: "C202611-0042" }, payment_method: { type: "card", card: { brand: "amex" } } };
const lectures = {
  "paymentIntents.retrieve": () => PI,
  "invoicePayments.list": () => ({ data: [{ payment: { type: "payment_intent", payment_intent: "pi_facture" } }] }),
};

describe("réception des événements Stripe", () => {
  it("signature fausse ou absente : InvalidSignature", async () => {
    const f = fauxStripe(lectures);
    const { contenu } = evenementSigne(f.sdk, "checkout.session.completed", { id: "cs_1", mode: "payment" });
    await expect(f.connecteur().verifierEvenement(contenu, "t=1,v1=00ff")).rejects.toMatchObject({ code: "INVALID_SIGNATURE" });
    await expect(f.connecteur().verifierEvenement(contenu, "")).rejects.toMatchObject({ code: "INVALID_SIGNATURE" });
  });

  it("achat payé : paiement_reussi avec commande, PaymentIntent, carte et montant", async () => {
    const f = fauxStripe(lectures);
    const e = evenementSigne(f.sdk, "checkout.session.completed", { id: "cs_1", object: "checkout.session", mode: "payment", payment_status: "paid", amount_total: 14_400, payment_intent: "pi_1", metadata: { commandeRef: "C202611-0042" } });
    const evt = await f.connecteur().verifierEvenement(e.contenu, e.signature);
    expect(evt).toMatchObject({ id: e.id, type: "paiement_reussi", sessionId: "cs_1", commandeRef: "C202611-0042", paiementRef: "pi_1", montantTtc: 14_400, moyen: "carte", carte: "amex" });
    expect(evt!.date).toBeInstanceOf(Date);
  });

  it("abonnement SEPA signé : paiement_reussi immédiat (option A), PaymentIntent de la première facture", async () => {
    const f = fauxStripe(lectures);
    const e = evenementSigne(f.sdk, "checkout.session.completed", { id: "cs_2", mode: "subscription", payment_status: "unpaid", amount_total: 4_680, invoice: "in_1", payment_method_types: ["sepa_debit"], metadata: { abonnementRef: "C202611-0043" } });
    expect(await f.connecteur().verifierEvenement(e.contenu, e.signature)).toMatchObject({ type: "paiement_reussi", abonnementRef: "C202611-0043", paiementRef: "pi_facture", moyen: "sepa", montantTtc: 4_680 });
  });

  it("premier prélèvement SEPA échoué : échéance refusée", async () => {
    const f = fauxStripe(lectures);
    const e = evenementSigne(f.sdk, "checkout.session.async_payment_failed", { id: "cs_2", mode: "subscription", amount_total: 4_680, metadata: { abonnementRef: "C202611-0043" } });
    expect(await f.connecteur().verifierEvenement(e.contenu, e.signature)).toMatchObject({ type: "echeance_refusee", abonnementRef: "C202611-0043" });
  });

  it("échéance mensuelle payée ou refusée ; première facture payée ignorée", async () => {
    const f = fauxStripe(lectures);
    const facture = (billing_reason: string) => ({ id: "in_2", object: "invoice", billing_reason, amount_paid: 8_280, amount_due: 8_280, parent: { type: "subscription_details", subscription_details: { subscription: "sub_1", metadata: { abonnementRef: "C202611-0043" } } } });
    const payee = evenementSigne(f.sdk, "invoice.paid", facture("subscription_cycle"));
    expect(await f.connecteur().verifierEvenement(payee.contenu, payee.signature)).toMatchObject({ type: "echeance_payee", abonnementRef: "C202611-0043", paiementRef: "pi_facture", montantTtc: 8_280 });
    for (const type of ["invoice.payment_failed", "invoice.payment_action_required"]) {
      const r = evenementSigne(f.sdk, type, facture("subscription_cycle"));
      expect(await f.connecteur().verifierEvenement(r.contenu, r.signature)).toMatchObject({ type: "echeance_refusee", abonnementRef: "C202611-0043" });
    }
    const premiere = evenementSigne(f.sdk, "invoice.paid", facture("subscription_create"));
    expect(await f.connecteur().verifierEvenement(premiere.contenu, premiere.signature)).toBeNull();
  });

  it("remboursement et contestation : références lues sur le PaymentIntent", async () => {
    const f = fauxStripe(lectures);
    const r = evenementSigne(f.sdk, "refund.created", { id: "re_1", object: "refund", amount: 2_000, payment_intent: "pi_1" });
    expect(await f.connecteur().verifierEvenement(r.contenu, r.signature)).toMatchObject({ type: "remboursement", paiementRef: "pi_1", commandeRef: "C202611-0042", montantTtc: 2_000 });
    const d = evenementSigne(f.sdk, "charge.dispute.created", { id: "dp_1", object: "dispute", amount: 14_400, payment_intent: "pi_1" });
    expect(await f.connecteur().verifierEvenement(d.contenu, d.signature)).toMatchObject({ type: "contestation", paiementRef: "pi_1", commandeRef: "C202611-0042", montantTtc: 14_400 });
  });

  it("événement sans usage : null", async () => {
    const f = fauxStripe(lectures);
    const e = evenementSigne(f.sdk, "customer.created", { id: "cus_1", object: "customer" });
    expect(await f.connecteur().verifierEvenement(e.contenu, e.signature)).toBeNull();
  });
});
