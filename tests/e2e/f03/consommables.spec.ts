import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";

// T025 (US3, FR-022 à FR-024, SC-006).

test.describe.configure({ timeout: 90_000 });

const ELECTRODES = "/accessoires-consommables/electrodes-holter";

test("fiche consommable : prix unitaire et par lot, conditionnements, paliers ; quantité → prix et total", async ({ page }) => {
  await page.goto(ELECTRODES);
  await verifierAccessibilite(page);
  const main = page.locator("main");
  await expect(main.getByRole("radio", { name: "Boîte de 50" })).toBeChecked();
  await expect(main).toContainText("le lot de 50");
  await expect(main).toContainText("l’unité");
  await expect(main).toContainText("Prix dégressifs");
  await expect(main).toContainText("À partir de 5");

  const total = page.getByTestId("total-consommable");
  const quantite = main.getByLabel(/Quantité/);
  await quantite.fill("4");
  await expect(total).toContainText("72,00 € HT"); // 4 × 18,00
  await quantite.fill("10");
  await expect(total).toContainText("prix dégressif dès 10");
  await expect(total).toContainText("150,00 € HT"); // 10 × 15,00

  await main.getByText("Carton de 500").click();
  await expect(main).toContainText("le lot de 500");
});

test("quantité supérieure au stock : quantité disponible et délai pour le reste", async ({ page }) => {
  await page.goto(`${ELECTRODES}?config=EC-ELEC-HOLTER-500`);
  await page.locator("main").getByLabel(/Quantité/).fill("999");
  await expect(page.locator("main")).toContainText(/\d+ disponibles immédiatement ; le reste sous \d+ jours\./);
});

test("ajout rapide : confirmation sans quitter la page ; équipements compatibles", async ({ page }) => {
  await page.goto(ELECTRODES);
  const url = page.url();
  await page.locator("main").getByRole("button", { name: "Ajouter au panier" }).click();
  await expect(page.locator("main").getByRole("status").filter({ hasText: "Ajouté au panier" })).toBeVisible();
  expect(page.url()).toBe(url);
  await page.getByRole("tab", { name: "Équipements compatibles" }).click();
  await page.getByRole("tabpanel").getByRole("link", { name: /DMS 300-4L/ }).click();
  await expect(page).toHaveURL(/\/holter-ecg\/dms-300-4l(\?|$)/);
});

test("SC-006 : un consommable compatible trouvé depuis un équipement et ajouté en moins de 60 secondes", async ({ page }) => {
  const debut = Date.now();
  await page.goto("/");
  await page.goto("/holter-ecg");
  await page.locator("main article").filter({ hasText: "DMS 300-4L" }).getByRole("link").click();
  await page.getByRole("tab", { name: "Consommables compatibles" }).click();
  const ligne = page.getByRole("tabpanel").locator("li").filter({ hasText: "Électrodes Holter — Boîte de 50" });
  await ligne.getByRole("button", { name: "Ajouter au panier" }).click();
  await expect(ligne.getByRole("status")).toContainText("Ajouté au panier");
  expect(Date.now() - debut).toBeLessThan(60_000);
  await page.goto("/panier");
  await expect(page.locator("main")).toContainText("Électrodes Holter");
});
