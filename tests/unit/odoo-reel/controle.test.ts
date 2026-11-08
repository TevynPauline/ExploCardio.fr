import { describe, expect, it } from "vitest";
import { odooReelDeTest } from "./jeu-odoo";

// T017 (F14, FR-027) : rapport de contrôle des données Odoo.

describe("rapport de contrôle", () => {
  it("relève chaque anomalie avec sa gravité, bloquantes d'abord", async () => {
    const { odoo, donnees } = odooReelDeTest();
    donnees["product.category"]!.push({ id: 99, name: "ECG", complete_name: "ECG", parent_id: false });
    donnees["product.template"]!.push({ id: 99, name: "ECG de repos X", categ_id: [99, "ECG"], tracking: false, description_sale: false, taxes_id: [30], product_properties: [], product_variant_ids: [999] });
    donnees["product.product"]!.push({ id: 999, product_tmpl_id: [99, "ECG de repos X"], default_code: "ECG-X", barcode: false, lst_price: 0, free_qty: 0, product_template_attribute_value_ids: [] });
    const r = await odoo.catalogue.controlerDonnees();
    const codes = (code: string) => r.filter((a) => a.code === code);

    expect(codes("CATEGORIE_NON_RELIEE")).toEqual([{ objet: "categorie", reference: "ECG", nom: "ECG", code: "CATEGORIE_NON_RELIEE", detail: "1 produit à vendre", bloquant: true }]);
    expect(codes("PROPRIETE_MANQUANTE").map((a) => `${a.reference}:${a.detail}`)).toEqual(
      expect.arrayContaining(["99-0133-00:Type d'article", "ULKE:Marque", "ULKE:Type d'article", "91-0028-22:Marque"]),
    );
    expect(codes("SANS_TVA")).toMatchObject([{ reference: "SANI-CUFF", bloquant: true }]);
    expect(codes("SANS_REFERENCE")).toMatchObject([{ objet: "variante", bloquant: true }]);
    expect(codes("REFERENCE_EN_DOUBLE").map((a) => a.reference)).toEqual(["98-0239-22", "98-0239-22"]);
    expect(codes("OFFRE_INCOMPLETE")).toMatchObject([{ reference: "DMS 300-3A4B", bloquant: false }]);
    expect(codes("REGLE_PRIX_NON_GEREE")).toMatchObject([{ objet: "regle_prix", detail: "majoration sur le coût", bloquant: false }]);
    expect(codes("CLIENT_SANS_SIRET")).toMatchObject([{ objet: "client", nom: "Cabinet C", bloquant: false }]);
    expect(codes("SIRET_EN_DOUBLE").map((a) => a.reference)).toEqual(["C-A", "C-B"]);

    // Bloquantes d'abord.
    const premiereNonBloquante = r.findIndex((a) => !a.bloquant);
    expect(r.slice(premiereNonBloquante).every((a) => !a.bloquant)).toBe(true);
  });

  it("appareil proposé en mise à disposition sans numéro de série en stock", async () => {
    const { odoo, donnees } = odooReelDeTest();
    donnees["stock.lot"] = [];
    const r = await odoo.catalogue.controlerDonnees();
    expect(r.filter((a) => a.code === "SANS_NUMERO_SERIE")).toMatchObject([{ reference: "DMS 300-4L10B", bloquant: false }]);
  });

  it("les produits sans référence hors des rubriques (cartes cadeaux) ne sont pas signalés", async () => {
    const { odoo } = odooReelDeTest();
    const r = await odoo.catalogue.controlerDonnees();
    expect(r.some((a) => /gift|wallet/i.test(`${a.nom} ${a.reference}`))).toBe(false);
    expect(r.some((a) => a.reference === "Services")).toBe(false);
  });
});
