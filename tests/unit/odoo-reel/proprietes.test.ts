import { describe, expect, it } from "vitest";
import { lireProprietes } from "@/connecteurs/odoo/real/proprietes";

// T013 (F14, R2) : propriétés produit d'Odoo.

const p = (string: string, value: unknown, extra: Record<string, unknown> = {}) => ({ name: string.slice(0, 8), string, type: "char", value, ...extra });

describe("propriétés produit", () => {
  it("lit marque et type (sélection) sans tenir compte de la casse ni des accents", () => {
    const r = lireProprietes([
      p("MARQUE", "DMS"),
      p("Type d’article", "eq", { type: "selection", selection: [["eq", "Équipement"], ["co", "Consommable"]] }),
    ]);
    expect(r).toMatchObject({ marque: "DMS", type: "equipement", quantiteParLot: 1, eligibleBonsAchat: false, offre: null, offreIncomplete: false });
  });

  it("valeurs par défaut sans propriété", () => {
    expect(lireProprietes([])).toEqual({
      marque: null, type: null, quantiteParLot: 1, eligibleBonsAchat: false, offre: null, offreIncomplete: false,
      fraisLivraisonHt: 0, fraisInstallationHt: 0, seuilFrancoHt: null,
    });
    expect(lireProprietes(false)).toMatchObject({ marque: null });
  });

  it("frais des produits volumineux et seuil de franco (lot 3), en centimes", () => {
    expect(lireProprietes([p("Frais de livraison HT", 150, { type: "float" }), p("Frais d'installation HT", "80,50"), p("Seuil de franco HT", 500, { type: "float" })])).toMatchObject({
      fraisLivraisonHt: 15000,
      fraisInstallationHt: 8050,
      seuilFrancoHt: 50000,
    });
  });

  it("offre de mise à disposition complète, montants en centimes", () => {
    const r = lireProprietes([
      p("Mise à disposition - premier mois HT", 89, { type: "float" }),
      p("Mise à disposition – mois suivants HT", "69,50"),
      p("Valeur de remplacement HT", 1800, { type: "float" }),
      p("Kit requis", "KIT-01"),
      p("Logiciel Cloud", false),
      p("Quantité par lot", 50, { type: "integer" }),
      p("Éligible aux bons d'achat", true, { type: "boolean" }),
    ]);
    expect(r.offre).toEqual({ premierMoisHt: 8900, moisSuivantsHt: 6950, valeurRemplacementHt: 180000, kitRequis: "KIT-01", logiciel: null, contenuPack: [] });
    expect(r).toMatchObject({ quantiteParLot: 50, eligibleBonsAchat: true, offreIncomplete: false });
  });

  it("offre incomplète : pas d'offre, signalée", () => {
    const r = lireProprietes([p("Mise à disposition – premier mois HT", 89, { type: "float" })]);
    expect(r).toMatchObject({ offre: null, offreIncomplete: true });
  });

  it("saisies de la vraie base : seuil « 125 € » en sélection, type au pluriel, frais sous d'autres libellés, champs prioritaires", () => {
    expect(lireProprietes([p("Seuil de franco HT", "125", { type: "selection", selection: [["125", "125 €"]] })]).seuilFrancoHt).toBe(12500);
    expect(lireProprietes([p("Type d'article", "Accessoires")]).type).toBe("accessoire");
    expect(lireProprietes([p("Livraison spéciale", 600, { type: "float" }), p("Frais d'installation", 600, { type: "float" })])).toMatchObject({
      fraisLivraisonHt: 60000,
      fraisInstallationHt: 60000,
    });
    expect(lireProprietes([p("Marque", "Ancienne"), p("Type d'article", "Service")], { marque: "Suntech", type: "Equipement" })).toMatchObject({ marque: "Suntech", type: "equipement" });
    expect(lireProprietes([p("Marque", "DMS")], { marque: null, type: null }).marque).toBe("DMS");
  });

  it("type inconnu : null", () => {
    expect(lireProprietes([p("Type d'article", "Gadget")]).type).toBeNull();
  });
});
