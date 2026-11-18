import { describe, expect, it } from "vitest";
import { cleObjet, verifierChemin, verifierPlage } from "@/connecteurs/stockage/chemins";

// F26 (T004) : validation commune des chemins et des plages.

describe("chemins du stockage", () => {
  it("accepte un chemin public et en déduit la clé d'objet", () => {
    expect(verifierChemin("/stockage/produits/ab12.png")).toBe("/stockage/produits/ab12.png");
    expect(cleObjet("/stockage/produits/ab12.png")).toBe("stockage/produits/ab12.png");
  });

  it.each(["", "/stockage/", "/autre/a.png", "stockage/a.png", "/stockage/../package.json", "/stockage/a/../b.png", "/stockage/a\\b.png", "/stockage/a//b.png", "/stockage/a\u0000.png", "/stockage/./a.png"])(
    "refuse %j",
    (chemin) => {
      expect(() => verifierChemin(chemin)).toThrow(expect.objectContaining({ code: "OPERATION_REFUSED" }));
    },
  );

  it("contrôle les plages", () => {
    expect(verifierPlage({ debut: 0, fin: 9 }, 10)).toEqual({ debut: 0, fin: 9 });
    for (const p of [{ debut: 5, fin: 4 }, { debut: -1, fin: 2 }, { debut: 0, fin: 10 }, { debut: 1.5, fin: 3 }]) {
      expect(() => verifierPlage(p, 10)).toThrow(expect.objectContaining({ code: "OPERATION_REFUSED" }));
    }
  });
});
