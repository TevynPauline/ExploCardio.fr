import { describe, expect, it } from "vitest";
import { CORRESPONDANCE_PAR_DEFAUT, lireCorrespondance, rubriqueDe } from "@/connecteurs/odoo/real/correspondance";

// T012 (F14, R3) : catégories Odoo → rubriques du site.

describe("correspondance des catégories", () => {
  it("défaut proposé", () => {
    expect(CORRESPONDANCE_PAR_DEFAUT).toEqual({ "Holter ECG": "holter-ecg", MAPA: "mapa", ERGOS: "effort", Consommables: "accessoires" });
  });

  it("une catégorie inclut ses sous-catégories", () => {
    expect(rubriqueDe("MAPA / Accessoires MAPA", CORRESPONDANCE_PAR_DEFAUT)).toBe("mapa");
    expect(rubriqueDe("Consommables / Protecteurs de brassards", CORRESPONDANCE_PAR_DEFAUT)).toBe("accessoires");
  });

  it("la plus précise l'emporte", () => {
    const c = { MAPA: "mapa", "MAPA / Accessoires MAPA": "accessoires" };
    expect(rubriqueDe("MAPA / Accessoires MAPA", c)).toBe("accessoires");
    expect(rubriqueDe("MAPA", c)).toBe("mapa");
  });

  it("insensible à la casse et aux accents ; une catégorie au nom voisin ne correspond pas", () => {
    expect(rubriqueDe("holter ecg", CORRESPONDANCE_PAR_DEFAUT)).toBe("holter-ecg");
    expect(rubriqueDe("MAPA Pro", CORRESPONDANCE_PAR_DEFAUT)).toBeNull();
  });

  it("catégorie non reliée : null", () => {
    expect(rubriqueDe("Services", CORRESPONDANCE_PAR_DEFAUT)).toBeNull();
  });

  it("lecture du paramètre : code inconnu ignoré, valeur illisible → défaut", () => {
    expect(lireCorrespondance('{"ECG":"ecg-repos","X":"inconnu"}')).toEqual({ ECG: "ecg-repos" });
    expect(lireCorrespondance("pas du json")).toEqual(CORRESPONDANCE_PAR_DEFAUT);
    expect(lireCorrespondance(null)).toEqual(CORRESPONDANCE_PAR_DEFAUT);
  });
});
