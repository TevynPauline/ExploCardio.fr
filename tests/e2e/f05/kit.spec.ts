import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { accepterConditions, clientConnecte, jusquAuRecapitulatif, payerSurPageDemo, rendreParcDesTests, requete } from "./outils";

// T028 (US5, FR-013 à FR-016, SC-003) : kit ajouté d'office à la première location d'un type
// d'appareil, jamais facturé deux fois d'office ; kit enregistré par l'équipe reconnu.

test.describe.configure({ timeout: 300_000, mode: "serial" });
test.beforeEach(rendreParcDesTests);

const HOLTER = "/holter-ecg/dms-300-4l";

async function ajouterMadHolter(page: import("@playwright/test").Page) {
  await page.goto(HOLTER);
  await page.locator("main").getByText("Mise à disposition mensuelle (sans engagement)").click();
  await page.getByTestId("panneau-formule").getByRole("button", { name: "Ajouter la mise à disposition au panier" }).click();
  return page.locator("main").getByRole("status").filter({ hasText: "Ajouté au panier" }).first();
}

test("première location : kit ajouté d'office et facturé ; seconde location du même type : pas de kit", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await page.goto(HOLTER);
  await page.locator("main").getByText("Mise à disposition mensuelle (sans engagement)").click();
  await expect(page.getByTestId("panneau-formule")).toContainText("Kit d’accessoires requis à la première location");
  const message = await ajouterMadHolter(page);
  await expect(message).toContainText("obligatoire à la première location, a été ajouté");

  await page.goto("/panier");
  await verifierAccessibilite(page);
  const kit = page.locator("main").getByRole("listitem").filter({ hasText: "Kit obligatoire" });
  await expect(kit).toHaveCount(1);
  await expect(kit.getByRole("button", { name: /Retirer/ })).toHaveCount(0);

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
  const factureKit = await requete(
    "demo",
    `SELECT 1 FROM sale_order_line l JOIN sale_order o ON o.id = l."commandeId" JOIN res_partner p ON p.id = o."partenaireId" JOIN product_product v ON v.id = l."varianteId" WHERE p.ref = $1 AND v."defaultCode" = 'EC-KIT-HOLTER-MAD'`,
    [c.partenaireRef],
  );
  expect(factureKit).toHaveLength(1);

  // Seconde location du même type : le kit n'est ni proposé ni facturé, et le site le dit.
  await page.goto(HOLTER);
  await page.locator("main").getByText("Mise à disposition mensuelle (sans engagement)").click();
  await expect(page.getByTestId("panneau-formule")).toContainText("Vous possédez déjà le kit d’accessoires");
  await expect(await ajouterMadHolter(page)).toContainText("Vous possédez déjà le kit");
  await page.goto("/panier");
  await expect(page.locator("main")).toContainText("Vous possédez déjà le kit d’accessoires");
  await expect(page.locator("main").getByRole("listitem").filter({ hasText: "EC-KIT-HOLTER-MAD" })).toHaveCount(0);
});

test("kit enregistré par l'équipe : plus demandé", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await requete("demo", `INSERT INTO res_partner_kit ("partenaireId", "kitDefaultCode", origine, auteur) SELECT id, 'EC-KIT-HOLTER-MAD', 'enregistrement', 'e2e' FROM res_partner WHERE ref = $1`, [c.partenaireRef]);
  await expect(await ajouterMadHolter(page)).toContainText("Vous possédez déjà le kit");
});
