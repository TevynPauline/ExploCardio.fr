import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { ELECTRODES, HOLTER, ajouterDepuisFiche, clientConnecte, requete } from "./outils";

// T030 (US6, FR-033 à FR-037, SC-010, SC-011) : demande de financement depuis une fiche et
// depuis le panier ; statut visible dans « Mon compte » ; aucun nom d'organisme.

test.describe.configure({ timeout: 180_000 });

const ORGANISMES = /Grenke|Locam|BNP|Leasecom|Franfinance|Cofidis|Sofinco/i;

test("depuis une fiche : préremplie, durées, mention indicative, confirmation, email et statut « Reçue »", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  const debut = Date.now();
  await page.goto(HOLTER);
  await page.locator("main").getByText("Financement longue durée").click();
  await page.getByTestId("panneau-formule").getByRole("link", { name: "Demander mon financement" }).click();
  await page.waitForURL(/\/financement\/demande\?article=/);
  await verifierAccessibilite(page);
  const main = page.locator("main");
  await expect(main.getByLabel(/^Quantité \(DMS 300-4L/)).toHaveValue("1");
  for (const d of [24, 36, 48, 60]) await expect(main.getByRole("radio", { name: `${d} mois` })).toBeVisible();
  await main.getByRole("radio", { name: "36 mois" }).check();
  await expect(main).toContainText(/Mensualité indicative : .+ HT \/ mois sur 36 mois/);
  await expect(main).toContainText(/indicatif/i);
  await expect(main.getByLabel("Adresse du cabinet")).toHaveValue(/1 rue du Test/);
  await main.getByLabel("Nom du cabinet").fill("Cabinet de cardiologie du Test");
  expect(await main.textContent()).not.toMatch(ORGANISMES);
  await main.getByRole("button", { name: "Envoyer ma demande" }).click();

  await page.waitForURL(/\/mon-compte\/financements\?envoyee=1/);
  await verifierAccessibilite(page);
  await expect(page.getByRole("status").filter({ hasText: "Votre demande de financement a bien été envoyée" })).toBeVisible();
  await expect(main).toContainText("Statut : Reçue");
  await expect(main).toContainText("Sur 36 mois");
  expect(Date.now() - debut).toBeLessThan(180_000); // SC-010
  expect(await main.textContent()).not.toMatch(ORGANISMES);

  const [email] = await requete<{ rendu: string }>("site", `SELECT rendu FROM message_demonstration WHERE destinataire = $1 AND objet = 'Votre demande de financement'`, [c.email]);
  expect(email!.rendu).not.toMatch(ORGANISMES);
  const [d] = await requete<{ statut: string; opportunite: string | null }>(
    "site",
    `SELECT d.statut, d."opportuniteRef" AS opportunite FROM demande_financement d JOIN compte_client c ON c.id = d."compteId" WHERE c."odooPartnerRef" = $1`,
    [c.partenaireRef],
  );
  expect(d).toMatchObject({ statut: "recue", opportunite: expect.stringMatching(/CRM/) });
});

test("depuis le panier : seuls les équipements finançables proposés, puis retirés du panier", async ({ page, browser, baseURL }) => {
  await clientConnecte(browser, baseURL, page);
  await ajouterDepuisFiche(page, HOLTER);
  await ajouterDepuisFiche(page, ELECTRODES);
  await page.goto("/panier");
  await page.getByRole("link", { name: "Demander mon financement" }).click();
  await page.waitForURL(/\/financement\/demande\?depuis=panier/);
  const main = page.locator("main");
  await expect(main.getByLabel(/^Quantité \(DMS 300-4L/)).toBeVisible();
  await expect(main.getByLabel(/^Quantité \(Électrodes/)).toHaveCount(0);
  await main.getByRole("button", { name: "Envoyer ma demande" }).click();
  await page.waitForURL(/\/mon-compte\/financements/);
  await page.goto("/panier");
  await expect(main).toContainText("Électrodes Holter");
  await expect(main).not.toContainText("DMS 300-4L");
});
