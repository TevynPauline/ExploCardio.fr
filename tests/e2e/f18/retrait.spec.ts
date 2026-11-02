import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { ELECTRODES, HOLTER, ajouterDepuisFiche } from "../f04/outils";

// T016 — F18 (US3, FR-012 à FR-014, SC-004) : aucun article retiré sans confirmation.

test.describe.configure({ timeout: 180_000 });

test("« Retirer » demande confirmation ; Annuler, Échap et le fond ne retirent rien ; confirmer retire", async ({ page }) => {
  await ajouterDepuisFiche(page, ELECTRODES);
  await ajouterDepuisFiche(page, HOLTER);
  await page.goto("/panier");
  const main = page.locator("main");
  const lignes = main.getByRole("listitem").filter({ has: page.getByRole("button", { name: /^Retirer .* du panier$/ }) });
  await expect(lignes).toHaveCount(2);
  const retirer = lignes.first().getByRole("button", { name: /^Retirer .* du panier$/ });
  const fenetre = page.getByRole("dialog", { name: "Retirer cet article du panier ?" });

  // Annuler
  await retirer.click();
  await expect(fenetre).toBeVisible();
  await verifierAccessibilite(page);
  await fenetre.getByRole("button", { name: "Annuler" }).click();
  await expect(fenetre).toBeHidden();
  await expect(retirer).toBeFocused();
  await expect(lignes).toHaveCount(2);

  // Échap
  await retirer.click();
  await expect(fenetre).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(fenetre).toBeHidden();
  await expect(retirer).toBeFocused();

  // Clic sur le fond
  await retirer.click();
  await expect(fenetre).toBeVisible();
  await page.mouse.click(5, 5);
  await expect(fenetre).toBeHidden();
  await expect(lignes).toHaveCount(2);

  // Confirmer
  await retirer.click();
  await fenetre.getByRole("button", { name: "Retirer", exact: true }).click();
  await expect(lignes).toHaveCount(1);
  await expect(page.getByRole("status").filter({ hasText: /a été retiré du panier/ })).toBeAttached();
  await expect(page.getByRole("link", { name: "Panier, 1 article" })).toBeAttached();
  await expect(lignes.first()).toBeFocused();

  // Dernier article : panier vide, focus sur le titre.
  await lignes.first().getByRole("button", { name: /^Retirer .* du panier$/ }).click();
  await fenetre.getByRole("button", { name: "Retirer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Votre panier est vide" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Votre panier est vide" })).toBeFocused();
});
