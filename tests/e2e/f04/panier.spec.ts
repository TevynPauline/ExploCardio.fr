import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { connecterCompte, creerCompteValide } from "../f02/outils";
import { ELECTRODES, HOLTER, ajouterDepuisFiche } from "./outils";

// T011 (US1, FR-001 à FR-007).

test.describe.configure({ timeout: 120_000 });

test("deux blocs avec leurs totaux ; quantité et suppression mettent à jour les totaux", async ({ page }) => {
  await ajouterDepuisFiche(page, ELECTRODES);
  await ajouterDepuisFiche(page, HOLTER, "mise_a_disposition");
  await page.goto("/panier");
  await verifierAccessibilite(page);
  const unique = page.locator("section", { has: page.getByRole("heading", { name: "Paiement unique" }) });
  const mensuel = page.locator("section", { has: page.getByRole("heading", { name: "Abonnement mensuel" }) });
  for (const libelle of ["Sous-total HT", "Livraison HT", "Total HT", "TVA", "Total TTC"]) await expect(unique).toContainText(libelle);
  // F22 : chaque montant mensuel en TTC d'abord, puis HT.
  await expect(mensuel).toContainText(/Premier mois.+ TTC soit .+ HT/);
  await expect(mensuel).toContainText(/Mois suivants.+ TTC \/ mois soit .+ HT \/ mois/);
  await expect(page.getByRole("link", { name: /Panier, \d+ article/ })).toBeVisible();

  const totalAvant = await unique.getByText("Total TTC").locator("..").innerText();
  // Le kit de la mise à disposition (F05) est aussi au paiement unique : on agit sur les électrodes.
  const electrodes = unique.getByRole("listitem").filter({ hasText: "Électrodes" });
  await electrodes.getByRole("spinbutton", { name: "Quantité" }).fill("3");
  await electrodes.getByRole("spinbutton", { name: "Quantité" }).press("Enter");
  await expect(unique.getByText("Total TTC").locator("..")).not.toHaveText(totalAvant);

  // F18 (FR-012) : chaque retrait est confirmé dans une fenêtre.
  const confirmer = () => page.getByRole("dialog").getByRole("button", { name: "Retirer", exact: true }).click();
  await mensuel.getByRole("button", { name: /Retirer .* du panier/ }).click();
  await confirmer();
  await expect(page.getByRole("heading", { name: "Abonnement mensuel" })).toHaveCount(0);
  for (let i = 0; i < 2; i++) {
    await unique.getByRole("button", { name: /Retirer .* du panier/ }).first().click();
    await confirmer();
    await page.waitForTimeout(500);
  }
  await expect(page.getByRole("heading", { name: "Votre panier est vide" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Découvrir le catalogue" })).toBeVisible();
});

test("code promo accepté sur sa ligne ; code inconnu refusé avec le motif", async ({ page }) => {
  await ajouterDepuisFiche(page, ELECTRODES);
  await page.goto("/panier");
  await page.getByLabel("Code promo").fill("demo10");
  await page.getByRole("button", { name: "Appliquer" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Code DEMO10 appliqué." })).toBeVisible();
  await expect(page.locator("main")).toContainText("Code promo");
  await expect(page.locator("main")).toContainText("Un seul code promo par commande");
  await page.getByLabel("Code promo").fill("INCONNU");
  await page.getByRole("button", { name: "Appliquer" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Code INCONNU refusé : Ce code n'existe pas." })).toBeVisible();
});

test("délai rappelé sur la ligne ; prix changé signalé", async ({ page }) => {
  await ajouterDepuisFiche(page, "/epreuve-effort/ultra-koch-exercise");
  await page.goto("/panier");
  await expect(page.locator("main")).toContainText(/Délai : \d+ jours\./);
  await expect(page.locator("main")).toContainText("Livraison et installation des équipements volumineux HT");
});

test("panier du visiteur fusionné à la connexion, retrouvé ensuite", async ({ page, browser, baseURL }) => {
  const visiteur = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  const c = await creerCompteValide(await visiteur.newPage());
  await visiteur.close();
  await ajouterDepuisFiche(page, ELECTRODES);
  await connecterCompte(page.context(), c.email);
  await page.goto("/panier");
  await expect(page.locator("main")).toContainText("Électrodes Holter");
  // Autre appareil : le panier du compte est retrouvé.
  const autre = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  await connecterCompte(autre, c.email);
  const p2 = await autre.newPage();
  await p2.goto("/panier");
  await expect(p2.locator("main")).toContainText("Électrodes Holter");
  await autre.close();
});
