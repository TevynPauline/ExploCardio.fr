import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { accepterConditions, accesDe, acheterHolterCloud, clientConnecte, nombreEmails, payerSurPageDemo, requete } from "./outils";

// T018 (US3, FR-029, FR-030, SC-011, D3) : poursuivre après la période incluse (prise d'effet à
// sa fin, rien de prélevé avant, accès sans interruption) ; souscription directe ; résiliation.

test.describe.configure({ timeout: 300_000 });

async function souscrireDepuisLePanier(page: import("@playwright/test").Page) {
  await page.waitForURL(/\/panier/);
  await page.getByRole("link", { name: "Commander" }).click();
  await page.waitForURL(/\/commande\/adresses/);
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForURL(/\/commande\/(livraison|paiement)/);
  if (page.url().includes("/livraison")) {
    await expect(page.locator("main")).not.toContainText("Choisissez une date");
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.waitForURL(/\/commande\/paiement/);
  }
  await page.getByRole("radio", { name: /Prélèvement SEPA/ }).check();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForURL(/\/commande\/recapitulatif/);
  await verifierAccessibilite(page);
  await accepterConditions(page);
  await page.getByRole("button", { name: "Autoriser le prélèvement mensuel" }).click();
  await payerSurPageDemo(page, { moyen: "Prélèvement SEPA" });
  await page.waitForURL(/\/commande\/confirmation\//);
}

test("poursuivre après la période incluse : prise d'effet à sa fin, rien de prélevé avant, accès continu ; puis résiliation", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await acheterHolterCloud(page, c.email);
  const [inclus] = await accesDe(c.partenaireRef);
  await page.goto("/mon-compte/logiciels");
  await page.getByRole("button", { name: "Poursuivre avec l’abonnement" }).click();
  await souscrireDepuisLePanier(page);

  const [a] = await accesDe(c.partenaireRef);
  expect(a).toMatchObject({ id: inclus!.id, origine: "abonnement", etat: "actif", finPrevue: null });
  const [abonnement] = await requete<{ ref: string; debut: Date }>(
    "demo",
    `SELECT s.ref, s.debut FROM sale_subscription s JOIN res_partner p ON p.id = s."partenaireId" WHERE p.ref = $1 AND s.objet = 'logiciel'`,
    [c.partenaireRef],
  );
  expect(new Date(abonnement!.debut).getTime()).toBe(new Date(inclus!.finPrevue!).getTime());
  const factures = await requete("demo", `SELECT 1 FROM account_move m JOIN res_partner p ON p.id = m."partenaireId" WHERE p.ref = $1 AND m.libelle LIKE 'Abonnement logiciel%'`, [c.partenaireRef]).catch(() => []);
  expect(factures).toHaveLength(0); // rien de facturé avant la prise d'effet
  expect(await nombreEmails(c.email, "Votre abonnement au logiciel Cloud")).toBe(1);

  await page.goto("/mon-compte/logiciels");
  const logiciel = page.getByRole("listitem", { name: /Logiciel CardioScan/ });
  await expect(logiciel).toContainText("abonnement mensuel, sans engagement");
  await logiciel.getByRole("button", { name: "Résilier l’abonnement" }).click();
  await expect(page.locator("main").getByRole("status")).toContainText("Abonnement résilié : votre accès continue jusqu'au");
  const [apres] = await accesDe(c.partenaireRef);
  expect(apres!.finPrevue).not.toBeNull();
});

test("souscription directe d'un logiciel : accès ouvert au paiement", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await page.goto("/mon-compte/logiciels");
  await expect(page.locator("main")).toContainText("Vous n’avez pas encore de logiciel Cloud");
  await verifierAccessibilite(page);
  await page.getByRole("listitem").filter({ hasText: "CardioVision" }).getByRole("button", { name: "Souscrire l’abonnement" }).click();
  await souscrireDepuisLePanier(page);
  await page.goto("/mon-compte/logiciels");
  await expect(page.getByRole("listitem", { name: /Logiciel CardioVision/ })).toContainText("Actif");
  const [a] = await accesDe(c.partenaireRef);
  expect(a).toMatchObject({ origine: "abonnement", etat: "actif" });
});
