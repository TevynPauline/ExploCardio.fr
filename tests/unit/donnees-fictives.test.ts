import { afterEach, describe, expect, it, vi } from "vitest";
import { estDonneeFictive } from "@/connecteurs/garde-donnees-fictives";
import { creerRegistre } from "@/connecteurs/registre";

// T051 : une donnée de démonstration passée à une implémentation réelle est refusée (FR-017, SC-012).

describe("refus des données fictives par les implémentations réelles", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reconnaît une donnée fictive : marque, référence FICT- ou adresse de démonstration", () => {
    expect(estDonneeFictive({ estFictif: true })).toBe(true);
    expect(estDonneeFictive(["FICT-P-00001"])).toBe(true);
    expect(estDonneeFictive([{ client: { email: "client.droits@demo.explocardio.test" } }])).toBe(true);
    expect(estDonneeFictive([{ ref: "12345", email: "dr.martin@cabinet.fr" }])).toBe(false);
  });

  it("une implémentation réelle refuse une donnée de la base de démonstration (DemoDataRejected)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const registre = creerRegistre({
      ...process.env,
      CONNECTOR_ODOO: "real",
      ODOO_URL: "https://odoo.exemple.test",
      ODOO_DATABASE: "test",
      ODOO_USER: "test",
      ODOO_API_KEY: "valeur-de-test",
    });
    await expect(registre.odoo().clients.lireSituation("FICT-P-00001")).rejects.toMatchObject({
      code: "DEMO_DATA_REJECTED",
    });
    await expect(
      registre.odoo().commandes.creerCommandePayee(
        {
          partenaireRef: "12",
          lignes: [{ defaultCode: "EC-DMS-3004L", quantite: 1 }],
          livraison: { adresse: "x", codePostal: "75001", ville: "Paris", fraisPortHt: 0 },
          paiement: { mode: "carte", reference: "FICT-PAY-1" },
        },
        "cle",
      ),
    ).rejects.toMatchObject({ code: "DEMO_DATA_REJECTED" });
  });
});
