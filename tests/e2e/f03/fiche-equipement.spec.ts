import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { connecterCompte, creerCompteValide } from "../f02/outils";
import { requete } from "./outils";

// T019 (US2, FR-010 à FR-017, FR-046, SC-002).

const FICHE = "/holter-ecg/dms-300-4l";

test("fiche : marque, nom, description, disponibilité, trois formules ; changement sans rechargement", async ({ page }) => {
  await page.goto(FICHE);
  await verifierAccessibilite(page);
  const main = page.locator("main");
  await expect(main.getByRole("heading", { level: 1 })).toHaveText("DMS 300-4L");
  await expect(main.getByText("DMS", { exact: true }).first()).toBeVisible();
  const panneau = page.getByTestId("panneau-formule");
  await expect(panneau).toContainText(/€ HT/);
  await expect(panneau).toContainText(/€ TTC/);
  await expect(panneau).toContainText("Disponible");

  // Marqueur : la page n'est pas rechargée quand la formule change.
  await page.evaluate(() => ((window as unknown as { __marqueur: number }).__marqueur = 1));
  const debut = Date.now();
  await main.getByText("Mise à disposition mensuelle (sans engagement)").click();
  await expect(panneau).toContainText("le premier mois");
  expect(Date.now() - debut).toBeLessThan(1_000);
  await expect(panneau).toContainText("/ mois ensuite");
  await expect(panneau).toContainText("Kit d’accessoires requis");
  await expect(panneau.getByRole("button", { name: "Ajouter la mise à disposition au panier" })).toBeVisible(); // F04

  await main.getByText("Financement longue durée").click();
  await expect(panneau).toContainText("Sur 24 mois");
  await expect(panneau).toContainText("Sur 60 mois");
  await expect(panneau).toContainText("Montant indicatif");
  await expect(panneau.getByRole("link", { name: "Demander mon financement" })).toHaveAttribute("href", /\/financement\/demande\?article=/);
  expect(await page.evaluate(() => (window as unknown as { __marqueur?: number }).__marqueur)).toBe(1);
  await expect(page).toHaveURL(/formule=financement/);
  await verifierAccessibilite(page);
});

test("pilules au clavier ; configuration : prix, référence et disponibilité suivent", async ({ page }) => {
  await page.goto(FICHE);
  const panneau = page.getByTestId("panneau-formule");
  const prixAvant = await panneau.locator("p").first().innerText();
  await page.getByRole("radio", { name: "Enregistreur + logiciel Cloud" }).focus();
  await page.keyboard.press("Space");
  await expect(panneau).toContainText("Réf. EC-DMS-3004L-CLOUD");
  await expect(panneau.locator("p").first()).not.toHaveText(prixAvant);
  await page.getByRole("radio", { name: "Acheter" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: /Mise à disposition mensuelle/ })).toBeChecked();
});

test("adresse partagée : la fiche s'ouvre sur la formule et la configuration choisies", async ({ page }) => {
  await page.goto(`${FICHE}?formule=financement&config=EC-DMS-3004L-PACK`);
  await expect(page.getByRole("radio", { name: "Financement longue durée" })).toBeChecked();
  await expect(page.getByRole("radio", { name: /Pack complet/ })).toBeChecked();
});

test("formule non proposée : absente du sélecteur", async ({ page }) => {
  await page.goto("/holter-tensionnel/suntech-mini-bravo");
  await expect(page.getByRole("radio", { name: "Acheter" })).toBeVisible();
  await expect(page.getByRole("radio", { name: /Mise à disposition/ })).toHaveCount(0);
});

test("ajout au panier sans compte : confirmation, ligne dans le panier", async ({ page }) => {
  await page.goto(FICHE);
  await page.getByTestId("panneau-formule").getByRole("button", { name: "Ajouter au panier" }).click();
  await expect(page.getByTestId("panneau-formule").getByRole("status")).toContainText("Ajouté au panier");
  await page.goto("/panier");
  await expect(page.locator("main")).toContainText("DMS 300-4L");
  await expect(page.locator("main")).toContainText("Réf. EC-DMS-3004L");
  await verifierAccessibilite(page);
});

test("mensualité forcée : visible du seul client concerné (FR-046)", async ({ page, browser, baseURL }) => {
  test.setTimeout(120_000);
  // Compte de test relié, le temps du test, à la fiche client fictive du Dr Delvaux-Arnoux (FICT-P-00007).
  const visiteur = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  const c = await creerCompteValide(await visiteur.newPage());
  await visiteur.close();
  await requete("site", `UPDATE compte_client SET "odooPartnerRef" = 'FICT-P-00007' WHERE id = $1`, [c.id]);
  try {
    const url = `${FICHE}?formule=financement&config=EC-DMS-3004L-CLOUD`;
    await connecterCompte(page.context(), c.email);
    await page.goto(url);
    await expect(page.getByTestId("panneau-formule")).toContainText("79,00 € HT / mois");

    const anonyme = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
    const autre = await anonyme.newPage();
    await autre.goto(url);
    await expect(autre.getByTestId("panneau-formule")).toContainText("Sur 48 mois");
    await expect(autre.getByTestId("panneau-formule")).not.toContainText("79,00 € HT / mois");
    await anonyme.close();
  } finally {
    await requete("site", `UPDATE compte_client SET "odooPartnerRef" = NULL WHERE id = $1`, [c.id]);
  }
});
