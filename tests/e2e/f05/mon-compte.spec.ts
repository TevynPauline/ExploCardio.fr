import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { expedierEtLivrer, louer, rendreParcDesTests, requete } from "./outils";

// T022 (US3, FR-017 à FR-020) : « Mon compte › Locations » : informations, actions selon l'état,
// locations séparées, historique avec factures.

test.describe.configure({ timeout: 300_000, mode: "serial" });
test.beforeEach(rendreParcDesTests);

test("location commandée puis en cours : informations et actions selon l'état", async ({ page, browser, baseURL }) => {
  const { ref } = await louer(page, browser, baseURL);
  await page.goto("/mon-compte/locations");
  await verifierAccessibilite(page);
  let carte = page.getByRole("listitem", { name: `Location ${ref}` });
  await expect(carte).toContainText("Commandée");
  await expect(carte).toContainText("Livraison prévue");
  await expect(carte).not.toContainText("Numéro de série");
  await expect(carte.getByRole("button", { name: /Annuler sans frais/ })).toBeVisible();
  await expect(carte.getByRole("link", { name: /Résilier/ })).toHaveCount(0);

  await expedierEtLivrer(browser, baseURL, ref);
  await page.reload();
  carte = page.getByRole("listitem", { name: `Location ${ref}` });
  await expect(carte).toContainText("En cours");
  await expect(carte).toContainText("Numéro de série");
  await expect(carte).toContainText(/Prochaine échéance.*HT.*TTC/);
  await expect(carte).toContainText(/Facture FICT\//);
  await expect(carte.getByRole("link", { name: /Résilier la location/ })).toBeVisible();
  await expect(carte.getByRole("button", { name: /Passer à l’achat/ })).toBeVisible();
  await expect(carte.getByRole("link", { name: /Passer au financement/ })).toBeVisible();
  await expect(carte.getByRole("button", { name: /Prolonger/ })).toHaveCount(0);
  await expect(carte.getByRole("link", { name: /Étiquette de retour/ })).toHaveCount(0);
  await verifierAccessibilite(page);
});

test("location terminée : dans l'historique avec ses dates et factures", async ({ page, browser, baseURL }) => {
  const { ref } = await louer(page, browser, baseURL);
  await requete("demo", `UPDATE sale_subscription SET etat = 'terminee', fin = now(), "etatRetour" = 'complet' WHERE ref = $1`, [ref]);
  await page.goto("/mon-compte/locations");
  const historique = page.getByRole("region", { name: "Locations terminées" });
  await expect(historique.getByRole("listitem", { name: `Location ${ref}` })).toContainText("Terminée");
  await expect(historique.getByRole("listitem", { name: `Location ${ref}` })).toContainText(/Facture FICT\//);
});
