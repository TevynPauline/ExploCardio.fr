import { afterEach, describe, expect, it, vi } from "vitest";
import { analyserProduits, rapportMarkdown, type ProduitOdoo } from "../../scripts/odoo/analyse";
import { accesDepuisEnvironnement, creerClientLecture, ErreurOdoo } from "../../scripts/odoo/client-lecture";

// Test de connexion à Odoo (npm run odoo:sonder) : lecture seule garantie, clé jamais recopiée,
// écarts relevés avec ce dont le site a besoin. Aucun appel réseau réel ici.

const ACCES = { url: "https://odoo.exemple.test", base: "essai", utilisateur: "site@exemple.test", cleApi: "cle-secrete-de-test" };

function produit(p: Partial<ProduitOdoo>): ProduitOdoo {
  return {
    id: 1, nom: "Électrodes Holter", reference: "EC-ELEC-1", prixVente: 18, categorie: "Accessoires", nature: "bien", stocke: true, quantite: 10,
    vendable: true, unite: "Boîte", taxesIncluses: false, tauxTaxes: [20], modeleId: 1, nbVariantesDuModele: 1, description: true, ...p,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("client de lecture", () => {
  it("refuse toute méthode d'écriture avant l'envoi", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ result: 7 })));
    vi.stubGlobal("fetch", fetch);
    const odoo = creerClientLecture(ACCES);
    await odoo.connecter();
    for (const methode of ["create", "write", "unlink", "action_confirm"]) {
      await expect(odoo.lire("product.product", methode, [[]])).rejects.toThrow(/refusée/);
    }
    expect(fetch).toHaveBeenCalledTimes(1); // seulement l'authentification
  });

  it("ne recopie jamais la clé d'API dans un message d'erreur", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: { data: { message: `Accès refusé pour cle-secrete-de-test` } } }))));
    const erreur = await creerClientLecture(ACCES).connecter().catch((e: unknown) => e);
    expect(erreur).toBeInstanceOf(ErreurOdoo);
    expect((erreur as Error).message).not.toContain("cle-secrete-de-test");
  });

  it("exige les quatre variables et https", () => {
    expect(() => accesDepuisEnvironnement({ ODOO_URL: "https://x.test" })).toThrow(/ODOO_DATABASE, ODOO_USER, ODOO_API_KEY/);
    expect(() => accesDepuisEnvironnement({ ODOO_URL: "http://x.test", ODOO_DATABASE: "b", ODOO_USER: "u", ODOO_API_KEY: "k" })).toThrow(/https/);
  });
});

describe("analyse des produits", () => {
  it("relève références manquantes ou en double, prix nuls ou TTC, stock non suivi", () => {
    const { ecarts } = analyserProduits([
      produit({ id: 1 }),
      produit({ id: 2, reference: null }),
      produit({ id: 3, reference: "EC-ELEC-1" }),
      produit({ id: 4, reference: "EC-B", prixVente: 0 }),
      produit({ id: 5, reference: "EC-C", taxesIncluses: true }),
      produit({ id: 6, reference: "EC-D", stocke: false }),
      produit({ id: 7, reference: "EC-S", nature: "service", stocke: false }),
    ]);
    const sujets = Object.fromEntries(ecarts.map((e) => [e.sujet, e.produits.length]));
    expect(sujets).toMatchObject({ "Référence interne manquante": 1, "Référence interne en double": 2, "Prix de vente à 0": 1, "Prix saisi TTC": 1, "Stock non suivi": 1 });
  });

  it("le rapport indique les références de démonstration retrouvées", () => {
    const md = rapportMarkdown({
      date: new Date(), url: ACCES.url, base: "essai", version: "18.0", totalVariantes: 1, totalModeles: 1, produits: [produit({})],
      categories: [], modules: null, autres: [], referencesDuSite: ["EC-ELEC-1", "EC-AUTRE"],
    });
    expect(md).toContain("1 sur 2 : EC-ELEC-1");
    expect(md).toContain("Lecture seule");
    expect(md).not.toContain(ACCES.cleApi);
  });
});
