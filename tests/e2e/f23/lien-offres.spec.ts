import { expect, test } from "@playwright/test";

// T016 — lien « Nos offres du moment » du bandeau promotionnel (F23, US2 ; FR-003 à FR-005).
// Le masquage du carrousel est vérifié dans organisation-admin.spec.ts.

const lien = (page: import("@playwright/test").Page) => page.getByRole("region", { name: "Promotion en cours" }).getByRole("link", { name: "Nos offres du moment" });

test.describe.configure({ timeout: 180_000 });

test("depuis l'accueil, le lien mène au carrousel et lui donne le focus", async ({ page }) => {
  await page.goto("/");
  test.skip(!(await page.getByRole("region", { name: "Promotion en cours" }).count()), "aucun message de bandeau en cours");
  const cible = (await lien(page).boundingBox())!;
  expect(cible.height).toBeGreaterThanOrEqual(44);
  await lien(page).click();
  const carrousel = page.locator("#offres-du-moment");
  await expect(carrousel).toBeInViewport();
  await expect(carrousel).toBeFocused();
  await expect(carrousel.getByRole("heading", { level: 2, name: "Nos offres du moment" })).toBeVisible();
});

test("depuis une autre page, le lien mène au carrousel de l'accueil", async ({ page }) => {
  await page.goto("/holter-ecg");
  test.skip(!(await page.getByRole("region", { name: "Promotion en cours" }).count()), "aucun message de bandeau en cours");
  await lien(page).click();
  await expect(page).toHaveURL(/\/#offres-du-moment$/);
  await expect(page.locator("#offres-du-moment")).toBeInViewport();
  await expect(page.locator("#offres-du-moment")).toBeFocused();
});
