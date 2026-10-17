import { beforeAll, describe, expect, it } from "vitest";
import { creerRegistre } from "@/connecteurs/registre";
import type { ReferenceArticle } from "@/connecteurs/odoo/interfaces";
import { construireElements, type ElementIndex } from "@/domaine/recherche/index";
import { rechercherDans } from "@/domaine/recherche/classer";

// T045 (FR-011, FR-013, FR-014, SC-009) sur le catalogue de la base de démonstration.
describe("classement de la recherche", () => {
  let references: ReferenceArticle[];
  let elements: ElementIndex[];

  beforeAll(async () => {
    references = await creerRegistre(process.env).odoo().catalogue.listerReferences();
    // Tous les articles considérés comme publiés (la publication est testée par F03).
    elements = construireElements(references, new Map(references.map((r) => [r.defaultCode, `/fiche/${r.referenceArticle}`])));
  });

  it("SC-009 : chaque référence interne et fabricant, saisie exactement, arrive en première position (100 %)", () => {
    const echecs: string[] = [];
    for (const r of references) {
      for (const ref of [r.defaultCode, r.referenceFabricant].filter((x): x is string => Boolean(x))) {
        const premier = rechercherDans(elements, ref).groupes[0]?.elements[0];
        if (premier?.code !== r.defaultCode) echecs.push(ref);
      }
    }
    expect(echecs).toEqual([]);
  });

  it("la référence fabricant sans tirets donne le même premier résultat", () => {
    const premier = rechercherDans(elements, "98023922").groupes[0]?.elements[0];
    expect(premier?.code).toBe("EC-SUN-ORBIT-M");
    expect(premier?.correspondanceExacte).toBe(true);
  });

  it("groupe par type dans l'ordre prévu, omet les groupes vides, 8 éléments au plus", () => {
    const r = rechercherDans(elements, "dms");
    const types = r.groupes.map((g) => g.type);
    expect(types).toEqual(["produits", "consommables"].filter((t) => types.includes(t as never)));
    for (const g of r.groupes) expect(g.elements.length).toBeLessThanOrEqual(8);
    expect(r.groupes.every((g) => g.elements.length > 0)).toBe(true);
  });

  it("affiche les prix HT des articles et trouve les services du site", () => {
    const r = rechercherDans(elements, "oscar");
    expect(r.groupes[0]?.elements[0]?.prixHt).toBeGreaterThan(0);
    const services = rechercherDans(elements, "financement").groupes.find((g) => g.type === "services");
    expect(services?.elements.some((e) => e.destination === "/financement")).toBe(true);
  });

  it("moins de 2 caractères : aucun résultat ; aucun résultat : liste vide", () => {
    expect(rechercherDans(elements, "o").groupes).toEqual([]);
    expect(rechercherDans(elements, "zzzzqq").groupes).toEqual([]);
  });
});
