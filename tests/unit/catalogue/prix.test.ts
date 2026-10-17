import { describe, expect, it } from "vitest";
import { mensualites, prixPourQuantite, prixTtc } from "@/domaine/catalogue/prix";

// T008 — prix TTC, mensualités de financement, prix dégressifs (FR-016, FR-022, FR-023, FR-027, FR-046).

describe("prixTtc", () => {
  it("applique le taux de TVA de la variante, arrondi au centime", () => {
    expect(prixTtc(129000, 20)).toBe(154800);
    expect(prixTtc(1999, 20)).toBe(2399); // 23,988 → 23,99
    expect(prixTtc(1000, 5.5)).toBe(1055);
    expect(prixTtc(1000, 0)).toBe(1000);
  });
});

describe("mensualites", () => {
  const bareme = [
    { dureeMois: 24, coefficientPourcent: 4.48 },
    { dureeMois: 36, coefficientPourcent: 3.08 },
  ];

  it("calcule prix × coefficient pour chaque durée du barème", () => {
    expect(mensualites({ prixHt: 189000, mensualitesForcees: [] }, bareme)).toEqual([
      { dureeMois: 24, montantHt: 8467, source: "calcul" },
      { dureeMois: 36, montantHt: 5821, source: "calcul" },
    ]);
  });

  it("un montant forcé pour tous remplace le calcul sur sa durée", () => {
    const r = mensualites({ prixHt: 189000, mensualitesForcees: [{ dureeMois: 36, montantHt: 5500 }] }, bareme);
    expect(r[1]).toEqual({ dureeMois: 36, montantHt: 5500, source: "general" });
    expect(r[0]!.source).toBe("calcul");
  });

  it("le montant forcé pour le client prime sur le montant général (FR-046)", () => {
    const r = mensualites(
      { prixHt: 189000, mensualitesForcees: [{ dureeMois: 36, montantHt: 5500 }] },
      bareme,
      [{ dureeMois: 36, montantHt: 4900 }],
    );
    expect(r[1]).toEqual({ dureeMois: 36, montantHt: 4900, source: "client" });
  });

  it("ignore un montant forcé dont la durée n'est pas au barème", () => {
    const r = mensualites({ prixHt: 100000, mensualitesForcees: [{ dureeMois: 72, montantHt: 1 }] }, bareme);
    expect(r.map((m) => m.dureeMois)).toEqual([24, 36]);
  });
});

describe("prixPourQuantite", () => {
  const boite = { prixHt: 1800, quantiteParLot: 50, paliers: [{ quantiteMin: 5, prixHt: 1650 }, { quantiteMin: 10, prixHt: 1500 }] };

  it("applique le prix de base sous le premier palier", () => {
    expect(prixPourQuantite(boite, 4)).toEqual({ prixLotHt: 1800, prixUnitaireHt: 36, totalHt: 7200, palier: null });
  });

  it("applique le palier atteint", () => {
    expect(prixPourQuantite(boite, 5)).toMatchObject({ prixLotHt: 1650, totalHt: 8250, palier: { quantiteMin: 5, prixHt: 1650 } });
    expect(prixPourQuantite(boite, 12)).toMatchObject({ prixLotHt: 1500, prixUnitaireHt: 30, totalHt: 18000 });
  });

  it("donne le prix à l'unité d'un conditionnement (prix du lot ÷ quantité par lot)", () => {
    expect(prixPourQuantite({ prixHt: 16000, quantiteParLot: 500, paliers: [] }, 1).prixUnitaireHt).toBe(32);
  });

  it("refuse une quantité inférieure à 1", () => {
    expect(() => prixPourQuantite(boite, 0)).toThrow();
  });
});
