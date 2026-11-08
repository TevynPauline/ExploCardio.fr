import { describe, expect, it } from "vitest";
import { odooReelDeTest } from "./jeu-odoo";

// T016 (F14, R6) : disponibilité en mode réel.

describe("stock en mode réel", () => {
  it("disponible, délai fournisseur ou indisponible ; mise à disposition selon le parc", async () => {
    const { odoo } = odooReelDeTest();
    const d = await odoo.stock.lireDisponibilite(["DMS 300-4L4B", "DMS 300-3A4B", "98-0239-01", "INCONNUE"]);
    expect(d).toEqual([
      { defaultCode: "DMS 300-4L4B", achat: { etat: "disponible" }, quantiteDisponible: 3, delaiReassortJours: 7, miseADisposition: { etat: "disponible" } },
      { defaultCode: "DMS 300-3A4B", achat: { etat: "delai", delaiJours: 7 }, quantiteDisponible: 0, delaiReassortJours: 7, miseADisposition: null },
      { defaultCode: "98-0239-01", achat: { etat: "delai", delaiJours: 1 }, quantiteDisponible: 0, delaiReassortJours: 1, miseADisposition: null },
    ]);
  });

  it("épuisé sans délai fournisseur : indisponible", async () => {
    const { odoo, donnees } = odooReelDeTest();
    donnees["product.supplierinfo"] = [];
    const [d] = await odoo.stock.lireDisponibilite(["DMS 300-3A4B"]);
    expect(d).toMatchObject({ achat: { etat: "indisponible" }, delaiReassortJours: null });
  });

  it("sans appareil libre : mise à disposition indisponible", async () => {
    const { odoo, donnees } = odooReelDeTest();
    donnees["stock.lot"] = [];
    const [d] = await odoo.stock.lireDisponibilite(["DMS 300-4L4B"]);
    expect(d!.miseADisposition).toEqual({ etat: "indisponible" });
  });

  it("les réservations ne sont pas livrées au lot 1", async () => {
    const { odoo } = odooReelDeTest();
    await expect(odoo.stock.reserver([{ defaultCode: "DMS 300-4L4B", quantite: 1 }], "cle")).rejects.toMatchObject({ code: "CONFIGURATION_INCOMPLETE" });
    await expect(odoo.stock.reserverAppareil("DMS 300-4L4B", new Date(), "cle")).rejects.toMatchObject({ code: "CONFIGURATION_INCOMPLETE" });
  });
});
