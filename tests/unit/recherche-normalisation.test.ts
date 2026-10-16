import { describe, expect, it } from "vitest";
import { normaliserReference, normaliserTexte } from "@/domaine/recherche/normaliser";

// T044 (FR-012) : casse, accents, tirets, points, espaces et barres obliques ignorés.
describe("normalisation de la recherche", () => {
  it.each(["98-0239-22", "98 0239 22", "98023922", "98.0239.22", "98/0239/22"])("référence « %s »", (saisie) => {
    expect(normaliserReference(saisie)).toBe("98023922");
  });

  it("ignore accents et casse dans le texte", () => {
    expect(normaliserTexte("Électrode")).toBe(normaliserTexte("ELECTRODE"));
    expect(normaliserTexte("Épreuve d'effort")).toBe("epreuve d'effort");
  });

  it("traite les tirets du texte comme des espaces", () => {
    expect(normaliserTexte("Mobil-O-Graph")).toBe("mobil o graph");
  });
});
