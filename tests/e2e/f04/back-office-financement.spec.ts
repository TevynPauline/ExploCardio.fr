import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { COMPTES, connecterNavigateur } from "../session";
import { clientConnecte, requete, stockDe } from "./outils";

// T035 (US8, FR-036, FR-038, FR-039, FR-047) : traitement d'une demande de financement dans
// le back-office ; commandes du site en lecture seule ; support sans accès aux financements.

test.describe.configure({ timeout: 240_000 });

test("demande traitée : en étude, accordée, note interne invisible du client, commande financée", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await page.goto(`/financement/demande?article=EC-DMS-3004L`);
  await page.locator("main").getByLabel("Nom du cabinet").fill("Cabinet Back-office Test");
  await page.getByRole("button", { name: "Envoyer ma demande" }).click();
  await page.waitForURL(/\/mon-compte\/financements/);
  const [demande] = await requete<{ id: string }>(
    "site",
    `SELECT d.id FROM demande_financement d JOIN compte_client c ON c.id = d."compteId" WHERE c."odooPartnerRef" = $1`,
    [c.partenaireRef],
  );
  const id = demande!.id;

  const admin = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  await connecterNavigateur(admin, COMPTES.admin);
  const bo = await admin.newPage();
  await bo.goto("/admin/financements");
  await verifierAccessibilite(bo);
  await bo.getByRole("link", { name: "Cabinet Back-office Test" }).click();
  await bo.waitForURL(new RegExp(`/admin/financements/${id}`));
  await verifierAccessibilite(bo);

  await bo.getByLabel("Ajouter une note").fill("Dossier complet, transmis au partenaire.");
  await bo.getByRole("button", { name: "Ajouter la note" }).click();
  await expect(bo.getByRole("status").filter({ hasText: "Note interne ajoutée" })).toBeVisible();

  await bo.getByLabel("Nouveau statut").selectOption("en_etude");
  await bo.getByRole("button", { name: "Enregistrer le statut" }).click();
  await expect(bo.getByRole("status").filter({ hasText: "le client a été prévenu" })).toBeVisible();

  await page.goto("/mon-compte/financements");
  await expect(page.locator("main")).toContainText("Statut : En étude");
  await expect(page.locator("main")).not.toContainText("Dossier complet");

  await bo.getByLabel("Nouveau statut").selectOption("accordee");
  await bo.getByRole("button", { name: "Enregistrer le statut" }).click();
  await expect.poll(async () => (await requete("site", `SELECT 1 FROM message_demonstration WHERE destinataire = $1 AND objet = 'Votre demande de financement'`, [c.email])).length).toBe(3);
  await expect(bo.getByRole("button", { name: "Créer la commande financée" })).toBeVisible();
  const journal = await requete<{ action: string }>("site", `SELECT action FROM journal_action WHERE objet = $1`, [id]);
  expect(journal.map((j) => j.action)).toEqual(expect.arrayContaining(["financement.demande", "financement.note", "financement.statut"]));

  // Article épuisé : la commande financée est refusée.
  const stock = (q: number) => requete("demo", `UPDATE stock_quant SET quantite = $1 WHERE "varianteId" = (SELECT id FROM product_product WHERE "defaultCode" = 'EC-DMS-3004L')`, [q]);
  await stock(0);
  await bo.getByRole("button", { name: "Créer la commande financée" }).click();
  await expect(bo.getByRole("alert").filter({ hasText: "Stock insuffisant" })).toBeVisible();
  await stock(50);
  const stockAvant = await stockDe("EC-DMS-3004L");
  await bo.getByRole("button", { name: "Créer la commande financée" }).click();
  await expect(bo.getByRole("status").filter({ hasText: "Commande financée créée" })).toBeVisible();
  expect(await stockDe("EC-DMS-3004L")).toBe(stockAvant - 1);
  await admin.close();

  const [cmd] = await requete<{ ref: string; financee: boolean }>(
    "demo",
    `SELECT o.ref, o.financee FROM sale_order o JOIN res_partner p ON p.id = o."partenaireId" WHERE p.ref = $1`,
    [c.partenaireRef],
  );
  expect(cmd!.financee).toBe(true);
  expect(await requete("demo", `SELECT 1 FROM account_move f JOIN res_partner p ON p.id = f."partenaireId" WHERE p.ref = $1`, [c.partenaireRef])).toHaveLength(0);
  await page.goto("/mon-compte/financements");
  await page.getByRole("link", { name: `Commande ${cmd!.ref}` }).click();
  await expect(page.locator("main")).toContainText("commande financée (aucun montant à régler sur le site)");
});

test("commandes du site en lecture seule ; le support n'accède pas aux financements", async ({ browser, baseURL }) => {
  const admin = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  await connecterNavigateur(admin, COMPTES.admin);
  const bo = await admin.newPage();
  await bo.goto("/admin/commandes");
  await verifierAccessibilite(bo);
  await expect(bo.getByRole("heading", { level: 1 })).toHaveText("Commandes du site");
  await expect(bo.locator("main").getByRole("button")).toHaveCount(0);
  await bo.getByRole("link", { name: /À enregistrer/ }).click();
  await expect(bo).toHaveURL(/vue=anomalies/);
  await admin.close();

  const support = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  await connecterNavigateur(support, COMPTES.support);
  const p = await support.newPage();
  await p.goto("/admin");
  await expect(p.getByRole("navigation", { name: "Back-office" }).getByRole("link", { name: "Financements" })).toHaveCount(0);
  await expect(p.getByRole("navigation", { name: "Back-office" }).getByRole("link", { name: "Commandes" })).toBeVisible();
  await p.goto("/admin/financements");
  await expect(p).toHaveURL(/acces=refuse/);
  await support.close();
});
