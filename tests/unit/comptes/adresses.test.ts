import { describe, expect, it } from "vitest";
import { codePostalLivrable } from "@/domaine/comptes/adresses";

// T008 (FR-005) : livraison en France métropolitaine ; F18 (FR-001) : hors Corse.
describe("adresses de livraison", () => {
  it.each(["75001", "69003", "01000", "95880"])("accepte %s", (cp) => {
    expect(codePostalLivrable(cp)).toBe(true);
  });

  it.each(["20000", "20200", "97400", "97100", "98800", "7500", "ABCDE", "00100"])("refuse %s", (cp) => {
    expect(codePostalLivrable(cp)).toBe(false);
  });
});
