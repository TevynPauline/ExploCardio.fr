import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";

// T019 — F18 (US4, FR-015, FR-016, SC-005) : barre de recherche visible sur ordinateur, loupe
// seule sur téléphone.

for (const largeur of [1024, 1280]) {
  test(`à ${largeur} px, on tape directement dans la barre ; Entrée ouvre les résultats`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto("/");
    const champ = page.getByRole("banner").getByRole("combobox", { name: /Rechercher un produit/ });
    await expect(champ).toBeVisible();
    await expect(champ).toHaveAttribute("placeholder", "Rechercher un produit…");
    await expect(page.getByRole("banner").getByRole("button", { name: "Rechercher" })).toBeHidden();
    await champ.click();
    await champ.pressSequentially("oscar");
    await expect(page.getByRole("option").first()).toBeVisible();
    await verifierAccessibilite(page);
    await champ.press("Enter");
    await expect(page).toHaveURL(/\/recherche\?q=oscar|suntech-oscar/);
  });
}

test("à 390 px, seule la loupe est visible et ouvre la barre", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  const champ = page.getByRole("combobox", { name: /Rechercher un produit/ });
  await expect(champ).toBeHidden();
  await page.getByRole("banner").getByRole("button", { name: "Rechercher" }).click();
  await expect(champ).toBeVisible();
  await expect(champ).toBeFocused();
});
