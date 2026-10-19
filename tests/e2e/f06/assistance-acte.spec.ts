import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { accepterConditions, clientConnecte, commandesDe, ecranDemo, nombreEmails, payerSurPageDemo } from "./outils";

// T030 (US9, FR-013, FR-038, D5) : sans droits, l'assistance à l'acte est proposée avec son prix
// HT ; achat par carte seulement → intervention disponible dans « Mon compte », facture ;
// clôture au démonstrateur → réalisée, email. Avec droits actifs, elle n'est pas proposée
// (vérifié dans mon-compte.spec.ts).

test.describe.configure({ timeout: 240_000 });

test("acheter une intervention, puis la voir close", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await page.goto("/mon-compte/assistance");
  await expect(page.locator("main")).toContainText(/L’assistance à l’acte : une intervention de notre équipe, pour 150,00\s€\sHT/);
  await page.getByRole("button", { name: "Acheter une intervention" }).click();
  await page.waitForURL(/\/panier/);
  await expect(page.getByRole("listitem").filter({ hasText: "Réf. EC-ASSISTANCE-ACTE" })).toBeVisible();

  await page.getByRole("link", { name: "Commander" }).click();
  await page.waitForURL(/\/commande\/adresses/);
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForURL(/\/commande\/livraison/);
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForURL(/\/commande\/paiement/);
  await expect(page.getByRole("radio", { name: /Virement bancaire/ })).toHaveCount(0);
  await expect(page.locator("main")).toContainText("L’assistance à l’acte se règle par carte bancaire.");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForURL(/\/commande\/recapitulatif/);
  await accepterConditions(page);
  await page.getByRole("button", { name: /^Payer/ }).click();
  await payerSurPageDemo(page);
  await page.waitForURL(/\/commande\/confirmation\//);
  const [commande] = await commandesDe(c.partenaireRef);

  await page.goto("/mon-compte/assistance");
  const interventions = page.getByRole("region", { name: "Interventions payées" });
  await expect(interventions).toContainText(`commande ${commande!.ref}`);
  await expect(interventions).toContainText("Disponible");
  await verifierAccessibilite(page);
  await page.goto("/mon-compte/factures");
  await expect(page.locator("main")).toContainText(/Facture FICT\//);
  await page.goto("/mon-compte/bons-achat");
  await expect(page.locator("main")).toContainText("Aucun mouvement pour le moment.");

  await ecranDemo(browser, baseURL, "/admin/demonstration/fidelite", async (admin) => {
    await admin.getByRole("button", { name: `Clore l’intervention (${commande!.ref})` }).click();
    await expect(admin.getByRole("status").filter({ hasText: "Intervention close" })).toBeVisible();
  });
  await page.goto("/mon-compte/assistance");
  await expect(page.getByRole("region", { name: "Interventions payées" })).toContainText("Réalisée le");
  expect(await nombreEmails(c.email, "Votre intervention d'assistance est terminée")).toBe(1);
});
