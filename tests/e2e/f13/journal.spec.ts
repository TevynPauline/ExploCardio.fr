import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { requete } from "../bases";
import { COMPTES, connecterNavigateur } from "../session";

// T022 — journal (F13, US7) : panne simulée d'Odoo, erreurs retrouvées par filtre ; onglet des
// actions de l'équipe ; réservé à l'administrateur.

test.describe.configure({ timeout: 180_000, mode: "serial" });

test("panne d'Odoo : erreurs retrouvées par filtre ; actions de l'équipe", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  await requete("site", `INSERT INTO panne_simulee (connecteur, active, date) VALUES ('odoo', true, now()) ON CONFLICT (connecteur) DO UPDATE SET active = true, date = now()`);
  try {
    await page.goto("/admin/catalogue");
    await expect(page.locator("main").getByRole("alert")).toContainText("Odoo est momentanément injoignable");
  } finally {
    await requete("site", `UPDATE panne_simulee SET active = false WHERE connecteur = 'odoo'`);
  }
  await page.goto("/admin/journal");
  await page.getByLabel("Connecteur", { exact: true }).selectOption("odoo");
  await page.getByLabel("Résultat", { exact: true }).selectOption("erreur");
  await page.getByRole("button", { name: "Filtrer" }).click();
  await expect(page).toHaveURL(/connecteur=odoo/);
  const tableau = page.getByRole("region", { name: "Appels aux connecteurs" });
  await expect(tableau.locator("tbody tr").first()).toContainText("Erreur");
  await expect(tableau.locator("tbody tr").first()).toContainText("odoo");
  await verifierAccessibilite(page);

  await page.getByRole("link", { name: "Actions de l’équipe" }).click();
  await expect(page.getByRole("region", { name: "Actions de l’équipe" })).toBeVisible();
  await page.getByLabel("Type d’action").selectOption("parametres.");
  await page.getByRole("button", { name: "Filtrer" }).click();
  await expect(page).toHaveURL(/action=parametres/);
});

test("journal réservé à l'administrateur", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.support);
  await page.goto("/admin/journal");
  await expect(page).toHaveURL(/\/admin\?acces=refuse/);
});
