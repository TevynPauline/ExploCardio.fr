import type { Browser, Page } from "@playwright/test";
import { requete } from "../bases";
import { attacherFiche, connecterCompte, creerCompteValide } from "../f02/outils";

export { requete };

/** Ajoute un article au panier depuis sa fiche (formule achat ou mise à disposition). */
export async function ajouterDepuisFiche(page: Page, chemin: string, formule: "achat" | "mise_a_disposition" = "achat") {
  await page.goto(chemin);
  const panneau = page.getByTestId("panneau-formule");
  if (formule === "mise_a_disposition") {
    await page.locator("main").getByText("Mise à disposition mensuelle (sans engagement)").click();
    await panneau.getByRole("button", { name: "Ajouter la mise à disposition au panier" }).click();
  } else if (await panneau.count()) {
    await panneau.getByRole("button", { name: "Ajouter au panier" }).click();
  } else {
    await page.locator("main").getByRole("button", { name: "Ajouter au panier" }).first().click();
  }
  await page.locator("main").getByRole("status").filter({ hasText: "Ajouté au panier" }).first().waitFor();
}

export const HOLTER = "/holter-ecg/dms-300-4l";
export const ELECTRODES = "/accessoires-consommables/electrodes-holter";


/** Compte client validé, avec sa fiche fictive dans Odoo, connecté dans ce contexte. */
export async function clientConnecte(browser: Browser, baseURL: string | undefined, page: Page) {
  const visiteur = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  const c = await creerCompteValide(await visiteur.newPage());
  await visiteur.close();
  const partenaireRef = await attacherFiche(c);
  await connecterCompte(page.context(), c.email);
  return { ...c, partenaireRef };
}

/** Du panier au récapitulatif : adresses préremplies, livraison, moyen de paiement. */
export async function jusquAuRecapitulatif(page: Page, options: { livraison?: string; achat?: "carte" | "virement"; abonnement?: "carte" | "sepa" } = {}) {
  await page.goto("/panier");
  await page.getByRole("link", { name: "Commander" }).click();
  await page.waitForURL(/\/commande\/adresses/);
  await page.getByRole("button", { name: "Continuer" }).click();
  // Étape « Livraison » : mode des achats ; date de chaque mise à disposition (F05, au plus tôt par défaut).
  await page.waitForURL(/\/commande\/livraison/);
  if (options.livraison !== "aucune") await page.getByRole("radio", { name: new RegExp(options.livraison ?? "Livraison standard") }).check();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForURL(/\/commande\/paiement/);
  if (options.achat === "virement") await page.getByRole("radio", { name: /Virement bancaire/ }).check();
  if (options.abonnement === "sepa") await page.getByRole("radio", { name: /Prélèvement SEPA/ }).check();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForURL(/\/commande\/recapitulatif/);
}

/** Sur la page de paiement de démonstration : moyen, issue, options. */
export async function payerSurPageDemo(page: Page, options: { moyen?: string; issue?: string; tardif?: boolean; repete?: boolean; apres?: string } = {}) {
  // `apres` : adresse de la page de paiement précédente, à quitter d'abord (panier mixte).
  await page.waitForURL((u) => /\/demo\/paiement/.test(u.pathname) && u.href !== options.apres);
  await page.getByRole("radio", { name: options.moyen ?? "Carte American Express" }).check();
  await page.getByRole("radio", { name: options.issue ?? "Paiement accepté" }).check();
  if (options.tardif) await page.getByRole("checkbox", { name: /Confirmation tardive/ }).check();
  if (options.repete) await page.getByRole("checkbox", { name: /Confirmation répétée/ }).check();
  const adresse = page.url();
  await page.getByRole("button", { name: "Valider" }).click();
  return adresse;
}

export async function stockDe(defaultCode: string): Promise<number> {
  const [s] = await requete<{ quantite: number }>("demo", `SELECT s.quantite FROM stock_quant s JOIN product_product v ON v.id = s."varianteId" WHERE v."defaultCode" = $1`, [defaultCode]);
  return s!.quantite;
}

/** Rend au parc les appareils loués par les comptes de test (le parc fictif est limité). */
export async function rendreParcDesTests() {
  await requete(
    "demo",
    `WITH fin AS (
       UPDATE sale_subscription SET etat = 'terminee', fin = now()
       WHERE etat NOT IN ('terminee', 'annulee') AND "numeroSerieId" IS NOT NULL
         AND "partenaireId" IN (SELECT id FROM res_partner WHERE ref LIKE 'FICT-P-E2E-%' OR email LIKE 'compte-%@demo.explocardio.test' OR email LIKE 'commande-%@demo.explocardio.test')
       RETURNING "numeroSerieId")
     UPDATE stock_lot SET statut = 'disponible' WHERE id IN (SELECT "numeroSerieId" FROM fin)`,
  );
  // Appareils mis « en maintenance » par les tests de retour (sans date de retour prévue).
  await requete("demo", `UPDATE stock_lot SET statut = 'disponible' WHERE statut = 'en_maintenance' AND "retourPrevu" IS NULL`);
  // Réservations d'appareils restées actives (paiements de test abandonnés, F05).
  await requete(
    "demo",
    `WITH r AS (UPDATE stock_lot_reservation SET etat = 'liberee' WHERE etat = 'active' RETURNING "numeroSerieId", "statutAvant")
     UPDATE stock_lot l SET statut = r."statutAvant" FROM r WHERE l.id = r."numeroSerieId" AND l.statut = 'loue'`,
  );
}

/** Récapitulatif : CGV acceptées, et conditions de location s'il y a une mise à disposition (F05). */
export async function accepterConditions(page: Page) {
  await page.getByLabel(/J’accepte les conditions générales de vente/).check();
  const conditions = page.getByLabel(/J’accepte les conditions de location/);
  if (await conditions.count()) await conditions.check();
}
