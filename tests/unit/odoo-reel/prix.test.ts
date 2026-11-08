import { describe, expect, it } from "vitest";
import { paliersPour, prixPour, regleNonGeree, remisePourcent, type RegleOdoo } from "@/connecteurs/odoo/real/prix";

// T014 (F14, R5) : règles de liste de prix appliquées pour l'affichage.

let n = 0;
function regle(r: Partial<RegleOdoo>): RegleOdoo {
  return {
    id: ++n, pricelist_id: [1, "Par défaut"], applied_on: "3_global", categ_id: false, product_tmpl_id: false, product_id: false,
    min_quantity: 0, date_start: false, date_end: false, compute_price: "fixed", base: "list_price", fixed_price: 0,
    price_discount: 0, price_surcharge: 0, price_round: 0, price_min_margin: 0, price_max_margin: 0, ...r,
  };
}
const cible = { varianteId: 10, modeleId: 100, categories: [5, 1], prixVente: 100 };

describe("prix d'après les règles de liste de prix", () => {
  it("sans règle : prix de vente", () => {
    expect(prixPour([], 1, cible).prixHt).toBe(10000);
  });

  it("prix fixe et remise en % sur le prix de vente", () => {
    expect(prixPour([regle({ applied_on: "1_product", product_tmpl_id: [100, "x"], fixed_price: 80 })], 1, cible).prixHt).toBe(8000);
    expect(prixPour([regle({ compute_price: "discount", price_discount: 12.5 })], 1, cible).prixHt).toBe(8750);
  });

  it("portée : variante > modèle > catégorie (la plus précise) > globale", () => {
    const regles = [
      regle({ applied_on: "3_global", fixed_price: 50 }),
      regle({ applied_on: "2_product_category", categ_id: [1, "racine"], fixed_price: 60 }),
      regle({ applied_on: "2_product_category", categ_id: [5, "fille"], fixed_price: 70 }),
      regle({ applied_on: "1_product", product_tmpl_id: [100, "m"], fixed_price: 80 }),
      regle({ applied_on: "0_product_variant", product_id: [10, "v"], fixed_price: 90 }),
    ];
    expect(prixPour(regles, 1, cible).prixHt).toBe(9000);
    expect(prixPour(regles.slice(0, 4), 1, cible).prixHt).toBe(8000);
    expect(prixPour(regles.slice(0, 3), 1, cible).prixHt).toBe(7000);
    expect(prixPour(regles.slice(0, 2), 1, cible).prixHt).toBe(6000);
  });

  it("quantité minimale et paliers triés", () => {
    const regles = [
      regle({ applied_on: "1_product", product_tmpl_id: [100, "m"], min_quantity: 10, fixed_price: 90 }),
      regle({ applied_on: "1_product", product_tmpl_id: [100, "m"], min_quantity: 5, fixed_price: 95 }),
    ];
    expect(prixPour(regles, 1, cible, 1).prixHt).toBe(10000);
    expect(prixPour(regles, 1, cible, 7).prixHt).toBe(9500);
    expect(prixPour(regles, 1, cible, 12).prixHt).toBe(9000);
    expect(paliersPour(regles, 1, cible)).toEqual([{ quantiteMin: 5, prixHt: 9500 }, { quantiteMin: 10, prixHt: 9000 }]);
  });

  it("dates de validité et autre liste ignorées", () => {
    const regles = [
      regle({ fixed_price: 10, date_end: "2000-01-01 00:00:00" }),
      regle({ fixed_price: 20, pricelist_id: [2, "Autre"] }),
    ];
    expect(prixPour(regles, 1, cible).prixHt).toBe(10000);
    expect(prixPour(regles, 2, cible).prixHt).toBe(2000);
  });

  it("règle non gérée : ignorée et remontée", () => {
    const cout = regle({ compute_price: "discount", base: "standard_price", price_discount: 10 });
    expect(regleNonGeree(cout)).toContain("coût");
    expect(regleNonGeree(regle({ compute_price: "markup" }))).not.toBeNull();
    expect(regleNonGeree(regle({ compute_price: "discount", base: "pricelist" }))).not.toBeNull();
    expect(regleNonGeree(regle({ compute_price: "discount", price_round: 1 }))).not.toBeNull();
    const r = prixPour([cout], 1, cible);
    expect(r).toMatchObject({ prixHt: 10000, nonGeree: { id: cout.id } });
  });

  it("remise affichée", () => {
    const remise = prixPour([regle({ compute_price: "discount", price_discount: 15 })], 1, cible);
    expect(remisePourcent(remise, 10000)).toBe(15);
    expect(remisePourcent(prixPour([regle({ fixed_price: 75 })], 1, cible), 10000)).toBe(25);
    expect(remisePourcent(prixPour([], 1, cible), 10000)).toBeNull();
  });
});
