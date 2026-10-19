import { expect, test } from "@playwright/test";
import { expedierEtLivrer, louer, rendreParcDesTests } from "./outils";

// T033 (US7, FR-031 à FR-033) : passer de la location à l'achat ou au financement.

test.describe.configure({ timeout: 300_000 });
test.beforeEach(rendreParcDesTests);

test("passer à l'achat (appareil neuf au panier, location qui continue) et au financement (demande préremplie)", async ({ page, browser, baseURL }) => {
  const { ref } = await louer(page, browser, baseURL);
  await expedierEtLivrer(browser, baseURL, ref);
  await page.goto("/mon-compte/locations");
  await expect(page.locator("main")).toContainText("la location continue jusqu’à ce que vous la résiliiez");
  await page.getByRole("button", { name: `Passer à l’achat (${ref})` }).click();
  await page.waitForURL(/\/panier/);
  await expect(page.locator("main")).toContainText("Oscar 2");
  await expect(page.locator("main")).toContainText("Paiement unique");
  await page.goto("/mon-compte/locations");
  await expect(page.getByRole("listitem", { name: `Location ${ref}` })).toContainText("En cours");
  await page.getByRole("link", { name: `Passer au financement (${ref})` }).click();
  await page.waitForURL(/\/financement\/demande\?article=EC-SUN-OSCAR2/);
  await expect(page.locator("main").getByLabel(/^Quantité \(Oscar 2/)).toHaveValue("1");
});
