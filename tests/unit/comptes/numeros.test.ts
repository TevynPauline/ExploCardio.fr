import { describe, expect, it } from "vitest";
import { normaliserNumero, rppsValide, siretValide } from "@/domaine/comptes/numeros";

// T007 (FR-003) : RPPS de 11 chiffres ; SIRET de 14 chiffres à clé de Luhn (exception La Poste).
describe("numéros RPPS et SIRET", () => {
  it.each(["10001234567", "99000000101", "100 012 345 67"])("RPPS valide : %s", (n) => {
    expect(rppsValide(n)).toBe(true);
  });

  it.each(["1000123456", "100012345678", "1000123456A", ""])("RPPS refusé : « %s »", (n) => {
    expect(rppsValide(n)).toBe(false);
  });

  it.each(["73282932000074", "732 829 320 00074", "35600000000060"])("SIRET valide : %s", (n) => {
    expect(siretValide(n)).toBe(true);
  });

  it.each(["73282932000075", "7328293200007", "ABCDEFGHIJKLMN", "00000000000001"])("SIRET refusé : %s", (n) => {
    expect(siretValide(n)).toBe(false);
  });

  it("retire espaces et séparateurs", () => {
    expect(normaliserNumero(" 732 829-320.00074 ")).toBe("73282932000074");
  });
});
