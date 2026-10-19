import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { PANIER_1200, clientConnecte, commandesDe, composerPanier, payerParCarte, requete } from "./outils";

// T021 (US5, SC-004, SC-008) : « Bons d'achat » (solde = somme de l'historique, prochaine
// expiration, mouvements reliés aux commandes) ; « Droits d'assistance » (actif : fin, origine,
// comment prolonger ; inactif : montant qui les ouvrirait, assistance à l'acte) ; avertissement
// avant la suppression du compte.

test.describe.configure({ timeout: 240_000 });

test("client sans achats : cagnotte vide, droits inactifs avec le montant qui les ouvrirait et l'assistance à l'acte", async ({ page, browser, baseURL }) => {
  await clientConnecte(browser, baseURL, page);
  await page.goto("/mon-compte/bons-achat");
  await expect(page.locator("main")).toContainText("0,00 € HT");
  await expect(page.locator("main")).toContainText("Aucun mouvement pour le moment.");
  await expect(page.locator("main")).toContainText("5 % de 500 € à 1 000 € HT");
  await verifierAccessibilite(page);

  await page.goto("/mon-compte/assistance");
  const main = page.locator("main");
  await expect(main).toContainText("Pas de droits d’assistance en cours");
  await expect(main).toContainText(/Une commande d’au moins .* HT de consommables/);
  await expect(main).toContainText(/L’assistance à l’acte : une intervention de notre équipe, pour .* HT/);
  await expect(page.getByRole("button", { name: "Acheter une intervention" })).toBeVisible();
  await verifierAccessibilite(page);
});

test("client avec une commande de 1 200 € : solde, historique relié à la commande, droits actifs ; avertissement RGPD", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await composerPanier(page, c.email, PANIER_1200);
  await payerParCarte(page);
  const [commande] = await commandesDe(c.partenaireRef);

  await page.goto("/mon-compte/bons-achat");
  const main = page.locator("main");
  await expect(main).toContainText("120,00 € HT");
  await expect(main).toContainText(/120,00\s€\sHT expirent le \d{2}\/\d{2}\/\d{4}/);
  const ligne = page.getByRole("row", { name: /Crédit/ });
  await expect(ligne).toContainText("+120,00");
  await ligne.getByRole("link", { name: commande!.ref }).click();
  await page.waitForURL(new RegExp(`/mon-compte/commandes/${commande!.ref}`));
  // SC-004 : le solde affiché est la somme de l'historique dans Odoo.
  const [{ somme }] = (await requete<{ somme: string }>(
    "demo",
    `SELECT COALESCE(SUM(m."montantCentimes"), 0) AS somme FROM loyalty_history m JOIN res_partner p ON p.id = m."partenaireId" WHERE p.ref = $1`,
    [c.partenaireRef],
  )) as [{ somme: string }];
  expect(Number(somme)).toBe(12_000);

  await page.goto("/mon-compte/assistance");
  await expect(main).toContainText("Votre assistance est offerte");
  await expect(main).toContainText(`Ouverts par la commande ${commande!.ref}`);
  await expect(main).toContainText(/Pour les prolonger, passez une commande d’au moins/);
  await expect(page.getByRole("button", { name: "Acheter une intervention" })).toHaveCount(0);
  await verifierAccessibilite(page);

  await page.goto("/mon-compte/donnees");
  await expect(page.getByRole("note")).toContainText("vous perdez vos 120,00 € HT de bons d’achat et vos droits d’assistance");
});
