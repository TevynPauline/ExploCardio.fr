import { describe, expect, it } from "vitest";
import { fauxStripe } from "./faux-stripe";

// T018 (F24, R3, FR-026) : un client Stripe par partenaire, sans doublon, données minimales.

const session = { commandeRef: "C202611-0042", montantTtc: 14_400, moyens: ["carte" as const], client: { partenaireRef: "P-42", email: "docteur@cabinet.fr" }, urlRetour: "/commande/retour?ref=C202611-0042", urlAnnulation: "/commande/retour?ref=C202611-0042" };
const checkout = () => ({ id: "cs_1", url: "https://checkout.stripe.com/c/pay/cs_1" });

describe("client Stripe du partenaire", () => {
  it("client existant retrouvé par sa référence : aucune création", async () => {
    const f = fauxStripe({ "customers.search": () => ({ data: [{ id: "cus_existant" }] }), "checkout.sessions.create": checkout });
    await f.connecteur().ouvrirSessionPaiement(session, "cle-1");
    expect(f.appels.find((a) => a.methode === "search")!.args[0]).toEqual({ query: "metadata['partenaireRef']:'P-42'", limit: 1 });
    expect(f.appels.some((a) => a.ressource === "customers" && a.methode === "create")).toBe(false);
    expect((f.appels.find((a) => a.ressource === "checkout.sessions")!.args[0] as { customer: string }).customer).toBe("cus_existant");
  });

  it("sinon créé une seule fois : email et référence seulement", async () => {
    const f = fauxStripe({ "customers.search": () => ({ data: [] }), "customers.create": () => ({ id: "cus_nouveau" }), "checkout.sessions.create": checkout });
    await f.connecteur().ouvrirSessionPaiement(session, "cle-2");
    const creation = f.appels.find((a) => a.ressource === "customers" && a.methode === "create")!;
    expect(creation.args).toEqual([{ email: "docteur@cabinet.fr", metadata: { partenaireRef: "P-42" } }, { idempotencyKey: "client:P-42" }]);
  });
});
