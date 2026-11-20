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

  it("catégorie racine « All » facultative, dans Odoo comme dans le paramètre", () => {
    expect(rubriqueDe("All / MAPA / Accessoires MAPA", CORRESPONDANCE_PAR_DEFAUT)).toBe("mapa");
    expect(rubriqueDe("All / MAPA", { "All / MAPA": "mapa" })).toBe("mapa");
    expect(rubriqueDe("All / ECG / ECG de repos", { "ECG / ECG de repos": "ecg-repos" })).toBe("ecg-repos");
    expect(rubriqueDe("All / MAPA / Accessoires MAPA", { "All / MAPA": "mapa", "MAPA / Accessoires MAPA": "accessoires" })).toBe("accessoires");
    expect(rubriqueDe("All", CORRESPONDANCE_PAR_DEFAUT)).toBeNull();
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

describe("codes des sous-catégories (F27)", () => {
  it("rubrique seule, puis segments sans accents ni ponctuation", async () => {
    const { codeCategorie } = await import("@/connecteurs/odoo/categories");
    expect(codeCategorie("holter-ecg", [])).toBe("holter-ecg");
    expect(codeCategorie("holter-ecg", ["Accessoires Holter ECG", "Câbles pour Holter ECG"])).toBe("holter-ecg/accessoires-holter-ecg/cables-pour-holter-ecg");
    expect(codeCategorie("effort", ["Épreuve d'effort / écho"])).toBe("effort/epreuve-d-effort-echo");
  });

  it("au-delà du niveau 2, rattaché à l'ancêtre de niveau 2", async () => {
    const { codeCategorie } = await import("@/connecteurs/odoo/categories");
    expect(codeCategorie("mapa", ["A", "B", "C", "D"])).toBe("mapa/a/b");
  });

  it("profondeur de la catégorie reliée", async () => {
    const { rattachementDe } = await import("@/connecteurs/odoo/real/correspondance");
    expect(rattachementDe("MAPA / Accessoires MAPA / Sacoches pour MAPA", CORRESPONDANCE_PAR_DEFAUT)).toEqual({ code: "mapa", profondeur: 1 });
    expect(rattachementDe("Services", CORRESPONDANCE_PAR_DEFAUT)).toBeNull();
  });
});
