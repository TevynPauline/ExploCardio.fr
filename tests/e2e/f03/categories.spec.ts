import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { CATEGORIES, requete, slugsPublies } from "./outils";

// T014 (US1, FR-005 à FR-007, SC-004).

test("cartes d'une catégorie : marque, nom, prix HT et TTC, location, disponibilité", async ({ page }) => {
  await page.goto("/holter-tensionnel");
  await verifierAccessibilite(page);
  const cartes = page.locator("main article");
  expect(await cartes.count()).toBeGreaterThan(2);
  const oscar = cartes.filter({ hasText: "Oscar 2" }).first();
  await expect(oscar).toContainText("SunTech");
  await expect(oscar).toContainText(/€ HT/);
  await expect(oscar).toContainText(/€ TTC/);
  await expect(oscar).toContainText("Disponible en location");
  await expect(cartes.filter({ hasText: "Mobil-O-Graph" })).toContainText("Indisponible");
  await expect(page.locator("main")).not.toContainText(/prix sur demande/i);
});

test("filtres combinables, résultat annoncé, filtres retirables ; aucun résultat", async ({ page }) => {
  await page.goto("/holter-tensionnel");
  const statut = page.locator("main").getByRole("status");
  const total = Number((await statut.innerText()).match(/\d+/)![0]);
  await page.locator("main").getByLabel("Marque", { exact: true }).selectOption("SunTech");
  await expect(page).toHaveURL(/marque=SunTech/);
  await expect(statut).not.toHaveText(new RegExp(`^${total} `));
  const cartes = page.locator("main article");
  for (const texte of await cartes.allInnerTexts()) expect(texte).toContain("SunTech");
  await page.locator("main").getByLabel("Disponibilité", { exact: true }).selectOption("disponible");
  await expect(page).toHaveURL(/dispo=disponible/);
  await expect(page.getByRole("link", { name: /Retirer le filtre Marque : SunTech/ })).toBeVisible();
  await page.getByRole("link", { name: "Tout retirer" }).click();
  await expect(page).toHaveURL(/\/holter-tensionnel$/);
  await expect(statut).toHaveText(new RegExp(`^${total} `));

  await page.goto("/holter-tensionnel?marque=SunTech&dispo=indisponible");
  await expect(page.getByText("Aucun produit ne correspond à ces filtres.")).toBeVisible();
  await page.getByRole("link", { name: "Retirer les filtres" }).click();
  await expect(page).toHaveURL(/\/holter-tensionnel$/);
});

test("filtres dans l'adresse : fonctionnent sans JavaScript", async ({ browser, baseURL }) => {
  const contexte = await browser.newContext({ baseURL, javaScriptEnabled: false, storageState: "playwright/.auth/acces-demo.json" });
  const page = await contexte.newPage();
  await page.goto("/accessoires-consommables?type=brassards");
  const noms = await page.locator("main article h3").allInnerTexts();
  expect(noms.length).toBeGreaterThan(0);
  expect(noms.every((n) => /Brassard/.test(n))).toBe(true);
  await page.locator("main").getByLabel("Type", { exact: true }).selectOption("electrodes");
  await page.getByRole("button", { name: "Appliquer" }).click();
  await expect(page).toHaveURL(/type=electrodes/);
  await contexte.close();
});

test("une carte mène à la fiche ; tri par prix", async ({ page }) => {
  await page.goto("/holter-tensionnel?tri=prix");
  const premiers = await page.locator("main article h3").allInnerTexts();
  expect(premiers.length).toBeGreaterThan(1);
  await page.locator("main article").filter({ hasText: "Oscar 2" }).first().getByRole("link").click();
  await expect(page).toHaveURL(/\/holter-tensionnel\/suntech-oscar-2(\?|$)/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Oscar 2");
});

test("SC-004 : chaque article publié est atteint en 3 clics au plus depuis l'accueil", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/");
  // 1er clic : une catégorie depuis l'accueil (tuiles, menus ou liens de la page)
  const liensAccueil = new Set(await page.locator("a[href]").evaluateAll((as) => as.map((a) => new URL((a as HTMLAnchorElement).href).pathname)));
  const atteintes = new Set<string>();
  for (const c of CATEGORIES) {
    // ECG de repos : depuis Holter ECG (2e clic), sinon directement depuis l'accueil
    const accessible = liensAccueil.has(c.chemin) || (c.chemin.startsWith("/holter-ecg/") && liensAccueil.has("/holter-ecg"));
    expect(accessible, c.chemin).toBe(true);
    await page.goto(c.chemin);
    // clic suivant : la carte de l'article, sans filtre
    for (const href of await page.locator("main article a[href]").evaluateAll((as) => as.map((a) => new URL((a as HTMLAnchorElement).href).pathname))) {
      atteintes.add(href.split("/").pop()!);
    }
  }
  const manquants = (await slugsPublies()).filter((s) => !atteintes.has(s));
  expect(manquants).toEqual([]);
});

test("catégorie sans article publié : introduction et invitation à nous contacter", async ({ page }) => {
  const condition = `"defaultCode" LIKE 'EC-DMS-REPOS%' AND etat = 'publie'`;
  const avant = await requete<{ defaultCode: string }>("site", `SELECT "defaultCode" FROM contenu_produit WHERE ${condition}`);
  expect(avant.length).toBeGreaterThan(0);
  await requete("site", `UPDATE contenu_produit SET etat = 'preparation' WHERE ${condition}`);
  try {
    await page.goto("/holter-ecg/ecg-de-repos");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Aucun produit n’est encore présenté dans cette catégorie.")).toBeVisible();
    await expect(page.locator("main").getByRole("link", { name: "Contactez-nous" })).toBeVisible();
  } finally {
    await requete("site", `UPDATE contenu_produit SET etat = 'publie' WHERE "defaultCode" = ANY($1)`, [avant.map((a) => a.defaultCode)]);
  }
});
