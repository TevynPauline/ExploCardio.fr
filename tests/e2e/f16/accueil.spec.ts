import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { defileHorizontalement } from "./outils";

// T015 — accueil (F16, US4, FR-009 à FR-011) : ordre des sections, sections retirées. F20 retire
// « Pourquoi préférer ExploCardio.fr » (remplacée par l'animation, tests/e2e/f20/).

test.describe.configure({ timeout: 180_000 });

test("ordre des sections ; ni Équipement, ni Actualités, ni offre de bienvenue en section", async ({ page }) => {
  await page.goto("/");
  const sections = await page.locator("[data-section]").evaluateAll((els) => els.map((e) => e.getAttribute("data-section")));
  expect(sections).toEqual(["trois-temps", "acces-rapide", "carrousel", "contact"]);
  await expect(page.locator("[data-section=contact]")).not.toContainText("Régis Andrieu");
  await verifierAccessibilite(page);
  for (const largeur of [320, 1920]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto("/");
    expect(await defileHorizontalement(page), `${largeur} px`).toBe(false);
  }
});
