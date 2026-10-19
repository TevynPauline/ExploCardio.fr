import type { Page } from "@playwright/test";
import { requete } from "../bases";

export { accepterConditions, ajouterDepuisFiche, clientConnecte, jusquAuRecapitulatif, payerSurPageDemo, rendreParcDesTests, requete } from "../f04/outils";

export const OSCAR = "/holter-tensionnel/suntech-oscar-2";

/** Modifie un paramètre du site le temps d'un test ; renvoie la fonction qui le rétablit. */
export async function parametre(cle: string, valeur: string): Promise<() => Promise<void>> {
  const [avant] = await requete<{ valeur: string }>("site", `SELECT valeur FROM parametre WHERE cle = $1`, [cle]);
  await requete("site", `INSERT INTO parametre (cle, valeur, "modifieLe") VALUES ($1, $2, now()) ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur, "modifieLe" = now()`, [cle, valeur]);
  return async () => {
    if (avant) await requete("site", `UPDATE parametre SET valeur = $2 WHERE cle = $1`, [cle, avant.valeur]);
    else await requete("site", `DELETE FROM parametre WHERE cle = $1`, [cle]);
  };
}

/** Locations Odoo (base fictive) d'un client de test. */
export async function locationsDe(partenaireRef: string) {
  return requete<{ ref: string; etat: string; dateLivraison: Date | null; serie: number | null }>(
    "demo",
    `SELECT s.ref, s.etat, s."dateLivraison", s."numeroSerieId" AS serie FROM sale_subscription s JOIN res_partner p ON p.id = s."partenaireId" WHERE p.ref = $1 ORDER BY s.id`,
    [partenaireRef],
  );
}

/** Ajoute la mise à disposition d'un équipement au panier depuis sa fiche. */
export async function ajouterMad(page: Page, chemin = OSCAR) {
  const { ajouterDepuisFiche } = await import("../f04/outils");
  await ajouterDepuisFiche(page, chemin, "mise_a_disposition");
}

/** Client connecté avec une mise à disposition payée (SEPA) ; renvoie le client et la location. */
export async function louer(page: Page, browser: import("@playwright/test").Browser, baseURL: string | undefined, chemin = OSCAR) {
  const { clientConnecte, jusquAuRecapitulatif, accepterConditions, payerSurPageDemo } = await import("../f04/outils");
  const c = await clientConnecte(browser, baseURL, page);
  await ajouterMad(page, chemin);
  await jusquAuRecapitulatif(page, { livraison: "aucune", abonnement: "sepa" });
  await accepterConditions(page);
  await page.getByRole("button", { name: "Autoriser le prélèvement mensuel" }).click();
  await payerSurPageDemo(page, { moyen: "Prélèvement SEPA" });
  await page.waitForURL(/\/commande\/confirmation\//);
  const [l] = await locationsDe(c.partenaireRef);
  return { client: c, ref: l!.ref };
}

/** Écran de démonstration « Locations » (ce que l'équipe fait dans Odoo). */
export async function demoLocations(browser: import("@playwright/test").Browser, baseURL: string | undefined, action: (page: Page) => Promise<void>) {
  const { COMPTES, connecterNavigateur } = await import("../session");
  const contexte = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  await connecterNavigateur(contexte, COMPTES.admin);
  const page = await contexte.newPage();
  await page.goto("/admin/demonstration/locations");
  await action(page);
  await contexte.close();
}

export async function expedierEtLivrer(browser: import("@playwright/test").Browser, baseURL: string | undefined, ref: string) {
  const { expect } = await import("@playwright/test");
  await demoLocations(browser, baseURL, async (admin) => {
    await admin.getByRole("listitem", { name: `Location ${ref}` }).getByRole("button", { name: "Préparer et expédier" }).click();
    await expect(admin.getByRole("status").filter({ hasText: `Location ${ref} expédiée` })).toBeVisible();
    await admin.getByRole("button", { name: `Marquer livrée (${ref})` }).click();
    await expect(admin.getByRole("status").filter({ hasText: `Location ${ref} livrée` })).toBeVisible();
  });
}
