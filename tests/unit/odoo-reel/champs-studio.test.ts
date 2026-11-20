import { describe, expect, it } from "vitest";
import { odooReelDeTest, jeuOdoo } from "./jeu-odoo";

// Vraie base au 2026-11-20 : catégories rangées sous « All », Marque / Type d'article / A publier
// en vrais champs de la fiche produit (Studio), et non plus en propriétés de catégorie.

type Ligne = Record<string, unknown> & { id: number };

function baseReelle() {
  const d = jeuOdoo() as Record<string, Ligne[]>;
  // Racine « All » au-dessus de toutes les catégories.
  d["product.category"]!.push({ id: 99, name: "All", complete_name: "All", parent_id: false });
  for (const c of d["product.category"]!) {
    if (c.id === 99) continue;
    if (!c.parent_id) c.parent_id = [99, "All"];
    c.complete_name = `All / ${c.complete_name}`;
  }
  for (const t of d["product.template"]!) {
    const c = d["product.category"]!.find((x) => x.id === (t.categ_id as [number, string])[0])!;
    t.categ_id = [c.id, c.complete_name];
  }
  d["ir.model.fields"] = [
    { id: 1, model: "product.template", name: "x_studio_marque", field_description: "Marque", ttype: "selection" },
    { id: 2, model: "product.template", name: "x_studio_selection_3", field_description: "Type d'article", ttype: "selection" },
    { id: 3, model: "product.template", name: "x_studio_a_publier", field_description: "A publier", ttype: "boolean" },
    { id: 4, model: "product.template", name: "x_studio_selection_1", field_description: "Nouveau Sélection", ttype: "selection" },
  ];
  const tpl = (id: number) => d["product.template"]!.find((t) => t.id === id)!;
  for (const t of d["product.template"]!) Object.assign(t, { x_studio_marque: false, x_studio_selection_3: false, x_studio_a_publier: false });
  // DMS 300-4L : publié ; les champs l'emportent sur les propriétés.
  Object.assign(tpl(7), { x_studio_marque: "DMSoftware", x_studio_selection_3: "Equipement", x_studio_a_publier: true });
  // DMS 300-3A : non coché (pièce d'un kit) → ignoré, même complet.
  // Oscar 2 : type manquant en propriété, renseigné par le champ.
  Object.assign(tpl(8), { x_studio_marque: "Suntech", x_studio_selection_3: "Equipement", x_studio_a_publier: true });
  // Brassard : type au pluriel.
  Object.assign(tpl(11), { x_studio_marque: "Suntech", x_studio_selection_3: "Accessoires", x_studio_a_publier: true });
  // Table ULKE : frais sous les libellés saisis par Régis.
  Object.assign(tpl(6), {
    x_studio_marque: "Koch Evolution", x_studio_selection_3: "Equipement", x_studio_a_publier: true,
    product_properties: [
      { string: "Livraison spéciale", type: "float", value: 600 },
      { string: "Frais d'installation", type: "float", value: 600 },
    ],
  });
  // Coché mais sans marque : anomalie bloquante, comme avant.
  Object.assign(tpl(12), { x_studio_selection_3: "Accessoire", x_studio_a_publier: true });
  return d;
}

describe("vraie base : champs Studio et catégorie racine « All »", () => {
  it("« All » en tête du chemin est ignoré : mêmes rubriques et sous-catégories", async () => {
    const { odoo } = odooReelDeTest(baseReelle());
    const c = await odoo.catalogue.listerCategories();
    expect(c.filter((x) => x.niveau > 0).map((x) => x.code)).toEqual(["accessoires/protecteurs-de-brassards", "mapa/accessoires-mapa"]);
    expect((await odoo.catalogue.lireArticle("98-0239-01")).categorie).toBe("mapa");
  });

  it("seuls les produits cochés « A publier » sont lus ; Marque et Type viennent des champs", async () => {
    const { odoo } = odooReelDeTest(baseReelle());
    const refs = (await odoo.catalogue.listerReferences()).map((r) => r.defaultCode);
    expect(refs).toContain("DMS 300-4L10B");
    expect(refs).not.toContain("DMS 300-3A4B"); // non coché
    expect(refs).toContain("99-0133-00"); // type venu du champ
    const l4 = (await odoo.catalogue.listerArticles("holter-ecg"))[0]!;
    expect(l4).toMatchObject({ nom: "Holter ECG DMS 300-4L", marque: "DMSoftware", type: "equipement" });
    expect((await odoo.catalogue.lireArticle("98-0239-01")).type).toBe("accessoire");
  });

  it("frais de la table ULKE lus sous « Livraison spéciale » et « Frais d'installation »", async () => {
    const { odoo } = odooReelDeTest(baseReelle());
    const devis = await odoo.commandes.calculerDevis({ partenaireRef: null, lignes: [{ defaultCode: "ULKE", formule: "achat", quantite: 1 }] }).catch((e) => e);
    // Sans produit « Livraison » dans ce jeu : refus explicite ; les frais sont vérifiés au contrôle.
    expect(devis).toMatchObject({ code: "OPERATION_REFUSED" });
    const anomalies = await odoo.catalogue.controlerDonnees();
    expect(anomalies.filter((a) => a.reference === "ULKE")).toEqual([]);
  });

  it("contrôle : un produit non coché n'est jamais signalé ; un produit coché incomplet l'est", async () => {
    const { odoo } = odooReelDeTest(baseReelle());
    const anomalies = await odoo.catalogue.controlerDonnees();
    expect(anomalies.some((a) => a.nom === "Holter ECG DMS 300-3A")).toBe(false);
    expect(anomalies.some((a) => a.code === "CATEGORIE_NON_RELIEE")).toBe(false);
    expect(anomalies.find((a) => a.reference === "TX-ADAPT" || a.nom.startsWith("Adaptateur"))).toMatchObject({ code: "PROPRIETE_MANQUANTE", detail: "Marque" });
  });
});
