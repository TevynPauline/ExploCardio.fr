import { describe, expect, it } from "vitest";
import { codePostalMetropole } from "@/domaine/comptes/adresses";

// T008 (FR-005) : livraison en France métropolitaine, Corse comprise.
describe("adresses de livraison", () => {
  it.each(["75001", "69003", "20000", "20200", "01000", "95880"])("accepte %s", (cp) => {
    expect(codePostalMetropole(cp)).toBe(true);
  });

  it.each(["97400", "97100", "98800", "7500", "ABCDE", "00100"])("refuse %s", (cp) => {
    expect(codePostalMetropole(cp)).toBe(false);
  });
});
