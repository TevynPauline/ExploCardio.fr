import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { ELECTRODES, ajouterDepuisFiche } from "../f04/outils";

// T013 — F18 (US2, FR-007 à FR-011, SC-003) : boutons « − » et « + » visibles sans survol, dans
// le panier et sur les fiches produit.

test.describe.configure({ timeout: 180_000 });

test("panier : « − » et « + » visibles à toutes les largeurs ; « + » met à jour le prix et s'annonce", async ({ page }) => {
  await ajouterDepuisFiche(page, ELECTRODES);
  await page.goto("/panier");
  const ligne = page.locator("main").getByRole("listitem").filter({ hasText: "Électrodes" }).first();
  const moins = ligne.getByRole("button", { name: /^Diminuer la quantité de/ });
  const plus = ligne.getByRole("button", { name: /^Augmenter la quantité de/ });
  const champ = ligne.getByRole("spinbutton", { name: "Quantité" });

  for (const largeur of [320, 390, 768, 1024, 1280]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    for (const b of [moins, plus]) {
      await expect(b).toBeVisible();
      const boite = (await b.boundingBox())!;
      expect(Math.min(boite.width, boite.height)).toBeGreaterThanOrEqual(44);
    }
  }

  await expect(champ).toHaveValue("1");
  await expect(moins).toBeDisabled();
  const total = ligne.locator("[data-total-ligne]");
  const avant = await total.innerText();
  await plus.click();
  await expect(champ).toHaveValue("2");
  await expect(total).not.toHaveText(avant);
  await expect(ligne.getByText("Quantité : 2")).toBeAttached();
  await expect(moins).toBeEnabled();
  // Deux appuis rapides : chacun compte, la dernière quantité est enregistrée.
  await plus.click();
  await plus.click();
  await expect(champ).toHaveValue("4");
  await expect(page.getByText("Mise à jour…")).toHaveCount(0, { timeout: 10_000 });
  await page.reload();
  await expect(page.locator("main").getByRole("listitem").filter({ hasText: "Électrodes" }).first().getByRole("spinbutton", { name: "Quantité" })).toHaveValue("4");

  // La saisie directe reste possible.
  await champ.fill("6");
  await expect(page.getByText("Mise à jour…")).toHaveCount(0, { timeout: 10_000 });
  await expect(champ).toHaveValue("6");
  await verifierAccessibilite(page);
});

test("fiche produit : mêmes boutons autour de la quantité", async ({ page }) => {
  await page.goto(ELECTRODES);
  const main = page.locator("main");
  const champ = main.getByRole("spinbutton", { name: /Quantité/ });
  await expect(champ).toHaveValue("1");
  await expect(main.getByRole("button", { name: /^Diminuer la quantité de/ })).toBeDisabled();
  await main.getByRole("button", { name: /^Augmenter la quantité de/ }).click();
  await expect(champ).toHaveValue("2");
  await verifierAccessibilite(page);
});
