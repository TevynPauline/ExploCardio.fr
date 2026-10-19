import type { Browser, Page } from "@playwright/test";
import { COMPTES, connecterNavigateur } from "../session";
import { accepterConditions, ajouterDepuisFiche, ELECTRODES, jusquAuRecapitulatif, payerSurPageDemo, requete } from "../f04/outils";

export { accepterConditions, ajouterDepuisFiche, clientConnecte, ELECTRODES, jusquAuRecapitulatif, payerSurPageDemo, requete } from "../f04/outils";

// Outils des parcours de F06 : panier composé, paiement par carte, écrans de démonstration.

export const CARTON = "EC-ELEC-HOLTER-500"; // 160 € HT
export const CARTE_SD = "EC-DMS-SD-8GO"; // 25 € HT
/** 1 200 € HT éligibles → 120 € de bons (SC-001). */
export const PANIER_1200 = { [CARTON]: 5, [CARTE_SD]: 16 };

/** Remet du stock fictif pour que les parcours répétés ne vident pas la base. */
export async function reapprovisionner(codes: string[], quantite = 500) {
  await requete(
    "demo",
    `UPDATE stock_quant SET quantite = GREATEST(quantite, $2) WHERE "varianteId" IN (SELECT id FROM product_product WHERE "defaultCode" = ANY($1))`,
    [codes, quantite],
  );
}

/** Compose le panier du client (après un premier ajout depuis une fiche, qui le crée). */
export async function composerPanier(page: Page, email: string, lignes: Record<string, number>) {
  await reapprovisionner(Object.keys(lignes));
  await ajouterDepuisFiche(page, ELECTRODES);
  const [panier] = await requete<{ id: string }>(
    "site",
    `SELECT p.id FROM panier p JOIN compte_client c ON c.id = p."compteId" JOIN utilisateur u ON u.id = c."utilisateurId" WHERE u.email = $1`,
    [email],
  );
  await requete("site", `DELETE FROM ligne_panier WHERE "panierId" = $1`, [panier!.id]);
  for (const [code, quantite] of Object.entries(lignes)) {
    const [{ prix } = { prix: 0 }] = await requete<{ prix: number }>("demo", `SELECT "prixHtCentimes" AS prix FROM product_product WHERE "defaultCode" = $1`, [code]);
    await requete(
      "site",
      `INSERT INTO ligne_panier (id, "panierId", "defaultCode", formule, quantite, "prixHtConstate") VALUES (gen_random_uuid()::text, $1, $2, 'achat', $3, $4)`,
      [panier!.id, code, quantite, prix],
    );
  }
}

/** Du panier à la confirmation, paiement par carte (American Express de démonstration). */
export async function payerParCarte(page: Page) {
  await jusquAuRecapitulatif(page);
  await accepterConditions(page);
  await page.getByRole("button", { name: /^Payer/ }).click();
  await payerSurPageDemo(page);
  await page.waitForURL(/\/commande\/confirmation\//);
}

/** Commandes Odoo (base fictive) d'un client, de la plus ancienne à la plus récente. */
export async function commandesDe(partenaireRef: string) {
  return requete<{ ref: string; montant: number }>(
    "demo",
    `SELECT o.ref, o."montantTtcCentimes" AS montant FROM sale_order o JOIN res_partner p ON p.id = o."partenaireId" WHERE p.ref = $1 ORDER BY o.id`,
    [partenaireRef],
  );
}

/** Écran de démonstration (ce que l'équipe fait dans Odoo), connecté en administrateur. */
export async function ecranDemo(browser: Browser, baseURL: string | undefined, chemin: string, action: (page: Page) => Promise<void>) {
  const contexte = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  await connecterNavigateur(contexte, COMPTES.admin);
  const page = await contexte.newPage();
  await page.goto(chemin);
  await action(page);
  await contexte.close();
}

export async function nombreEmails(email: string, objet: string) {
  return (await requete("site", `SELECT 1 FROM message_demonstration WHERE destinataire = $1 AND objet LIKE $2`, [email, `%${objet}%`])).length;
}
