import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { ELECTRODES, ajouterDepuisFiche, clientConnecte } from "../f04/outils";

// T022 — F18 (US5, FR-017 à FR-019, SC-006) : « Panier » et « Mon compte », plus de « Connexion ».

test.describe.configure({ timeout: 180_000 });

const ENTREES = ["Holter ECG", "Holter tensionnel", "Épreuve d'effort", "Accessoires & consommables", "Services", "Financement", "Qui sommes-nous / Contact"];

// 1 093 px : écran de 1 366 px à 125 % ; 1 280 px : écran de 1 920 px à 150 % (Windows).
for (const largeur of [1024, 1093, 1280, 1920]) {
  test(`à ${largeur} px : « Panier » et « Mon compte » en toutes lettres, menu complet`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: 800 });
    await ajouterDepuisFiche(page, ELECTRODES);
    await page.goto("/");
    const entete = page.getByRole("banner");
    const panier = entete.getByRole("link", { name: "Panier, 1 article" });
    await expect(panier).toBeVisible();
    await expect(panier).toContainText("Panier");
    await expect(entete.getByRole("link", { name: "Mon compte" })).toContainText("Mon compte");
    await expect(entete).not.toContainText("Connexion");
    const nav = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(nav.getByRole("button")).toHaveText(ENTREES);
    for (const b of await nav.getByRole("button").all()) await expect(b).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
    if (largeur === 1280) await verifierAccessibilite(page);
  });
}

test("à 390 px : icônes seules, noms accessibles « Panier, vide » et « Mon compte »", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  const entete = page.getByRole("banner");
  await expect(entete.getByRole("link", { name: "Panier, vide" })).toBeVisible();
  await expect(entete.getByRole("link", { name: "Mon compte" })).toBeVisible();
  // Le libellé visible « Panier » n'apparaît qu'à partir de 1 024 px.
  await expect(entete.getByText("Panier", { exact: true })).toBeHidden();
});

test("déconnecté : « Mon compte » mène à la connexion, puis à Mon compte", async ({ page, browser, baseURL }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Mon compte" }).click();
  await expect(page).toHaveURL(/\/connexion\?retour=%2Fmon-compte|\/connexion\?retour=\/mon-compte/);
  await expect(page.locator("main").getByRole("link", { name: /Créer un compte/ })).toBeVisible();

  // Connecté : « Mon compte » mène directement à Mon compte ; la page de connexion y renvoie.
  await clientConnecte(browser, baseURL, page);
  await page.goto("/");
  await page.getByRole("banner").getByRole("link", { name: "Mon compte" }).click();
  await expect(page).toHaveURL(/\/mon-compte$/);
  await page.goto("/connexion");
  await expect(page).toHaveURL(/\/mon-compte$/);
});
