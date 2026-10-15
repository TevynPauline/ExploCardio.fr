import { describe, expect, it } from "vitest";
import { PALIERS_PAR_DEFAUT, tauxDuPalier } from "@/connecteurs/odoo/demo/fidelite";

// Bornes des paliers de F06 : 500 € donne 5 %, 1 000 € reste à 5 %, au-delà 10 %.
describe("paliers de la cagnotte (F06)", () => {
  it.each([
    [49_999, 0],
    [50_000, 5],
    [80_000, 5],
    [100_000, 5],
    [100_001, 10],
    [120_000, 10],
  ])("%i centimes éligibles → %i %%", (montant, taux) => {
    expect(tauxDuPalier(PALIERS_PAR_DEFAUT, montant)).toBe(taux);
  });
});
