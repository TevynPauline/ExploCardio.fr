import { afterEach, describe, expect, it } from "vitest";
import { definirPanne } from "@/connecteurs/panne-simulee";
import { creerRegistre } from "@/connecteurs/registre";
import { leverVerrou, poserVerrou } from "@/lib/demo/verrou";

// FR-025 : un connecteur dont la panne est simulée répond ServiceUnavailable.
// T058 : pendant une réinitialisation, les connecteurs répondent avec un message d'attente.

describe("pannes simulées et verrou de réinitialisation", () => {
  const registre = creerRegistre(process.env);
  afterEach(async () => {
    await definirPanne("odoo", false);
    await definirPanne("emailing", false);
    await leverVerrou();
  });

  it("une panne simulée rend le connecteur indisponible, les autres continuent", async () => {
    await definirPanne("odoo", true);
    await expect(registre.odoo().catalogue.listerCategories()).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      details: { panneSimulee: true },
    });
    await expect(registre.pca().lireDroits("FICT-P-00001")).resolves.toBeInstanceOf(Array);
    await definirPanne("odoo", false);
    await expect(registre.odoo().catalogue.listerCategories()).resolves.toHaveLength(5);
  });

  it("pendant la réinitialisation, un appel reçoit le message d'attente", async () => {
    await poserVerrou();
    await expect(registre.odoo().catalogue.listerCategories()).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      details: { reinitialisation: true },
    });
  });
});
