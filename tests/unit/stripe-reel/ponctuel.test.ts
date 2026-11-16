import { describe, expect, it } from "vitest";
import { fauxStripe } from "./faux-stripe";

// T027 (F24, US3, R10, FR-017) : prélèvement ponctuel sur l'autorisation conservée ; libération.

const sub = (metadata: Record<string, string> = {}, type = "card") => ({ id: "sub_1", customer: "cus_1", schedule: null, metadata: { abonnementRef: "C202611-0043", ...metadata }, default_payment_method: { id: "pm_1", type }, items: { data: [] } });
const demande = { abonnementRef: "C202611-0043", montantTtc: 12_000, libelle: "Dégradation constatée au retour" };

describe("prélèvement ponctuel", () => {
  it("hors session sur le moyen de l'abonnement, idempotent par clé ; payé", async () => {
    const f = fauxStripe({ "subscriptions.search": () => ({ data: [sub()] }), "paymentIntents.create": () => ({ id: "pi_9", status: "succeeded" }) });
    await expect(f.connecteur().preleverPonctuel(demande, "prelevement:F-1")).resolves.toEqual({ paiementRef: "pi_9", etat: "payee" });
    const [params, options] = f.appels.find((a) => a.ressource === "paymentIntents")!.args;
    expect(params).toEqual({ amount: 12_000, currency: "eur", customer: "cus_1", payment_method: "pm_1", allowed_payment_method_types: ["card"], off_session: true, confirm: true, description: demande.libelle, metadata: { abonnementRef: "C202611-0043", libelle: demande.libelle } });
    expect(options).toEqual({ idempotencyKey: "prelevement:F-1" });
  });

  it("SEPA en cours : payé à titre provisoire", async () => {
    const f = fauxStripe({ "subscriptions.search": () => ({ data: [sub({}, "sepa_debit")] }), "paymentIntents.create": () => ({ id: "pi_10", status: "processing" }) });
    await expect(f.connecteur().preleverPonctuel(demande, "k")).resolves.toEqual({ paiementRef: "pi_10", etat: "payee" });
    expect((f.appels.find((a) => a.ressource === "paymentIntents")!.args[0] as { allowed_payment_method_types: string[] }).allowed_payment_method_types).toEqual(["sepa_debit"]);
  });

  it("carte refusée ou authentification exigée : refusée, sans erreur", async () => {
    for (const code of ["card_declined", "authentication_required"]) {
      const f = fauxStripe({
        "subscriptions.search": () => ({ data: [sub()] }),
        "paymentIntents.create": () => {
          throw Object.assign(new Error("refus"), { type: "StripeCardError", code, payment_intent: { id: "pi_11" } });
        },
      });
      await expect(f.connecteur().preleverPonctuel(demande, "k")).resolves.toEqual({ paiementRef: "pi_11", etat: "refusee" });
    }
  });

  it("autorisation libérée : opération refusée, aucun prélèvement", async () => {
    const f = fauxStripe({ "subscriptions.search": () => ({ data: [sub({ autorisationLiberee: "true" })] }) });
    await expect(f.connecteur().preleverPonctuel(demande, "k")).rejects.toMatchObject({ code: "OPERATION_REFUSED" });
    expect(f.appels.some((a) => a.ressource === "paymentIntents")).toBe(false);
  });
});

describe("libération de l'autorisation", () => {
  it("moyen de paiement détaché, abonnement marqué ; rejouée sans effet", async () => {
    const f = fauxStripe({ "subscriptions.search": () => ({ data: [sub()] }), "paymentMethods.detach": () => ({}), "subscriptions.update": () => ({}) });
    await f.connecteur().libererAutorisation("C202611-0043");
    expect(f.appels.find((a) => a.ressource === "paymentMethods")!.args[0]).toBe("pm_1");
    expect(f.appels.find((a) => a.ressource === "subscriptions" && a.methode === "update")!.args[1]).toEqual({ metadata: { autorisationLiberee: "true" } });
    const g = fauxStripe({ "subscriptions.search": () => ({ data: [sub({ autorisationLiberee: "true" })] }) });
    await g.connecteur().libererAutorisation("C202611-0043");
    expect(g.appels.filter((a) => a.methode !== "search")).toHaveLength(0);
  });
});
