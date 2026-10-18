import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { COMPTES, connecterNavigateur } from "../session";
import { ELECTRODES, ajouterDepuisFiche, clientConnecte, jusquAuRecapitulatif, requete, stockDe } from "./outils";

// T024 (US4, FR-016, FR-017, R6) : commande par virement, réservée, RIB et référence ;
// virement reçu par l'équipe → commande payée, facturée, client prévenu.

test.describe.configure({ timeout: 180_000 });

test("virement : commande en attente avec RIB, puis virement reçu → payée et facturée", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  const avant = await stockDe("EC-ELEC-HOLTER-50");
  await ajouterDepuisFiche(page, ELECTRODES);
  await jusquAuRecapitulatif(page, { achat: "virement" });
  await expect(page.locator("main")).toContainText("Virement bancaire");
  await page.getByLabel(/J’accepte les conditions générales de vente/).check();
  await page.getByRole("button", { name: /^(Payer|Commander|Valider)/ }).click();

  await page.waitForURL(/\/commande\/confirmation\//);
  await verifierAccessibilite(page);
  const main = page.locator("main");
  await expect(main).toContainText("IBAN");
  const [cmd] = await requete<{ ref: string; statut: string; montant: number }>(
    "demo",
    `SELECT o.ref, o.statut, o."montantTtcCentimes" AS montant FROM sale_order o JOIN res_partner p ON p.id = o."partenaireId" WHERE p.ref = $1`,
    [c.partenaireRef],
  );
  expect(cmd!.statut).toBe("en_attente_paiement");
  await expect(main).toContainText(cmd!.ref);
  expect(await stockDe("EC-ELEC-HOLTER-50")).toBe(avant - 1); // réservé pour la commande
  await expect.poll(async () => (await requete<{ rendu: string }>("site", `SELECT rendu FROM message_demonstration WHERE destinataire = $1 AND objet LIKE 'Votre commande %'`, [c.email]))[0]?.rendu ?? "").toContain("IBAN");

  await page.goto("/mon-compte/commandes");
  await expect(main).toContainText("En attente de paiement");

  // L'équipe constate le virement dans Odoo (ici : outil de démonstration).
  const admin = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  const pageAdmin = await admin.newPage();
  await connecterNavigateur(admin, COMPTES.admin);
  await pageAdmin.goto("/admin/demonstration/paiements");
  const ligne = pageAdmin.getByRole("listitem", { name: `Commande ${cmd!.ref}` });
  await ligne.getByRole("button", { name: "Virement reçu" }).click();
  await expect(pageAdmin.getByRole("status").filter({ hasText: `Virement enregistré pour ${cmd!.ref}` })).toBeVisible();
  await admin.close();

  const [apres] = await requete<{ statut: string }>("demo", `SELECT statut FROM sale_order WHERE ref = $1`, [cmd!.ref]);
  expect(apres!.statut).not.toBe("en_attente_paiement");
  expect(await requete("site", `SELECT 1 FROM message_demonstration WHERE destinataire = $1 AND objet LIKE 'Paiement reçu%'`, [c.email])).toHaveLength(1);
  await page.goto(`/mon-compte/commandes`);
  await page.getByRole("link", { name: `Commande ${cmd!.ref}` }).click();
  await expect(main).toContainText("Payée");
  await expect(page.getByRole("link", { name: /Facture FICT\/\d{4}\/\d+ \(PDF\)/ })).toBeVisible();
});
