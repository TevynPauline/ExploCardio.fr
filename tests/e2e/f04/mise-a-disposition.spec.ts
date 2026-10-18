import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { COMPTES, connecterNavigateur } from "../session";
import { ELECTRODES, HOLTER, ajouterDepuisFiche, clientConnecte, jusquAuRecapitulatif, payerSurPageDemo, rendreParcDesTests, requete } from "./outils";

// T026 (US5, FR-018, FR-019, FR-029, D1) : mise à disposition mensuelle payée par SEPA ;
// panier mixte (achat puis abonnement, reprise depuis « Mon compte ») ; échéance mensuelle.

test.describe.configure({ timeout: 240_000 });
test.beforeEach(rendreParcDesTests);

async function abonnementsDe(partenaireRef: string) {
  return requete<{ ref: string; etat: string; serie: number | null }>(
    "demo",
    `SELECT s.ref, s.etat, s."numeroSerieId" AS serie FROM sale_subscription s JOIN res_partner p ON p.id = s."partenaireId" WHERE p.ref = $1`,
    [partenaireRef],
  );
}

async function facturesDe(partenaireRef: string) {
  return requete<{ numero: string }>("demo", `SELECT f.numero FROM account_move f JOIN res_partner p ON p.id = f."partenaireId" WHERE p.ref = $1`, [partenaireRef]);
}

test("mise à disposition par SEPA : récapitulatif mensuel, abonnement et matériel réservé, location et facture du 1er mois", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await ajouterDepuisFiche(page, HOLTER, "mise_a_disposition");
  await jusquAuRecapitulatif(page, { livraison: "aucune", abonnement: "sepa" });
  await verifierAccessibilite(page);
  const main = page.locator("main");
  await expect(main).toContainText("Premier mois TTC");
  await expect(main).toContainText("Mois suivants TTC");
  await expect(main).toContainText(/prélèvement le \d+ de chaque mois/);
  await expect(main).toContainText("Sans engagement");
  await page.getByLabel(/J’accepte les conditions générales de vente/).check();
  await page.getByRole("button", { name: "Autoriser le prélèvement mensuel" }).click();
  await payerSurPageDemo(page, { moyen: "Prélèvement SEPA" });
  await page.waitForURL(/\/commande\/confirmation\//);

  const abonnements = await abonnementsDe(c.partenaireRef);
  expect(abonnements).toHaveLength(1);
  expect(abonnements[0]!.serie).not.toBeNull(); // un appareil du parc lui est attribué
  expect(await facturesDe(c.partenaireRef)).toHaveLength(1);
  await expect.poll(async () => (await requete("site", `SELECT 1 FROM message_demonstration WHERE destinataire = $1 AND objet LIKE '%mise à disposition%'`, [c.email])).length).toBe(1);

  await page.goto("/mon-compte/locations");
  await verifierAccessibilite(page);
  await expect(page.getByRole("listitem", { name: `Location ${abonnements[0]!.ref}` })).toContainText("En cours");
  await page.goto("/mon-compte/factures");
  await expect(main.getByRole("link", { name: /FICT\/\d{4}\/\d+/ })).toHaveCount(1);
  await page.goto("/panier");
  await expect(main).toContainText(/panier est vide/i);

  // Échéance du mois suivant (simulée) : facture et email.
  const admin = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  await connecterNavigateur(admin, COMPTES.admin);
  const pageAdmin = await admin.newPage();
  await pageAdmin.goto("/admin/demonstration/paiements");
  await pageAdmin.getByLabel("Abonnement").selectOption(abonnements[0]!.ref);
  await pageAdmin.getByRole("button", { name: "Simuler l’échéance" }).click();
  await expect(pageAdmin.getByRole("status").filter({ hasText: "Échéance payée simulée" })).toBeVisible();
  await admin.close();
  await expect.poll(async () => (await facturesDe(c.partenaireRef)).length).toBe(2);
  await expect.poll(async () => (await requete("site", `SELECT 1 FROM message_demonstration WHERE destinataire = $1 AND objet LIKE '%échéance%'`, [c.email])).length).toBe(1);
});

test("panier mixte : achat payé puis abonnement refusé, repris depuis « Mon compte » sans repayer l'achat", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await ajouterDepuisFiche(page, ELECTRODES);
  await ajouterDepuisFiche(page, HOLTER, "mise_a_disposition");
  await jusquAuRecapitulatif(page);
  await page.getByLabel(/J’accepte les conditions générales de vente/).check();
  await page.getByRole("button", { name: /^Payer/ }).click();
  await payerSurPageDemo(page);
  // Achat payé : la session d'abonnement suit.
  await payerSurPageDemo(page, { moyen: "Carte Visa", issue: "Paiement refusé" });
  await page.waitForURL(/\/commande\/(recapitulatif|retour)/);

  const ventes = await requete("demo", `SELECT 1 FROM sale_order o JOIN res_partner p ON p.id = o."partenaireId" WHERE p.ref = $1`, [c.partenaireRef]);
  expect(ventes).toHaveLength(1);
  expect(await abonnementsDe(c.partenaireRef)).toHaveLength(0);

  await page.goto("/mon-compte/commandes");
  await page.getByRole("link", { name: "Autoriser le prélèvement mensuel" }).click();
  await page.waitForURL(/\/commande\/recapitulatif/);
  await page.getByRole("button", { name: "Autoriser le prélèvement mensuel" }).click();
  await payerSurPageDemo(page, { moyen: "Carte Visa" });
  await page.waitForURL(/\/commande\/confirmation\//);
  expect(await requete("demo", `SELECT 1 FROM sale_order o JOIN res_partner p ON p.id = o."partenaireId" WHERE p.ref = $1`, [c.partenaireRef])).toHaveLength(1);
  expect(await abonnementsDe(c.partenaireRef)).toHaveLength(1);
  await page.goto("/mon-compte/commandes");
  await expect(page.getByRole("link", { name: "Autoriser le prélèvement mensuel" })).toHaveCount(0);
});

test("panier mixte avec achat par virement : commande en attente puis abonnement payé aussitôt", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await ajouterDepuisFiche(page, ELECTRODES);
  await ajouterDepuisFiche(page, HOLTER, "mise_a_disposition");
  await jusquAuRecapitulatif(page, { achat: "virement" });
  await page.getByLabel(/J’accepte les conditions générales de vente/).check();
  await page.getByRole("button", { name: "Valider la commande" }).click();
  await payerSurPageDemo(page, { moyen: "Carte Visa" });
  await page.waitForURL(/\/commande\/confirmation\//);
  await expect(page.locator("main")).toContainText("IBAN");
  const [vente] = await requete<{ statut: string }>("demo", `SELECT o.statut FROM sale_order o JOIN res_partner p ON p.id = o."partenaireId" WHERE p.ref = $1`, [c.partenaireRef]);
  expect(vente!.statut).toBe("en_attente_paiement");
  expect(await abonnementsDe(c.partenaireRef)).toHaveLength(1);
});
