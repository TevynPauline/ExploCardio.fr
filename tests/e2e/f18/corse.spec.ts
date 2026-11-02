import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { remplirInscription } from "../f02/outils";
import { ELECTRODES, ajouterDepuisFiche, clientConnecte, requete } from "../f04/outils";
import { ajouterMad } from "../f05/outils";

// T006 — F18 (US1, FR-001 à FR-006, SC-001, SC-002) : la commande en ligne est livrée en France
// métropolitaine continentale ; la Corse est orientée vers l'équipe, comme l'outre-mer.

test.describe.configure({ timeout: 180_000 });

const MESSAGE = /livre en ligne en France métropolitaine continentale/;
const CONTACT = "/qui-sommes-nous?motif=hors-metropole#contact";

test("inscription : livraison à Ajaccio refusée avec « Nous contacter »", async ({ page }) => {
  await page.goto("/inscription");
  await remplirInscription(page, "", `corse-${Date.now()}@demo.explocardio.test`);
  const main = page.locator("main");
  await main.getByRole("checkbox", { name: /livraison identique/ }).uncheck();
  await main.locator("#adresseLivraison\\.ligne1").fill("1 cours Napoléon");
  await main.locator("#adresseLivraison\\.codePostal").fill("20000");
  await main.locator("#adresseLivraison\\.ville").fill("Ajaccio");
  await page.waitForTimeout(3_200);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(main.getByText(MESSAGE).first()).toBeVisible();
  await expect(main.getByRole("link", { name: "Nous contacter" }).first()).toHaveAttribute("href", CONTACT);
  await expect(main.getByText("Livraison en France métropolitaine continentale (hors Corse).").first()).toBeVisible();
});

test("Mon compte et tunnel : Corse refusée ; facturation à Bastia avec livraison à Lyon acceptée", async ({ page, browser, baseURL }) => {
  await clientConnecte(browser, baseURL, page);
  await page.goto("/mon-compte/adresses");
  const livraison = page.getByRole("group", { name: "Adresse de livraison" });
  await livraison.getByLabel("Code postal").fill("20200");
  await page.getByRole("button", { name: "Enregistrer les adresses" }).click();
  await expect(livraison.getByRole("alert")).toContainText(MESSAGE);
  await expect(livraison.getByRole("link", { name: "Nous contacter" })).toHaveAttribute("href", CONTACT);

  await ajouterDepuisFiche(page, ELECTRODES);
  await page.goto("/commande/adresses");
  const main = page.locator("main");
  await main.getByLabel("Code postal").first().fill("20000");
  await main.getByLabel("Ville").first().fill("Ajaccio");
  await main.getByRole("button", { name: "Continuer" }).click();
  await expect(main.getByText(MESSAGE).first()).toBeVisible();
  await expect(page).toHaveURL(/\/commande\/adresses/);
  await verifierAccessibilite(page);

  // Livraison sur le continent, facturation en Corse : acceptée (FR-003).
  await main.getByLabel("Code postal").first().fill("69003");
  await main.getByLabel("Ville").first().fill("Lyon");
  await main.getByRole("checkbox", { name: "Adresse de facturation identique" }).uncheck();
  await main.locator("#facturation\\.ligne1").fill("2 boulevard Paoli");
  await main.locator("#facturation\\.codePostal").fill("20200");
  await main.locator("#facturation\\.ville").fill("Bastia");
  await main.getByRole("button", { name: "Continuer" }).click();
  await page.waitForURL(/\/commande\/livraison/);
});

test("location express : adresse corse refusée à l'étape adresses", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await requete("site", `UPDATE adresse SET "codePostal" = '20000', ville = 'Ajaccio' WHERE "compteId" = $1`, [c.id]);
  await ajouterMad(page);
  await page.goto("/panier");
  await page.getByRole("link", { name: "Commander" }).click();
  await page.waitForURL(/\/commande\/adresses/);
  await page.locator("main").getByRole("button", { name: "Continuer" }).click();
  await expect(page.locator("main").getByText(MESSAGE).first()).toBeVisible();
  await expect(page).toHaveURL(/\/commande\/adresses/);
});

test("devis : refusé depuis le panier pour un cabinet en Corse", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await requete("site", `UPDATE adresse SET "codePostal" = '20000', ville = 'Ajaccio' WHERE "compteId" = $1`, [c.id]);
  await ajouterDepuisFiche(page, ELECTRODES);
  await page.goto("/panier");
  await page.locator("main").getByRole("button", { name: "Recevoir un devis" }).click();
  const statut = page.locator("#resultat-devis");
  await expect(statut).toContainText(MESSAGE);
  await expect(statut.getByRole("link", { name: "Nous contacter" })).toHaveAttribute("href", CONTACT);
});

test("CGV : France métropolitaine continentale, plus de « Corse comprise »", async ({ page }) => {
  await page.goto("/cgv");
  const main = page.locator("main");
  await expect(main).toContainText("réservée aux livraisons en France métropolitaine continentale");
  await expect(main).toContainText("Pour une livraison en Corse, en outre-mer ou à l'étranger");
  await expect(main).not.toContainText(/Corse comprise/i);
});
