import { expect, test } from "@playwright/test";
import { verifierPrixTtcDabord } from "./outils";

// T019 — mise à disposition, financement et services en TTC d'abord (F22, US3, FR-009).

test.describe.configure({ timeout: 120_000 });

test("mise à disposition : premier mois et mois suivants en TTC / mois, puis HT / mois", async ({ page }) => {
  await page.goto("/holter-ecg/dms-300-4l?formule=mise-a-disposition");
  const panneau = page.getByTestId("panneau-formule");
  await expect(panneau).toContainText(/TTC le premier mois/);
  await expect(panneau).toContainText(/soit .* HT \/ mois ensuite/);
  await verifierPrixTtcDabord(panneau, 2);
  await expect(panneau).toContainText(/Valeur de remplacement : .* TTC \(soit .* HT\)/);
});

test("page Mise à disposition : offres en TTC d'abord", async ({ page }) => {
  await page.goto("/mise-a-disposition");
  await verifierPrixTtcDabord(page.locator("main"), 2);
});

test("financement : mensualités indicatives en TTC / mois d'abord, mention conservée", async ({ page }) => {
  await page.goto("/holter-ecg/dms-300-4l?formule=financement");
  const panneau = page.getByTestId("panneau-formule");
  await verifierPrixTtcDabord(panneau);
  await expect(panneau).toContainText(/TTC \/ mois/);
  await expect(panneau).toContainText(/indicati/);
});
