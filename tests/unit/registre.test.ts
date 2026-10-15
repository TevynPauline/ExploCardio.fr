import { describe, expect, it } from "vitest";
import { creerRegistre } from "@/connecteurs/registre";
import { modeDuConnecteur } from "@/lib/config";

// T052 (FR-004, FR-007, SC-005) : choix du mode par variable, défaut « demo »,
// ConfigurationIncomplete en mode réel incomplet, aucun repli en démonstration, configuration mixte.

const base = { ...process.env, CONNECTOR_ODOO: undefined, CONNECTOR_STRIPE: undefined, CONNECTOR_PCA: undefined, CONNECTOR_EMAILING: undefined };

describe("registre des connecteurs", () => {
  it("met chaque connecteur en démonstration par défaut", () => {
    for (const nom of ["odoo", "stripe", "pca", "emailing"] as const) {
      expect(modeDuConnecteur(nom, base)).toBe("demo");
    }
    expect(modeDuConnecteur("stripe", { CONNECTOR_STRIPE: "n'importe quoi" })).toBe("demo");
  });

  it("un connecteur réel sans configuration lève ConfigurationIncomplete et ne bascule pas en démonstration", async () => {
    const registre = creerRegistre({ ...base, CONNECTOR_STRIPE: "real" });
    await expect(
      registre.stripe().ouvrirSessionPaiement(
        {
          commandeRef: "C1",
          montantTtc: 1000,
          moyens: ["carte"],
          client: { partenaireRef: "1", email: "dr@cabinet.fr" },
          urlRetour: "/",
          urlAnnulation: "/",
        },
        "cle",
      ),
    ).rejects.toMatchObject({
      code: "CONFIGURATION_INCOMPLETE",
      details: { variablesManquantes: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"] },
    });
  });

  it("chaque domaine d'Odoo en mode réel incomplet refuse de fonctionner", async () => {
    const registre = creerRegistre({ ...base, CONNECTOR_ODOO: "real" });
    await expect(registre.odoo().catalogue.listerCategories()).rejects.toMatchObject({ code: "CONFIGURATION_INCOMPLETE" });
    await expect(registre.odoo().fidelite.lireCagnotte("1")).rejects.toMatchObject({ code: "CONFIGURATION_INCOMPLETE" });
  });

  it("accepte une configuration mixte : Stripe réel, les autres en démonstration", async () => {
    const registre = creerRegistre({ ...base, CONNECTOR_STRIPE: "real" });
    const categories = await registre.odoo().catalogue.listerCategories();
    expect(categories.length).toBe(5);
    await expect(registre.pca().lireDroits("FICT-P-00001")).resolves.toBeInstanceOf(Array);
    await expect(registre.stripe().resilierAbonnement("A1", new Date())).rejects.toMatchObject({
      code: "CONFIGURATION_INCOMPLETE",
    });
  });
});
