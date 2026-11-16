import { describe, expect, it } from "vitest";
import { NotFound } from "@/connecteurs/erreurs";
import { traduireErreurStripe } from "@/connecteurs/stripe/real/erreurs";

// T005 (F24, contracts/stripe-reel.md) : erreurs Stripe → erreurs du contrat, clé masquée.

const CLE = "rk_test_cle_factice_0123456789";
const masquer = (t: string) => t.split(CLE).join("***");
const erreur = (type: string, extra: Record<string, unknown> = {}) => Object.assign(new Error(`Erreur ${CLE}`), { type, ...extra });

describe("traduction des erreurs Stripe", () => {
  it("réseau, API, limite de débit : indisponible", () => {
    for (const t of ["StripeConnectionError", "StripeAPIError", "StripeRateLimitError"]) {
      expect(traduireErreurStripe(erreur(t), masquer)).toMatchObject({ code: "SERVICE_UNAVAILABLE" });
    }
  });

  it("clé refusée : configuration incomplète sur STRIPE_SECRET_KEY", () => {
    for (const t of ["StripeAuthenticationError", "StripePermissionError"]) {
      expect(traduireErreurStripe(erreur(t), masquer)).toMatchObject({ code: "CONFIGURATION_INCOMPLETE", details: { variablesManquantes: ["STRIPE_SECRET_KEY"] } });
    }
  });

  it("ressource inconnue : NotFound", () => {
    expect(traduireErreurStripe(erreur("StripeInvalidRequestError", { code: "resource_missing", param: "payment_intent" }), masquer, "Paiement")).toMatchObject({ code: "NOT_FOUND" });
  });

  it("montant de remboursement excessif : opération refusée", () => {
    expect(traduireErreurStripe(erreur("StripeInvalidRequestError", { code: "amount_too_large" }), masquer)).toMatchObject({ code: "OPERATION_REFUSED" });
  });

  it("la clé n'apparaît jamais ; une erreur du contrat ou inconnue passe telle quelle", () => {
    const e = traduireErreurStripe(erreur("StripeInvalidRequestError", { code: "parameter_invalid" }), masquer) as { message: string; details?: unknown };
    expect(JSON.stringify({ m: e.message, d: e.details })).not.toContain(CLE);
    const deja = new NotFound("Paiement", "pi_1");
    expect(traduireErreurStripe(deja, masquer)).toBe(deja);
    const autre = new TypeError("x");
    expect(traduireErreurStripe(autre, masquer)).toBe(autre);
  });
});
