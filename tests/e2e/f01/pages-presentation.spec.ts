import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { PAGES_F01 } from "./outils";

// T018 (FR-038, FR-046) : chaque page de F01 existe, sans erreur ; les familles listent
// leurs articles avec prix HT.

test("chaque page de F01 s'affiche sans erreur et reste accessible", async ({ page }) => {
  test.setTimeout(120_000);
  for (const chemin of PAGES_F01) {
    const reponse = await page.goto(chemin);
    expect(reponse?.status(), chemin).toBe(200);
    await expect(page.getByRole("heading", { level: 1 }), chemin).toBeVisible();
    await verifierAccessibilite(page);
  }
});

test("les pages de familles listent les articles avec leur prix HT", async ({ page }) => {
  await page.goto("/holter-tensionnel");
  await expect(page.getByRole("heading", { name: "Oscar 2" })).toBeVisible();
  await expect(page.locator("#EC-SUN-OSCAR2")).toContainText("HT");
  await page.goto("/accessoires-consommables#EC-SUN-ORBIT-M");
  await expect(page.locator("#EC-SUN-ORBIT-M")).toContainText("98-0239-22");
});

test("l'ECG de repos est rattaché à Holter ECG", async ({ page }) => {
  await page.goto("/holter-ecg");
  await page.getByRole("link", { name: /ECG de repos/ }).first().click();
  await expect(page).toHaveURL(/\/holter-ecg\/ecg-de-repos$/);
});

test("une page inexistante affiche la page introuvable à la charte", async ({ page }) => {
  const r = await page.goto("/page-qui-n-existe-pas");
  expect(r?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cette page n’existe pas");
  await expect(page.getByRole("link", { name: "Accueil", exact: true })).toBeVisible();
});
