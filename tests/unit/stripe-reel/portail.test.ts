import { describe, expect, it } from "vitest";
import { fauxStripe } from "./faux-stripe";

// T023 (F24, US2, FR-015, R13) : page sécurisée de mise à jour du moyen de paiement.

describe("gestion du moyen de paiement", () => {
  it("portail client du partenaire, retour vers le site", async () => {
    const f = fauxStripe({ "customers.search": () => ({ data: [{ id: "cus_1" }] }), "billingPortal.sessions.create": () => ({ url: "https://billing.stripe.com/p/session/x" }) });
    await expect(f.connecteur().ouvrirGestionMoyenPaiement({ partenaireRef: "P-42", urlRetour: "/mon-compte/locations" })).resolves.toEqual({ url: "https://billing.stripe.com/p/session/x" });
    expect(f.appels.find((a) => a.ressource === "billingPortal.sessions")!.args[0]).toEqual({ customer: "cus_1", return_url: "https://recette.explocardio.test/mon-compte/locations", locale: "fr" });
  });

  it("client inconnu : NotFound, aucun client créé", async () => {
    const f = fauxStripe({ "customers.search": () => ({ data: [] }) });
    await expect(f.connecteur().ouvrirGestionMoyenPaiement({ partenaireRef: "P-0", urlRetour: "/mon-compte/locations" })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(f.appels.some((a) => a.methode === "create")).toBe(false);
  });
});
