import { describe, expect, it } from "vitest";
import { fauxStripe } from "./faux-stripe";

// T028 (F24, US3, R11, FR-019) : remboursement total ou partiel, idempotent, limité au restant.

const erreur = (code: string) => () => {
  throw Object.assign(new Error(code), { type: "StripeInvalidRequestError", code, param: "payment_intent" });
};

describe("remboursements", () => {
  it("rembourse le paiement, avec le motif, une seule fois par clé", async () => {
    const f = fauxStripe({ "refunds.create": () => ({ id: "re_1" }) });
    await expect(f.connecteur().rembourser({ paiementRef: "pi_1", montantTtc: 2_000, motif: "Annulation avant expédition" }, "annulation:L-1")).resolves.toEqual({ remboursementRef: "re_1" });
    expect(f.appels[0]!.args).toEqual([{ payment_intent: "pi_1", amount: 2_000, metadata: { motif: "Annulation avant expédition" } }, { idempotencyKey: "annulation:L-1" }]);
  });

  it("paiement inconnu : NotFound ; montant supérieur au restant : opération refusée", async () => {
    await expect(fauxStripe({ "refunds.create": erreur("resource_missing") }).connecteur().rembourser({ paiementRef: "pi_x", montantTtc: 1, motif: "m" }, "k")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(fauxStripe({ "refunds.create": erreur("amount_too_large") }).connecteur().rembourser({ paiementRef: "pi_1", montantTtc: 99_999, motif: "m" }, "k")).rejects.toMatchObject({ code: "OPERATION_REFUSED" });
  });
});
