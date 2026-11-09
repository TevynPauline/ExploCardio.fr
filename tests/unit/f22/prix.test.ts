import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { montantsAffiches, prixTexte, prixTtc } from "@/domaine/catalogue/prix";
import { euros } from "@/lib/montants";
import { Prix } from "@/ui/catalogue/Prix";

// T002, T004 — règle d'affichage des prix (F22, constitution 2.3.0) : TTC d'abord, HT dessous.

const norm = (t: string) => t.replace(/\s+/g, " ").trim();
const texte = (html: string) => norm(html.replace(/<[^>]+>/g, ""));

describe("montantsAffiches", () => {
  it("calcule le TTC avec le taux de l'article, arrondi au centime", () => {
    expect(montantsAffiches({ ht: 199000, tauxTva: 20 })).toEqual({ ttc: 238800, ht: 199000 });
    expect(montantsAffiches({ ht: 1, tauxTva: 20 })).toEqual({ ttc: 1, ht: 1 });
    expect(montantsAffiches({ ht: 3, tauxTva: 20 })).toEqual({ ttc: 4, ht: 3 });
  });

  it("reprend tel quel un TTC déjà calculé (totaux, commandes, factures)", () => {
    expect(montantsAffiches({ ht: 1000, ttc: 1199 })).toEqual({ ttc: 1199, ht: 1000 });
  });
});

describe("prixTexte", () => {
  it("TTC d'abord, HT entre parenthèses", () => {
    expect(prixTexte({ ht: 199000, tauxTva: 20 })).toBe(`${euros(238800)} TTC (soit ${euros(199000)} HT)`);
  });

  it("« à partir de » devant, période après chacun des deux montants", () => {
    expect(prixTexte({ ht: 5000, tauxTva: 20 }, { aPartirDe: true, periode: "/ mois" })).toBe(
      `À partir de ${euros(6000)} TTC / mois (soit ${euros(5000)} HT / mois)`,
    );
  });

  it("montant nul : « Offert »", () => {
    expect(prixTexte({ ht: 0, tauxTva: 20 })).toBe("Offert");
  });
});

describe("composant Prix", () => {
  const rendu = (props: Parameters<typeof Prix>[0]) => renderToStaticMarkup(createElement(Prix, props));

  it("TTC en Semibold d'abord, HT juste en dessous en petit et atténué, dans un seul paragraphe", () => {
    const html = rendu({ ht: 199000, tauxTva: 20 });
    expect(html.match(/<p\b/g)).toHaveLength(1);
    expect(html).toMatch(/<span class="[^"]*font-semibold[^"]*">[^<]*TTC<\/span>\s*<span class="[^"]*text-small[^"]*text-muted[^"]*">soit [^<]* HT<\/span>/);
    expect(texte(html)).toBe(norm(`${euros(238800)} TTC soit ${euros(199000)} HT`));
  });

  it("grande taille, « à partir de » et période", () => {
    const html = rendu({ ht: 5000, tauxTva: 20, aPartirDe: true, periode: "/ mois", taille: "grand" });
    expect(html).toContain("text-h2");
    expect(texte(html)).toBe(norm(`À partir de ${euros(6000)} TTC / mois soit ${euros(5000)} HT / mois`));
  });

  it("montants déjà calculés : pas de recalcul", () => {
    expect(texte(rendu({ ht: 1000, ttc: 1199 }))).toBe(norm(`${euros(1199)} TTC soit ${euros(1000)} HT`));
  });

  it("montant nul : « Offert », sans ligne HT", () => {
    expect(texte(rendu({ ht: 0, tauxTva: 20 }))).toBe("Offert");
  });

  it("taux par défaut 20 % si absent", () => {
    expect(texte(rendu({ ht: 100 } as Parameters<typeof Prix>[0]))).toContain(norm(`${euros(prixTtc(100, 20))} TTC`));
  });
});
