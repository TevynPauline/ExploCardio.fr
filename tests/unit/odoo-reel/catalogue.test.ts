import { describe, expect, it } from "vitest";
import { odooReelDeTest } from "./jeu-odoo";

// T015 (F14, contracts/odoo-reel.md) : catalogue réel assemblé depuis les réponses d'Odoo 20.

describe("catalogue en mode réel", () => {
  it("renvoie les cinq rubriques du site, sans marque fictive", async () => {
    const { odoo } = odooReelDeTest();
    const c = await odoo.catalogue.listerCategories();
    expect(c.map((x) => x.code)).toEqual(["holter-ecg", "mapa", "effort", "ecg-repos", "accessoires"]);
    expect(c.every((x) => !x.estFictif && x.parentCode === null)).toBe(true);
  });

  it("liste les articles affichables d'une rubrique : référence = première variante, prix à partir de", async () => {
    const { odoo } = odooReelDeTest();
    const articles = await odoo.catalogue.listerArticles("holter-ecg");
    expect(articles.map((a) => a.nom)).toEqual(["Holter ECG DMS 300-3A", "Holter ECG DMS 300-4L"]);
    const l4 = articles.find((a) => a.nom.endsWith("4L"))!;
    expect(l4).toMatchObject({
      reference: "DMS 300-4L10B",
      marque: "DMS",
      type: "equipement",
      categorie: "holter-ecg",
      prixAPartirDeHt: 220500,
      formules: ["achat", "mise_a_disposition"],
      disponibilite: { etat: "disponible" },
      referenceFictive: false,
      prixInvente: false,
      estFictif: false,
    });
    // Offre incomplète : pas de mise à disposition.
    expect(articles.find((a) => a.nom.endsWith("3A"))!.formules).toEqual(["achat"]);
  });

  it("filtre par marque, type et disponibilité", async () => {
    const { odoo } = odooReelDeTest();
    expect(await odoo.catalogue.listerArticles("mapa", { marque: "SunTech" })).toHaveLength(1);
    expect(await odoo.catalogue.listerArticles("mapa", { type: "equipement" })).toHaveLength(0);
    expect((await odoo.catalogue.listerArticles("holter-ecg", { disponibilite: "disponible" })).map((a) => a.reference)).toEqual(["DMS 300-4L10B"]);
  });

  it("exclut les articles incomplets et les produits hors du site", async () => {
    const { odoo } = odooReelDeTest();
    const refs = (await odoo.catalogue.listerReferences()).map((r) => r.defaultCode);
    expect(refs).not.toContain("99-0133-00"); // type manquant
    expect(refs).not.toContain("ULKE"); // aucune propriété
    expect(refs).not.toContain("SANI-CUFF"); // sans TVA
    expect(refs).not.toContain("98-0239-22"); // référence en double
    expect(refs.some((r) => /gift|wallet/i.test(r))).toBe(false);
    await expect(odoo.catalogue.lireArticle("ULKE")).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(odoo.catalogue.lireArticle("INCONNUE")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("lit un article : variantes, configuration, TVA, offre, paliers", async () => {
    const { odoo } = odooReelDeTest();
    const a = await odoo.catalogue.lireArticle("DMS 300-4L5B");
    expect(a).toMatchObject({ reference: "DMS 300-4L10B", suiviNumeroSerie: true, compatibleAvec: [], baremeFinancement: [] });
    const v = a.variantes.find((x) => x.defaultCode === "DMS 300-4L5B")!;
    expect(v).toMatchObject({
      configuration: "HDMI 5 brins",
      attributs: { "Type de câble": "HDMI 5 brins" },
      prixHt: 220500,
      tauxTva: 20,
      quantiteParLot: 1,
      offreMiseADisposition: { premierMoisHt: 8900, moisSuivantsHt: 6900, valeurRemplacementHt: 180000 },
      composants: [],
      logicielInclus: null,
      prixInvente: false,
    });
    const brassard = await odoo.catalogue.lireArticle("98-0239-01");
    expect(brassard.variantes.map((x) => x.defaultCode)).not.toContain("98-0239-22");
    expect(brassard.variantes[0]!.paliers).toEqual([{ quantiteMin: 5, prixHt: 15000 }]);
    expect(brassard.variantes[0]!.configuration).toMatch(/Taille .*, Raccord/);
  });

  it("prix client : liste du partenaire, remise affichée ; partenaire inconnu → NotFound", async () => {
    const { odoo } = odooReelDeTest();
    const [p] = await odoo.catalogue.lirePrixClient("C-A", ["DMS 300-4L4B"]);
    expect(p).toEqual({ defaultCode: "DMS 300-4L4B", prixCatalogueHt: 220500, prixHt: 198450, remisePourcent: 10, mensualitesForcees: [] });
    const [b] = await odoo.catalogue.lirePrixClient("C-B", ["DMS 300-4L4B"]);
    expect(b).toMatchObject({ prixHt: 220500, remisePourcent: null });
    await expect(odoo.catalogue.lirePrixClient("INCONNU", ["DMS 300-4L4B"])).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(odoo.catalogue.lirePrixClient("C-A", ["ULKE"])).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("recherche sur le nom, la référence et la marque, sans accents ni casse", async () => {
    const { odoo } = odooReelDeTest();
    expect((await odoo.catalogue.rechercher("dms 300-4l")).map((a) => a.reference)).toEqual(["DMS 300-4L10B"]);
    expect((await odoo.catalogue.rechercher("suntech")).length).toBe(1);
    expect(await odoo.catalogue.rechercher("  ")).toEqual([]);
  });

  it("une seule lecture groupée pour plusieurs appels rapprochés", async () => {
    const { odoo, faux } = odooReelDeTest();
    await odoo.catalogue.listerArticles("holter-ecg");
    const n = faux.appels.length;
    await odoo.catalogue.lireArticle("DMS 300-4L4B");
    await odoo.stock.lireDisponibilite(["DMS 300-4L4B"]);
    expect(faux.appels.length).toBe(n);
  });
});
