import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { verifierPrixTtcDabord } from "./outils";

// T007 — catalogue en TTC d'abord (F22, US1, FR-001 à FR-008).

test.describe.configure({ timeout: 120_000 });

test("cartes de rubrique : « À partir de … € TTC », puis « soit … € HT »", async ({ page }) => {
  await page.goto("/holter-ecg");
  const main = page.locator("main");
  await verifierPrixTtcDabord(main, 2);
  await expect(main.locator("[data-prix-ttc]").first()).toContainText(/À partir de .* TTC/);
  await verifierAccessibilite(page);
});

test("fiche à variantes : TTC et HT changent ensemble avec la configuration", async ({ page }) => {
  await page.goto("/holter-ecg/dms-300-4l");
  const panneau = page.getByTestId("panneau-formule");
  await verifierPrixTtcDabord(panneau);
  const prix = panneau.locator("[data-prix-ttc]").first();
  const avant = await prix.getAttribute("data-prix-ttc");
  const configs = page.locator("main").getByRole("radio");
  if ((await configs.count()) > 1) {
    await configs.nth(1).check({ force: true });
    await expect(prix).not.toHaveAttribute("data-prix-ttc", avant!);
    await verifierPrixTtcDabord(panneau);
  }
});

test("consommable à paliers : lot, unité, paliers et total en TTC d'abord", async ({ page }) => {
  await page.goto("/accessoires-consommables/electrodes-holter");
  const main = page.locator("main");
  await verifierPrixTtcDabord(main);
  await expect(main).toContainText(/Soit .* TTC l’unité \(soit .* HT l’unité\)/);
  await expect(main).toContainText(/À partir de \d+ : .* TTC le lot \(soit .* HT le lot\)/);
  const total = page.getByTestId("total-consommable");
  await main.getByRole("spinbutton", { name: /Quantité/ }).fill("4");
  await expect(total).toContainText("86,40 € TTC"); // 4 × 18,00 € HT = 72,00 € HT
  await expect(total).toContainText("soit 72,00 € HT");
});

test("recherche : suggestions et résultats en TTC d'abord", async ({ page }) => {
  await page.goto("/recherche?q=holter");
  await verifierPrixTtcDabord(page.locator("main"));
});

test("à 390 px : TTC et HT lisibles l'un sous l'autre, sans défilement horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/holter-ecg/dms-300-4l");
  await verifierPrixTtcDabord(page.getByTestId("panneau-formule"));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
