import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { ELECTRODES, ajouterDepuisFiche, clientConnecte } from "../f04/outils";

// T038 — commande depuis l'outre-mer ou l'étranger (F16, US8, FR-029) : refus expliqué, puis
// « Nous contacter » ouvre le formulaire prérempli (motif et panier, lus côté serveur).

test.describe.configure({ timeout: 180_000 });

test("tunnel : 97400 puis « Autre pays » refusés ; « Nous contacter » préremplit motif et panier", async ({ page, browser, baseURL }) => {
  await clientConnecte(browser, baseURL, page);
  await ajouterDepuisFiche(page, ELECTRODES);
  await page.goto("/commande/adresses");
  const main = page.locator("main");
  await main.getByLabel("Code postal").first().fill("97400");
  await main.getByRole("button", { name: "Continuer" }).click();
  await expect(main.getByText("livre uniquement en France métropolitaine").first()).toBeVisible();
  await expect(main.getByRole("link", { name: "Nous contacter" })).toBeVisible();
  await verifierAccessibilite(page);

  await main.getByLabel("Code postal").first().fill("1000");
  await main.getByLabel("Pays").first().selectOption("autre");
  await main.getByRole("button", { name: "Continuer" }).click();
  await expect(page.locator("[id='livraison.pays-erreur']")).toContainText("livre uniquement en France métropolitaine");
  await expect(page).toHaveURL(/\/commande\/adresses/);

  await main.getByRole("link", { name: "Nous contacter" }).click();
  await page.waitForURL(/\/qui-sommes-nous\?motif=hors-metropole#contact$/);
  await expect(page.getByLabel("Motif")).toHaveValue("Commande hors métropole");
  await expect(page.getByLabel("Message")).toHaveValue(/Contenu de mon panier :\n- 1 × .*Électrodes/);
  // Le panier n'apparaît jamais dans l'adresse de la page.
  expect(page.url()).not.toMatch(/lectrode|EC-ELEC/);
  await verifierAccessibilite(page);
});

test("Mon compte : adresse de livraison à La Réunion refusée, avec « Nous contacter »", async ({ page, browser, baseURL }) => {
  await clientConnecte(browser, baseURL, page);
  await page.goto("/mon-compte/adresses");
  const livraison = page.getByRole("group", { name: "Adresse de livraison" });
  await livraison.getByLabel("Code postal").fill("97400");
  await page.getByRole("button", { name: "Enregistrer les adresses" }).click();
  await expect(livraison.getByRole("alert")).toContainText("livre uniquement en France métropolitaine");
  await expect(livraison.getByRole("link", { name: "Nous contacter" })).toHaveAttribute("href", "/qui-sommes-nous?motif=hors-metropole#contact");
});

test("Corse acceptée dans le tunnel", async ({ page, browser, baseURL }) => {
  await clientConnecte(browser, baseURL, page);
  await ajouterDepuisFiche(page, ELECTRODES);
  await page.goto("/commande/adresses");
  await page.locator("main").getByLabel("Code postal").first().fill("20000");
  await page.locator("main").getByLabel("Ville").first().fill("Ajaccio");
  await page.locator("main").getByRole("button", { name: "Continuer" }).click();
  await page.waitForURL(/\/commande\/livraison/);
});
