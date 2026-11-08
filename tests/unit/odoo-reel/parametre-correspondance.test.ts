import { describe, expect, it } from "vitest";
import { definition } from "@/domaine/parametres/catalogue";
import { valider, versSaisie } from "@/domaine/parametres/validation";
import { lireCorrespondance } from "@/connecteurs/odoo/real/correspondance";

// T021 (F14, R3) : paramètre « Rubrique de chaque catégorie Odoo ».

const p = definition("catalogue.correspondance_categories")!;
const saisie = (valeur: string) => (nom: string) => (nom === "valeur" ? valeur : "");

describe("paramètre de correspondance des catégories", () => {
  it("existe dans le thème Catalogue Odoo, avec le défaut proposé", () => {
    expect(p).toMatchObject({ theme: "catalogue", type: "correspondance" });
    expect(lireCorrespondance(p.defaut)).toEqual({ "Holter ECG": "holter-ecg", MAPA: "mapa", ERGOS: "effort", Consommables: "accessoires" });
  });

  it("accepte une ligne par catégorie et normalise le chemin", () => {
    const v = valider(p, saisie("Holter ECG = holter-ecg\nMAPA/Accessoires MAPA -> accessoires\n\nERGOS → effort"));
    expect(JSON.parse(v)).toEqual({ "Holter ECG": "holter-ecg", "MAPA / Accessoires MAPA": "accessoires", ERGOS: "effort" });
    expect(versSaisie(p, v).valeur).toBe("Holter ECG = holter-ecg\nMAPA / Accessoires MAPA = accessoires\nERGOS = effort");
  });

  it("refuse une rubrique inconnue, une ligne mal formée ou une catégorie en double", () => {
    expect(() => valider(p, saisie("Holter ECG = cardio"))).toThrow(/rubrique parmi/);
    expect(() => valider(p, saisie("Holter ECG"))).toThrow(/Catégorie Odoo = rubrique/);
    expect(() => valider(p, saisie("MAPA = mapa\nMAPA = accessoires"))).toThrow(/deux fois/);
  });
});
