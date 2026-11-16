import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";

// F27, US3 : consommables par examen, visibles aussi dans « Produits ».

test("un consommable apparaît dans Consommables et dans sa catégorie de Produits", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  await nav.getByRole("button", { name: "Consommables" }).hover();
  const panneau = page.locator("#megamenu-consommables");
  await expect(panneau.getByRole("heading", { name: "Pour la MAPA" })).toBeVisible();
  await expect(panneau.getByRole("link", { name: "Brassard MAPA Orbit" })).toBeVisible();
  await expect(panneau.getByRole("link", { name: "Pochette Oscar 2" })).toHaveCount(0);
  await expect(panneau.getByRole("heading", { name: "Pour l'épreuve d'effort" })).toHaveCount(0);
  await nav.getByRole("button", { name: "Produits" }).hover();
  await expect(page.locator("#megamenu-produits").getByRole("link", { name: "Brassards pour MAPA" })).toBeVisible();
});

test("page « Tous les consommables » rangée par examen", async ({ page }) => {
  await page.goto("/consommables");
  await expect(page.getByRole("heading", { level: 1, name: "Consommables" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("heading", { level: 2 })).toHaveText(["Pour le Holter ECG", "Pour la MAPA", "Pour l'ECG de repos"]);
  await expect(page.locator("#mapa").getByText("Brassard MAPA Orbit").first()).toBeVisible();
  await verifierAccessibilite(page);
});
