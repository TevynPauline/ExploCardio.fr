import { describe, expect, it } from "vitest";
import { creerRegistre } from "@/connecteurs/registre";

// T014 (F24, US5, FR-004) : clé incohérente avec l'environnement → paiements bloqués.

const env = { CONNECTOR_STRIPE: "real", STRIPE_ENVIRONNEMENT: "recette", STRIPE_SECRET_KEY: "sk_live_cle_factice", STRIPE_WEBHOOK_SECRET: "whsec_factice" };

describe("garde des clés Stripe", () => {
  it("clé live sur la recette : chaque opération refusée, configuration incomplète sur la clé", async () => {
    const stripe = creerRegistre(env).stripe();
    await expect(stripe.ouvrirSessionPaiement({ commandeRef: "C1", montantTtc: 100, moyens: ["carte"], client: { partenaireRef: "P1", email: "a@b.fr" }, urlRetour: "https://x/r", urlAnnulation: "https://x/a" }, "k1"))
      .rejects.toMatchObject({ code: "CONFIGURATION_INCOMPLETE", details: { variablesManquantes: ["STRIPE_SECRET_KEY"] } });
    await expect(stripe.verifierEvenement("{}", "t=1,v1=00")).rejects.toMatchObject({ code: "CONFIGURATION_INCOMPLETE" });
  });

  it("clé de test sur le site public : refusée de même", async () => {
    const stripe = creerRegistre({ ...env, STRIPE_ENVIRONNEMENT: "production", STRIPE_SECRET_KEY: "rk_test_cle_factice" }).stripe();
    await expect(stripe.rembourser({ paiementRef: "pi_1", montantTtc: 100, motif: "x" }, "k2")).rejects.toMatchObject({ code: "CONFIGURATION_INCOMPLETE" });
  });

  it("démonstration inchangée", async () => {
    const stripe = creerRegistre({ ...env, CONNECTOR_STRIPE: "demo" }).stripe();
    await expect(stripe.verifierEvenement('{"id":"x"}', "00ff")).rejects.toMatchObject({ code: "INVALID_SIGNATURE" });
  });
});
