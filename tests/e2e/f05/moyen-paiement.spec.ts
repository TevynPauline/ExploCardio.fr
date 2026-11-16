import { expect, test } from "@playwright/test";
import { louer, rendreParcDesTests } from "./outils";

// T025 (F24, US2, FR-015) : depuis « Mon compte › Locations », le client ouvre la page de mise à
// jour de son moyen de paiement (page de démonstration ici, page sécurisée de Stripe en réel) et
// revient sur le site. Aucune donnée bancaire n'est saisie sur le site.

test.describe.configure({ timeout: 300_000, mode: "serial" });
test.beforeEach(rendreParcDesTests);

test("mettre à jour sa carte ou son compte bancaire : page dédiée puis retour aux locations", async ({ page, browser, baseURL }) => {
  await louer(page, browser, baseURL);
  await page.goto("/mon-compte/locations");
  await page.getByRole("button", { name: "Mettre à jour ma carte ou mon compte bancaire" }).click();
  await page.waitForURL(/\/demo\/moyen-paiement/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mettre à jour votre carte ou votre compte bancaire");
  await expect(page.locator("input")).toHaveCount(0);
  await page.getByRole("link", { name: "Revenir au site" }).click();
  await page.waitForURL(/\/mon-compte\/locations$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Locations");
});
