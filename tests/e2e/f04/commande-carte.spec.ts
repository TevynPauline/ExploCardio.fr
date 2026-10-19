import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { accepterConditions, ELECTRODES, ajouterDepuisFiche, clientConnecte, jusquAuRecapitulatif, payerSurPageDemo, requete, stockDe } from "./outils";

// T016 (US2, FR-008 à FR-015, SC-004, SC-012, SC-013, SC-014).

test.describe.configure({ timeout: 180_000 });

test("commande payée par American Express : confirmation, email, commande et facture FICTIVE, stock décompté", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  const avant = await stockDe("EC-ELEC-HOLTER-50");
  const debut = Date.now();
  await ajouterDepuisFiche(page, ELECTRODES);
  await page.goto("/panier");
  await page.getByRole("link", { name: "Commander" }).click();
  await page.waitForURL(/\/commande\/adresses/);
  await verifierAccessibilite(page);
  await expect(page.getByLabel("Adresse").first()).toHaveValue("1 rue du Test");
  await expect(page.getByRole("navigation", { name: "Étapes de la commande" }).locator('[aria-current="step"]')).toHaveText("Adresses");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForURL(/\/commande\/livraison/);
  await verifierAccessibilite(page);
  await expect(page.locator("main")).toContainText(/Livraison standard/);
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForURL(/\/commande\/paiement/);
  await verifierAccessibilite(page);
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForURL(/\/commande\/recapitulatif/);
  await verifierAccessibilite(page);
  await expect(page.locator("main")).toContainText("Électrodes Holter");
  await expect(page.locator("main")).toContainText("Total TTC");

  // CGV obligatoires.
  await page.getByRole("button", { name: /^Payer/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: "conditions générales de vente" })).toBeVisible();
  await accepterConditions(page);
  await page.getByRole("button", { name: /^Payer/ }).click();
  await payerSurPageDemo(page);

  await page.waitForURL(/\/commande\/confirmation\//);
  await verifierAccessibilite(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Merci, votre commande est confirmée");
  expect(Date.now() - debut).toBeLessThan(120_000); // SC-004

  const commandes = await requete<{ ref: string; statut: string }>("demo", `SELECT o.ref, o.statut FROM sale_order o JOIN res_partner p ON p.id = o."partenaireId" WHERE p.ref = $1`, [c.partenaireRef]);
  expect(commandes).toHaveLength(1);
  expect(await stockDe("EC-ELEC-HOLTER-50")).toBe(avant - 1);
  await expect.poll(async () => (await requete("site", `SELECT 1 FROM message_demonstration WHERE destinataire = $1 AND objet LIKE 'Votre commande %'`, [c.email])).length).toBe(1);

  await page.goto("/mon-compte/commandes");
  await verifierAccessibilite(page);
  await page.getByRole("link", { name: `Commande ${commandes[0]!.ref}` }).click();
  await expect(page.locator("main")).toContainText("Payée");
  const lien = page.getByRole("link", { name: /Facture FICT\/\d{4}\/\d+ \(PDF\)/ });
  const r = await page.request.get((await lien.getAttribute("href"))!);
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toBe("application/pdf");
  // La mention « FICTIVE » du PDF est vérifiée par les tests de contrat d'Odoo (F11).
  expect((await r.body()).byteLength).toBeGreaterThan(500);
  await page.goto("/mon-compte/factures");
  await verifierAccessibilite(page);
  await expect(page.locator("main")).toContainText("Facture FICT/");
});

test("reprise du tunnel à l'étape quittée, sans ressaisie", async ({ page, browser, baseURL }) => {
  await clientConnecte(browser, baseURL, page);
  await ajouterDepuisFiche(page, ELECTRODES);
  await jusquAuRecapitulatif(page);
  await page.goto("/panier");
  await page.getByRole("link", { name: "Commander" }).click();
  // Les étapes déjà faites restent accessibles et remplies.
  await page.getByRole("navigation", { name: "Étapes de la commande" }).getByRole("link", { name: "Récapitulatif" }).click();
  await expect(page).toHaveURL(/\/commande\/recapitulatif/);
  await expect(page.locator("main")).toContainText("Livraison standard");
});

test("compte en attente de validation : tunnel refusé avec explication, panier conservé", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await requete("site", `UPDATE compte_client SET statut = 'en_attente' WHERE id = $1`, [c.id]);
  await ajouterDepuisFiche(page, ELECTRODES);
  await page.goto("/commande/adresses");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Commande impossible pour le moment");
  await expect(page.locator("main").getByRole("alert")).toContainText("cours de vérification");
  await page.goto("/panier");
  await expect(page.locator("main")).toContainText("Électrodes Holter");
});

test("SC-012 : tout le tunnel au clavier", async ({ page, browser, baseURL }) => {
  await clientConnecte(browser, baseURL, page);
  await ajouterDepuisFiche(page, ELECTRODES);
  await page.goto("/commande/adresses");
  const suivant = async (url: RegExp) => {
    await page.getByRole("button", { name: "Continuer" }).focus();
    await page.keyboard.press("Enter");
    await page.waitForURL(url);
  };
  await suivant(/\/commande\/livraison/);
  await page.getByRole("radio", { name: /Livraison standard/ }).focus();
  await page.keyboard.press("Space");
  await suivant(/\/commande\/paiement/);
  await suivant(/\/commande\/recapitulatif/);
  await page.getByLabel(/J’accepte les conditions générales de vente/).focus();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: /^Payer/ }).focus();
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/demo\/paiement/);
});
