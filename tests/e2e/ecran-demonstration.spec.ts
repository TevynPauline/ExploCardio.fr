import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "./axe";
import { requete } from "./bases";
import { COMPTES, connecterNavigateur } from "./session";

// T060 (US5, SC-009, FR-024 à FR-027) : l'administrateur modifie un prix, un stock et un taux de
// bons d'achat ; la nouvelle valeur est lue en moins de 5 secondes ; les valeurs incohérentes
// sont refusées avec l'explication ; le support n'a pas accès à l'écran.
// La disparition en mode réel est vérifiée par tests/unit/ecran-demonstration.test.ts.

test.describe.configure({ mode: "serial" });

const PRIX = "EC-SUN-ORBIT-M";

test.afterAll(async () => {
  // Remet les valeurs de départ modifiées par ces tests.
  await requete("demo", `UPDATE product_product SET "prixHtCentimes" = 5900 WHERE "defaultCode" = $1`, [PRIX]);
  await requete(
    "demo",
    `UPDATE stock_quant SET quantite = 60, "etatHorsStock" = 'delai', "delaiJours" = 15
     WHERE "varianteId" = (SELECT id FROM product_product WHERE "defaultCode" = $1)`,
    [PRIX],
  );
  await requete(
    "demo",
    `UPDATE loyalty_program SET paliers = '[{"plancherCentimes":0,"inclusif":true,"tauxPourcent":0},{"plancherCentimes":50000,"inclusif":true,"tauxPourcent":5},{"plancherCentimes":100000,"inclusif":false,"tauxPourcent":10}]'`,
  );
});

test("modifier un prix : visible en moins de 5 secondes et journalisé", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  await page.goto("/admin/demonstration/prix");
  await verifierAccessibilite(page);
  const champ = page.locator(`#prix-${PRIX}`);
  await champ.fill("61,50");
  const debut = Date.now();
  await page.getByRole("button", { name: /Enregistrer le prix de SunTech Brassard MAPA Orbit — 26-34 cm/ }).click();
  await expect(page.getByRole("status").filter({ hasText: `Prix de ${PRIX} modifié` })).toBeVisible();
  await expect(page.locator(`#prix-${PRIX}`)).toHaveValue("61,50");
  expect(Date.now() - debut).toBeLessThan(5_000);
  const [v] = await requete<{ prix: number }>("demo", `SELECT "prixHtCentimes" AS prix FROM product_product WHERE "defaultCode" = $1`, [PRIX]);
  expect(v!.prix).toBe(6150);
  const journal = await requete("site", `SELECT 1 FROM journal_action WHERE action = 'demo.prix' AND objet = $1`, [PRIX]);
  expect(journal.length).toBeGreaterThan(0);
});

test("un prix négatif est refusé avec l'explication", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  await page.goto("/admin/demonstration/prix");
  await page.locator(`#prix-${PRIX}`).fill("-10");
  await page.getByRole("button", { name: /Enregistrer le prix de SunTech Brassard MAPA Orbit — 26-34 cm/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: "négative" })).toBeVisible();
});

test("modifier un stock : passage en « indisponible »", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  await page.goto("/admin/demonstration/stocks");
  await verifierAccessibilite(page);
  await page.locator(`#q-${PRIX}`).fill("0");
  await page.locator(`#e-${PRIX}`).selectOption("indisponible");
  await page.getByRole("button", { name: /Enregistrer le stock de SunTech Brassard MAPA Orbit — 26-34 cm/ }).click();
  await expect(page.getByRole("status").filter({ hasText: "Stock" })).toBeVisible();
  const [s] = await requete<{ etat: string }>(
    "demo",
    `SELECT "etatHorsStock" AS etat FROM stock_quant WHERE "varianteId" = (SELECT id FROM product_product WHERE "defaultCode" = $1)`,
    [PRIX],
  );
  expect(s!.etat).toBe("indisponible");
});

test("modifier un taux de bons d'achat ; des paliers incohérents sont refusés", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  await page.goto("/admin/demonstration/parametres-commerciaux");
  await verifierAccessibilite(page);
  await page.locator("#taux-1").fill("6");
  await page.getByRole("button", { name: "Enregistrer les paramètres" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Paramètres commerciaux modifiés" })).toBeVisible();
  const [p] = await requete<{ paliers: { tauxPourcent: number }[] }>("demo", `SELECT paliers FROM loyalty_program`);
  expect(p!.paliers[1]!.tauxPourcent).toBe(6);

  await page.locator("#plancher-0").fill("100");
  await page.getByRole("button", { name: "Enregistrer les paramètres" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "commencer à 0 €" })).toBeVisible();
});

test("le support n'a pas accès à l'écran de démonstration", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.support);
  await page.goto("/admin/demonstration/prix");
  await expect(page).toHaveURL(/\/admin\?acces=refuse/);
});

test("simuler puis rétablir la panne d'un connecteur", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  await page.goto("/admin/demonstration/pannes");
  await verifierAccessibilite(page);
  const carte = page.locator(".ec-card", { hasText: "Emailing" });
  await carte.getByRole("button", { name: "Simuler une panne" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Panne activée" })).toBeVisible();
  await expect(page.locator(".ec-card", { hasText: "Emailing" })).toContainText("En panne (simulée)");
  await page.locator(".ec-card", { hasText: "Emailing" }).getByRole("button", { name: "Rétablir" }).click();
  await expect(page.locator(".ec-card", { hasText: "Emailing" })).toContainText("Fonctionne");
});
