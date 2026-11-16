import { describe, expect, it } from "vitest";
import { cleStripeIncoherente, environnementStripe, variablesManquantes } from "@/lib/config";

// T004 (F24, R2, FR-004) : environnement obligatoire, préfixe de clé cohérent.

const base = { CONNECTOR_STRIPE: "real", STRIPE_WEBHOOK_SECRET: "whsec_factice" };

describe("configuration du connecteur Stripe réel", () => {
  it("exige l'environnement, avec une valeur admise", () => {
    expect(variablesManquantes("stripe", { ...base, STRIPE_SECRET_KEY: "rk_test_x" })).toContain("STRIPE_ENVIRONNEMENT");
    expect(environnementStripe({ STRIPE_ENVIRONNEMENT: "test" })).toBeNull();
  });

  it("clé live en recette ou clé de test en production : clé comptée manquante", () => {
    expect(variablesManquantes("stripe", { ...base, STRIPE_ENVIRONNEMENT: "recette", STRIPE_SECRET_KEY: "sk_live_x" })).toEqual(["STRIPE_SECRET_KEY"]);
    expect(variablesManquantes("stripe", { ...base, STRIPE_ENVIRONNEMENT: "production", STRIPE_SECRET_KEY: "sk_test_x" })).toEqual(["STRIPE_SECRET_KEY"]);
    expect(cleStripeIncoherente({ ...base, STRIPE_ENVIRONNEMENT: "recette", STRIPE_SECRET_KEY: "sk_live_x" })).toBe(true);
  });

  it("clés cohérentes (standard ou restreintes) : complet", () => {
    expect(variablesManquantes("stripe", { ...base, STRIPE_ENVIRONNEMENT: "recette", STRIPE_SECRET_KEY: "rk_test_x" })).toEqual([]);
    expect(variablesManquantes("stripe", { ...base, STRIPE_ENVIRONNEMENT: "production", STRIPE_SECRET_KEY: "rk_live_x" })).toEqual([]);
    expect(cleStripeIncoherente({ ...base, STRIPE_ENVIRONNEMENT: "production", STRIPE_SECRET_KEY: "sk_live_x" })).toBe(false);
  });

  it("en démonstration, jamais incohérent", () => {
    expect(cleStripeIncoherente({ ...base, CONNECTOR_STRIPE: "demo", STRIPE_ENVIRONNEMENT: "recette", STRIPE_SECRET_KEY: "sk_live_x" })).toBe(false);
  });
});
