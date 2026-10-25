import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { ELECTRODES, ajouterDepuisFiche } from "../f04/outils";

// T019 — prix du panier en direct (F16, US5, FR-016, FR-017, SC-005).

test.describe.configure({ timeout: 180_000 });

const montant = (texte: string) => Number(texte.replace(/[^\d,]/g, "").replace(",", "."));

test("le prix de la ligne suit la quantité aussitôt ; la quantité est enregistrée", async ({ page }) => {
  await ajouterDepuisFiche(page, ELECTRODES);
  await page.goto("/panier");
  const champ = page.getByLabel("Quantité").first();
  const total = page.locator("[data-total-ligne]").first();
  const avant = await total.innerText();

  await champ.fill("5");
  // Moins d'un quart de seconde, sans quitter le champ (SC-005) ; prix dégressif compris.
  await expect(total).not.toHaveText(avant, { timeout: 250 });
  const immediat = await total.innerText();
  await expect(champ).toBeFocused();
  // Les totaux se recalculent ; après rechargement, le prix calculé par Odoo est le même.
  await expect(page.getByText("Mise à jour…")).toHaveCount(0, { timeout: 10_000 });
  await page.reload();
  await expect(page.getByLabel("Quantité").first()).toHaveValue("5");
  await expect(page.locator("[data-total-ligne]").first()).toHaveText(immediat);
  expect(montant(immediat)).toBeGreaterThan(montant(avant));

  // Saisie rapide « 1 » puis « 12 » : seule la dernière est enregistrée.
  await page.getByLabel("Quantité").first().fill("1");
  await page.getByLabel("Quantité").first().fill("12");
  await expect(page.getByText("Mise à jour…")).toHaveCount(0, { timeout: 10_000 });
  await page.reload();
  await expect(page.getByLabel("Quantité").first()).toHaveValue("12");
  await verifierAccessibilite(page);
});

test("champ vidé : le prix ne passe pas à zéro ; quantité au-delà du permis : corrigée avec un message", async ({ page }) => {
  await ajouterDepuisFiche(page, ELECTRODES);
  await page.goto("/panier");
  const champ = page.getByLabel("Quantité").first();
  const total = page.locator("[data-total-ligne]").first();
  const avant = await total.innerText();
  await champ.fill("");
  await expect(total).toHaveText(avant);
  await champ.blur();
  await expect(champ).not.toHaveValue("");
  await champ.fill("1500");
  await expect(champ).toHaveValue("999");
  await expect(page.locator("main").getByText("Quantité limitée à 999 par ligne.")).toBeVisible();
  await champ.fill("1");
  await expect(page.getByText("Mise à jour…")).toHaveCount(0, { timeout: 10_000 });
});

test("enregistrement impossible : message et retour à la quantité enregistrée", async ({ page }) => {
  await ajouterDepuisFiche(page, ELECTRODES);
  await page.goto("/panier");
  const champ = page.getByLabel("Quantité").first();
  const avant = await champ.inputValue();
  await page.route("**/panier", (route) => (route.request().method() === "POST" ? route.abort() : route.continue()));
  await champ.fill(String(Number(avant) + 3));
  await expect(page.locator("main").getByRole("alert")).toContainText("n'a pas pu être enregistrée", { timeout: 10_000 });
  await expect(champ).toHaveValue(avant);
  await page.unroute("**/panier");
});
