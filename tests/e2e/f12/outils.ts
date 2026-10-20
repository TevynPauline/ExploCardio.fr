import { expect, type Browser, type Page } from "@playwright/test";
import { accepterConditions, jusquAuRecapitulatif, payerSurPageDemo, requete } from "../f04/outils";
import { composerPanier, ecranDemo, payerParCarte } from "../f06/outils";

export { accepterConditions, clientConnecte, payerSurPageDemo, rendreParcDesTests, requete } from "../f04/outils";
export { composerPanier, ecranDemo, nombreEmails, payerParCarte } from "../f06/outils";

// Outils des parcours de F12 : location ou achat d'un Holter « + logiciel Cloud », accès Cloud.

export const HOLTER = "/holter-ecg/dms-300-4l";
export const CONFIG_CLOUD = "EC-DMS-3004L-CLOUD";
export const HOLTER_CLOUD = "EC-DMS-CS-HOLTER-CLOUD";

/** Location d'un Holter « + logiciel Cloud » (kit compris), payée : renvoie la référence de la location. */
export async function louerHolterCloud(page: Page, partenaireRef: string) {
  await page.goto(HOLTER);
  await page.locator("main").getByText("Mise à disposition mensuelle (sans engagement)").click();
  await page.getByTestId("panneau-formule").getByRole("button", { name: "Ajouter la mise à disposition au panier" }).click();
  await page.locator("main").getByRole("status").filter({ hasText: "Ajouté au panier" }).first().waitFor();
  await jusquAuRecapitulatif(page, { abonnement: "sepa" });
  await accepterConditions(page);
  await page.getByRole("button", { name: /^Payer/ }).click();
  await payerSurPageDemo(page);
  await page.waitForURL(/\/commande\/(confirmation|retour)/);
  await page.locator("main").getByRole("link", { name: "Autoriser le prélèvement mensuel" }).click();
  await page.waitForURL(/\/commande\/recapitulatif/);
  await page.getByRole("button", { name: "Autoriser le prélèvement mensuel" }).click();
  await payerSurPageDemo(page, { moyen: "Prélèvement SEPA" });
  await page.waitForURL(/\/commande\/confirmation\//);
  const [l] = await requete<{ ref: string }>(
    "demo",
    `SELECT s.ref FROM sale_subscription s JOIN res_partner p ON p.id = s."partenaireId" WHERE p.ref = $1 AND s.objet = 'mise_a_disposition' ORDER BY s.id DESC`,
    [partenaireRef],
  );
  return l!.ref;
}

/** Achat d'une configuration « + logiciel Cloud » payé par carte. */
export async function acheterHolterCloud(page: Page, email: string) {
  await composerPanier(page, email, { [CONFIG_CLOUD]: 1 });
  await payerParCarte(page);
}

/** Expédition au démonstrateur (ce que l'équipe fait dans Odoo). */
export async function expedier(browser: Browser, baseURL: string | undefined, ref: string) {
  await ecranDemo(browser, baseURL, "/admin/demonstration/locations", async (admin) => {
    await admin.getByRole("listitem", { name: `Location ${ref}` }).getByRole("button", { name: "Préparer et expédier" }).click();
    await expect(admin.getByRole("status").filter({ hasText: `Location ${ref} expédiée` })).toBeVisible();
  });
}

export async function accesDe(partenaireRef: string) {
  return requete<{ id: string; logiciel: string; etat: string; origine: string; finPrevue: Date | null; sourceRef: string | null }>(
    "site",
    `SELECT id, logiciel, etat, origine, "finPrevue", "sourceRef" FROM acces_logiciel WHERE "partenaireRef" = $1 ORDER BY "creeLe"`,
    [partenaireRef],
  );
}

/** « Avancer la date » au démonstrateur : actions planifiées d'Odoo, suivi, échéances des accès Cloud. */
export async function avancerJusquAu(browser: Browser, baseURL: string | undefined, jour: Date) {
  await ecranDemo(browser, baseURL, "/admin/demonstration/locations", async (admin) => {
    await admin.getByLabel("Date simulée").fill(jour.toISOString().slice(0, 10));
    await admin.getByRole("button", { name: "Exécuter les actions planifiées" }).click();
    await expect(admin.locator("main").getByRole("status")).toBeVisible();
  });
}

export async function livrer(browser: Browser, baseURL: string | undefined, ref: string) {
  await ecranDemo(browser, baseURL, "/admin/demonstration/locations", async (admin) => {
    await admin.getByRole("button", { name: `Marquer livrée (${ref})` }).click();
    await expect(admin.getByRole("status").filter({ hasText: `Location ${ref} livrée` })).toBeVisible();
  });
}
