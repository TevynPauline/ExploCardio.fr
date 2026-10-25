import { describe, expect, it } from "vitest";
import { prixLigne, prixUnitaire, type Bareme } from "@/domaine/commande/prix-ligne";

// T019 — prix d'une ligne du panier en direct (F16, US5, FR-016).

const b = (x: Partial<Bareme> = {}): Bareme => ({ prixHt: 1000, paliers: [{ quantiteMin: 5, prixHt: 900 }, { quantiteMin: 10, prixHt: 800 }], prixClientHt: null, remisePourcent: 0, ...x });

describe("prix d'une ligne", () => {
  it("applique le palier atteint", () => {
    expect(prixLigne(b(), 1)).toBe(1000);
    expect(prixLigne(b(), 4)).toBe(4000);
    expect(prixLigne(b(), 5)).toBe(4500);
    expect(prixLigne(b(), 12)).toBe(9600);
  });
  it("garde le prix du client s'il est plus favorable que le palier", () => {
    expect(prixUnitaire(b({ prixClientHt: 850 }), 5)).toBe(850);
    expect(prixUnitaire(b({ prixClientHt: 850 }), 10)).toBe(800);
  });
  it("applique la remise en cours et arrondit au centime", () => {
    expect(prixLigne(b({ remisePourcent: 15 }), 3)).toBe(2550);
    expect(prixLigne(b({ prixHt: 333, paliers: [], remisePourcent: 10 }), 1)).toBe(300);
  });
  it("quantité vide, nulle ou décimale : pas de prix", () => {
    expect(prixLigne(b(), 0)).toBeNull();
    expect(prixLigne(b(), Number.NaN)).toBeNull();
    expect(prixLigne(b(), 1.5)).toBeNull();
  });
});
