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
    expect(lireProprietes([])).toEqual({ marque: null, type: null, quantiteParLot: 1, eligibleBonsAchat: false, offre: null, offreIncomplete: false });
    expect(lireProprietes(false)).toMatchObject({ marque: null });
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

  it("type inconnu : null", () => {
    expect(lireProprietes([p("Type d'article", "Gadget")]).type).toBeNull();
  });
});
