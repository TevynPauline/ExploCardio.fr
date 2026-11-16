import { expect, it } from "vitest";
import { suiteDeContrat } from "../harness";
import { itDemo } from "./outils";

// F27 (contracts/odoo-catalogue.md) : arbre des catégories et articles par sous-niveau, communs
// aux deux modes du connecteur.

const TECHNIQUES = ["Frais d'importation", "Logistique", "Transports In", "Services", "Expenses", "Goods", "Produits", "Holter"];

suiteDeContrat("odoo", "catalogue — arbre des catégories (F27)", ({ registre }) => {
  const catalogue = () => registre.odoo().catalogue;

  it("les cinq rubriques d'abord, au niveau 0, dans l'ordre fixe", async () => {
    const categories = await catalogue().listerCategories();
    const rubriques = categories.filter((c) => c.niveau === 0);
    expect(rubriques.map((c) => c.code)).toEqual(["holter-ecg", "mapa", "effort", "ecg-repos", "accessoires"]);
    expect(categories.slice(0, 5)).toEqual(rubriques);
    for (const r of rubriques) expect(r).toMatchObject({ parentCode: null, rubrique: r.code });
  });

  it("codes uniques ; chaque sous-catégorie a un parent connu de la même rubrique, au niveau inférieur", async () => {
    const categories = await catalogue().listerCategories();
    const parCode = new Map(categories.map((c) => [c.code, c]));
    expect(parCode.size).toBe(categories.length);
    for (const c of categories.filter((x) => x.niveau > 0)) {
      const parent = parCode.get(c.parentCode!);
      expect(parent, c.code).toBeDefined();
      expect(parent!.niveau).toBe(c.niveau - 1);
      expect(c.rubrique).toBe(parent!.rubrique);
      expect(c.code.startsWith(`${c.rubrique}/`)).toBe(true);
    }
  });

  it("« Câbles pour Holter ECG » est sous « Accessoires Holter ECG », sous Holter ECG", async () => {
    const categories = await catalogue().listerCategories();
    const cables = categories.find((c) => c.nom === "Câbles pour Holter ECG");
    expect(cables).toMatchObject({ niveau: 2, rubrique: "holter-ecg" });
    const accessoires = categories.find((c) => c.code === cables!.parentCode);
    expect(accessoires).toMatchObject({ nom: "Accessoires Holter ECG", niveau: 1, parentCode: "holter-ecg" });
  });

  it("aucune catégorie technique d'Odoo", async () => {
    const noms = (await catalogue().listerCategories()).filter((c) => c.niveau > 0).map((c) => c.nom);
    for (const t of TECHNIQUES) expect(noms).not.toContain(t);
  });

  it("une rubrique liste aussi les articles de ses sous-catégories ; une sous-catégorie, seulement les siens", async () => {
    const categories = await catalogue().listerCategories();
    const cables = categories.find((c) => c.nom === "Câbles pour Holter ECG")!;
    const tous = await catalogue().listerArticles("holter-ecg");
    const seuls = await catalogue().listerArticles(cables.code);
    expect(seuls.length).toBeGreaterThan(0);
    expect(seuls.every((a) => a.categorieDetail === cables.code && a.categorie === "holter-ecg")).toBe(true);
    for (const a of seuls) expect(tous.map((x) => x.reference)).toContain(a.reference);
    expect(await catalogue().listerArticles("holter-ecg/inconnue")).toEqual([]);
  });

  it("categorieDetail identique dans la liste, la fiche et les références", async () => {
    const [a] = await catalogue().listerArticles((await catalogue().listerCategories()).find((c) => c.nom === "Câbles pour Holter ECG")!.code);
    const fiche = await catalogue().lireArticle(a!.reference);
    expect(fiche.categorieDetail).toBe(a!.categorieDetail);
    const ref = (await catalogue().listerReferences()).find((r) => r.referenceArticle === a!.reference);
    expect(ref?.categorieDetail).toBe(a!.categorieDetail);
  });

  itDemo("un consommable rangé dans sa famille garde le type « consommable »", async () => {
    const mapa = await catalogue().listerArticles("mapa", { type: "consommable" });
    expect(mapa.map((a) => a.nom)).toContain("Brassard MAPA Orbit");
  });
});
