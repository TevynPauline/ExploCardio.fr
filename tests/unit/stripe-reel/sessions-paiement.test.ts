import { describe, expect, it } from "vitest";
import { fauxStripe } from "./faux-stripe";

// T019 (F24, US1, R4, FR-007 à FR-009) : page de paiement d'un achat.

const session = { commandeRef: "C202611-0042", montantTtc: 14_400, moyens: ["carte" as const, "sepa" as const], client: { partenaireRef: "P-42", email: "docteur@cabinet.fr" }, urlRetour: "/commande/retour?ref=C202611-0042", urlAnnulation: "/commande/retour?ref=C202611-0042" };

describe("page de paiement d'un achat", () => {
  it("carte seule, montant TTC exact, références, libellé, adresses absolues, sans taxe ni facture", async () => {
    const f = fauxStripe({ "customers.search": () => ({ data: [{ id: "cus_1" }] }), "checkout.sessions.create": () => ({ id: "cs_1", url: "https://checkout.stripe.com/c/pay/cs_1" }) });
    const r = await f.connecteur().ouvrirSessionPaiement(session, "C202611-0042:achat:1");
    expect(r).toEqual({ sessionId: "cs_1", url: "https://checkout.stripe.com/c/pay/cs_1" });
    const [params, options] = f.appels.find((a) => a.ressource === "checkout.sessions")!.args as [Record<string, unknown>, unknown];
    expect(params).toEqual({
      mode: "payment",
      allowed_payment_method_types: ["card"],
      customer: "cus_1",
      client_reference_id: "C202611-0042",
      metadata: { commandeRef: "C202611-0042" },
      line_items: [{ quantity: 1, price_data: { currency: "eur", unit_amount: 14_400, product_data: { name: "Commande C202611-0042" } } }],
      payment_intent_data: { metadata: { commandeRef: "C202611-0042" }, statement_descriptor_suffix: "C202611-0042" },
      success_url: "https://recette.explocardio.test/commande/retour?ref=C202611-0042",
      cancel_url: "https://recette.explocardio.test/commande/retour?ref=C202611-0042",
      locale: "fr",
    });
    expect(options).toEqual({ idempotencyKey: "C202611-0042:achat:1" });
  });

  it("Stripe indisponible : ServiceUnavailable", async () => {
    const f = fauxStripe({
      "customers.search": () => {
        throw Object.assign(new Error("connexion"), { type: "StripeConnectionError" });
      },
    });
    await expect(f.connecteur().ouvrirSessionPaiement(session, "cle")).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
  });
});
