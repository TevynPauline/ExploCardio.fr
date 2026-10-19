import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { CARTE_SD, ELECTRODES, PANIER_1200, clientConnecte, commandesDe, composerPanier, payerParCarte, reapprovisionner, ajouterDepuisFiche } from "./outils";

// T010 (US1, FR-024, SC-001, A2, A3) : gains annoncés au panier et sur les fiches, y compris pour
// un visiteur ; commande de 1 200 € HT payée → 120 € dans « Mon compte » ; confirmation d'une
// commande sous le seuil des droits → ce qui manquait est indiqué.

test.describe.configure({ timeout: 240_000 });

test("visiteur : la fiche et le panier annoncent ce que l'achat rapporte", async ({ page }) => {
  await reapprovisionner(["EC-ELEC-HOLTER-50"]);
  await page.goto(ELECTRODES);
  await expect(page.getByRole("region", { name: "Cet achat compte pour vos avantages" })).toBeVisible();
  await ajouterDepuisFiche(page, ELECTRODES);
  await page.goto("/panier");
  const gains = page.getByRole("region", { name: "Ce que cette commande vous rapporte" });
  await expect(gains).toContainText("Pas encore de bons d'achat pour ce montant.");
  await expect(gains).toContainText(/Encore .* HT de consommables pour passer à 5 %/);
  await expect(gains).toContainText(/pour ouvrir l'assistance gratuite/);
  await verifierAccessibilite(page);
});

test("commande de 1 200 € HT : 120 € annoncés, crédités et visibles dans « Mon compte » (SC-001)", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await composerPanier(page, c.email, PANIER_1200);
  await page.goto("/panier");
  const gains = page.getByRole("region", { name: "Ce que cette commande vous rapporte" });
  await expect(gains).toContainText("120,00 € HT de bons d'achat (10 % des consommables et accessoires)");
  await expect(gains).toContainText("Elle vous ouvre l'assistance gratuite");

  await payerParCarte(page);
  const avantages = page.getByRole("region", { name: "Vos avantages" });
  await expect(avantages).toContainText("120,00 € HT de bons d'achat ont été ajoutés à votre cagnotte.");
  await expect(avantages).toContainText("Votre assistance gratuite (hotline et SAV réactif) court jusqu");
  await verifierAccessibilite(page);

  await page.goto("/mon-compte/bons-achat");
  await expect(page.locator("main")).toContainText("120,00 € HT");
  const [commande] = await commandesDe(c.partenaireRef);
  await expect(page.getByRole("row", { name: new RegExp(`Crédit.*${commande!.ref}`) })).toBeVisible();
});

test("commande sous le seuil des droits : la confirmation dit ce qui manquait (A2)", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await composerPanier(page, c.email, { [CARTE_SD]: 4 });
  await payerParCarte(page);
  const avantages = page.getByRole("region", { name: "Vos avantages" });
  await expect(avantages).toContainText(/Il manquait .* HT de consommables pour ouvrir l'assistance gratuite/);
});
