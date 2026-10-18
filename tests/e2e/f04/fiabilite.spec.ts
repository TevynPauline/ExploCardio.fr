import { expect, test } from "@playwright/test";
import { COMPTES, connecterNavigateur } from "../session";
import { ELECTRODES, ajouterDepuisFiche, clientConnecte, jusquAuRecapitulatif, payerSurPageDemo, requete, stockDe } from "./outils";

// T021 (US3, FR-021 à FR-025, SC-002, SC-007). Pannes et stocks rétablis en attendant la confirmation.

test.describe.configure({ mode: "serial", timeout: 180_000 });

async function commandesDuPartenaire(ref: string) {
  return requete<{ ref: string }>("demo", `SELECT o.ref FROM sale_order o JOIN res_partner p ON p.id = o."partenaireId" WHERE p.ref = $1`, [ref]);
}

async function payer(page: import("@playwright/test").Page) {
  await page.getByLabel(/J’accepte les conditions générales de vente/).check();
  await page.getByRole("button", { name: /^Payer/ }).click();
}

test("paiement refusé : message, panier et saisies conservés, nouvelle tentative acceptée (une seule commande)", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  const avant = await stockDe("EC-ELEC-HOLTER-50");
  await ajouterDepuisFiche(page, ELECTRODES);
  await jusquAuRecapitulatif(page);
  await payer(page);
  await payerSurPageDemo(page, { issue: "Paiement refusé" });
  await page.waitForURL(/\/commande\/retour/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Paiement refusé");
  await expect(page.locator("main").getByRole("alert")).toContainText("Votre panier et vos saisies sont conservés");
  expect(await stockDe("EC-ELEC-HOLTER-50")).toBe(avant); // réservation libérée
  await page.getByRole("link", { name: "Réessayer" }).click();
  await expect(page.locator("main")).toContainText("Livraison standard"); // saisies conservées
  await payer(page);
  await payerSurPageDemo(page);
  await page.waitForURL(/\/commande\/confirmation\//);
  expect(await commandesDuPartenaire(c.partenaireRef)).toHaveLength(1);
});

test("authentification forte abandonnée : traitée comme un refus", async ({ page, browser, baseURL }) => {
  await clientConnecte(browser, baseURL, page);
  await ajouterDepuisFiche(page, ELECTRODES);
  await jusquAuRecapitulatif(page);
  await payer(page);
  await payerSurPageDemo(page, { issue: "Authentification forte demandée (3-D Secure)" });
  await page.waitForURL(/etape=authentification/);
  await page.getByRole("button", { name: "Refuser" }).click();
  await page.waitForURL(/\/commande\/retour/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Paiement refusé");
});

test("confirmation répétée : une seule commande ; double clic sur « Payer » : une seule session", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await ajouterDepuisFiche(page, ELECTRODES);
  await jusquAuRecapitulatif(page);
  await page.getByLabel(/J’accepte les conditions générales de vente/).check();
  await page.getByRole("button", { name: /^Payer/ }).dblclick();
  await page.waitForURL(/\/demo\/paiement/);
  const ref = (await requete<{ ref: string }>("site", `SELECT c.ref FROM commande_site c JOIN compte_client cc ON cc.id = c."compteId" WHERE cc.id = $1`, [c.id]))[0]!.ref;
  expect(await requete("demo", `SELECT 1 FROM payment_session_demo WHERE "commandeRef" = $1`, [ref])).toHaveLength(1);
  await payerSurPageDemo(page, { repete: true });
  await page.waitForURL(/\/commande\/confirmation\//);
  expect(await commandesDuPartenaire(c.partenaireRef)).toHaveLength(1);
});

test("confirmation tardive après fermeture de la page : commande créée, email envoyé, panier vidé", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await ajouterDepuisFiche(page, ELECTRODES);
  await jusquAuRecapitulatif(page);
  await payer(page);
  await payerSurPageDemo(page, { tardif: true });
  await page.waitForURL(/\/commande\/retour/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Paiement en cours de confirmation");
  await page.goto("/"); // le client quitte la page
  await expect.poll(async () => (await commandesDuPartenaire(c.partenaireRef)).length, { timeout: 90_000, intervals: [3_000] }).toBe(1);
  await expect.poll(async () => (await requete("site", `SELECT 1 FROM message_demonstration WHERE destinataire = $1 AND objet LIKE 'Votre commande %'`, [c.email])).length).toBe(1);
  await page.goto("/panier");
  await expect(page.getByRole("heading", { name: "Votre panier est vide" })).toBeVisible();
});

test("article épuisé juste avant le paiement : alerte avant de payer, retour au panier", async ({ page, browser, baseURL }) => {
  await clientConnecte(browser, baseURL, page);
  await ajouterDepuisFiche(page, "/holter-tensionnel/suntech-mini-bravo");
  await jusquAuRecapitulatif(page);
  const [s] = await requete<{ quantite: number; etatHorsStock: string }>("demo", `SELECT s.quantite, s."etatHorsStock" FROM stock_quant s JOIN product_product v ON v.id = s."varianteId" WHERE v."defaultCode" = 'EC-SUN-MINIBRAVO'`);
  await requete("demo", `UPDATE stock_quant SET quantite = 0, "etatHorsStock" = 'indisponible' WHERE "varianteId" = (SELECT id FROM product_product WHERE "defaultCode" = 'EC-SUN-MINIBRAVO')`);
  try {
    await payer(page);
    await page.waitForURL(/\/panier\?alerte=/);
    await expect(page.locator("main")).toContainText("Indisponible pour le moment");
  } finally {
    await requete("demo", `UPDATE stock_quant SET quantite = $1, "etatHorsStock" = $2 WHERE "varianteId" = (SELECT id FROM product_product WHERE "defaultCode" = 'EC-SUN-MINIBRAVO')`, [s!.quantite, s!.etatHorsStock]);
  }
});

test("service de paiement en panne : message, rien de débité, panier conservé", async ({ page, browser, baseURL }) => {
  await clientConnecte(browser, baseURL, page);
  await ajouterDepuisFiche(page, ELECTRODES);
  await jusquAuRecapitulatif(page);
  const equipe = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  await connecterNavigateur(equipe, COMPTES.admin);
  const admin = await equipe.newPage();
  const carte = admin.locator(".ec-card", { hasText: "Stripe" });
  await admin.goto("/admin/demonstration/pannes");
  await carte.getByRole("button", { name: "Simuler une panne" }).click();
  await expect(carte.getByRole("button", { name: "Rétablir" })).toBeVisible();
  try {
    await payer(page);
    await expect(page.locator("main").getByRole("alert")).toContainText("Le service de paiement est momentanément indisponible");
    await page.goto("/panier");
    await expect(page.locator("main")).toContainText("Électrodes Holter");
  } finally {
    await carte.getByRole("button", { name: "Rétablir" }).click();
    await expect(carte.getByRole("button", { name: "Simuler une panne" })).toBeVisible();
    await equipe.close();
  }
});
