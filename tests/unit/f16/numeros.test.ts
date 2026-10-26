import { describe, expect, it } from "vitest";
import { siretOuSirenValide, sirenValide } from "@/domaine/comptes/numeros";

// T026 — SIRET ou SIREN (F16, FR-023) : longueur et clé de contrôle.

describe("numéro d'entreprise", () => {
  it("SIREN valide (9 chiffres, clé de Luhn), espaces tolérés", () => {
    expect(sirenValide("732 829 320")).toBe(true);
    expect(siretOuSirenValide("732829320")).toBe(true);
    expect(sirenValide("732829321")).toBe(false);
    expect(sirenValide("000000000")).toBe(false);
  });
  it("SIRET valide (14 chiffres), La Poste comprise", () => {
    expect(siretOuSirenValide("732 829 320 00074")).toBe(true);
    expect(siretOuSirenValide("73282932000075")).toBe(false);
    expect(siretOuSirenValide("35600000000001")).toBe(true);
  });
  it("autres longueurs refusées (dont l'ancien RPPS à 11 chiffres)", () => {
    expect(siretOuSirenValide("12345678")).toBe(false);
    expect(siretOuSirenValide("10003456789")).toBe(false);
    expect(siretOuSirenValide("")).toBe(false);
  });
});
