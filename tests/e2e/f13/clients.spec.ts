import { expect, test, type Page } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { requete } from "../bases";
import { COMPTES, connecterNavigateur } from "../session";

// T008 / T018 — clients (F13, US1, US5) : recherche par email, RPPS, cabinet ; fiche complète en
// lecture seule pour le support (SC-005) ; client sans droits : assistance à l'acte ; Odoo en
// panne : blocs signalés indisponibles, le reste s'affiche.

test.describe.configure({ timeout: 240_000, mode: "serial" });

async function chercher(page: Page, q: string) {
  await page.goto("/admin/clients?statut=tous");
  await page.getByLabel("Nom, cabinet, téléphone, email, RPPS ou SIRET").fill(q);
  await page.getByLabel("Nom, cabinet, téléphone, email, RPPS ou SIRET").press("Enter");
  await expect(page).toHaveURL(new RegExp(`q=${encodeURIComponent(q).replace(/\./g, "\\.")}`));
}

test("support : retrouve un client par email, RPPS ou cabinet en quelques secondes ; fiche en lecture seule", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.support);
  for (const q of ["client.droits@demo", "99000000101", "Valdrin"]) {
    const debut = Date.now();
    await chercher(page, q);
    await expect(page.getByRole("region", { name: "Liste des clients" }).getByRole("link", { name: /Valdrin/ })).toBeVisible();
    expect(Date.now() - debut).toBeLessThan(15_000);
  }
  await page.getByRole("region", { name: "Liste des clients" }).getByRole("link", { name: /Valdrin/ }).click();
  await expect(page).toHaveURL(/\/admin\/clients\/[a-z0-9]+$/, { timeout: 30_000 });
  for (const titre of ["Identité et coordonnées", "Droits d’assistance", "Locations en cours", "Commandes récentes", "Factures", "Accès aux logiciels Cloud"]) {
    await expect(page.getByRole("heading", { level: 2, name: titre })).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Décision" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Suspendre|Valider|Refuser/ })).toHaveCount(0);
  await verifierAccessibilite(page);
});

test("client sans droits : absence signalée avec l'assistance à l'acte", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.support);
  await chercher(page, "client.sans-droits@demo");
  await page.getByRole("region", { name: "Liste des clients" }).getByRole("link").first().click();
  await expect(page.locator("main")).toContainText("Pas de droits actifs");
  await expect(page.locator("main")).toContainText("Assistance possible à l’acte");
});

test("Odoo en panne : blocs signalés indisponibles, le reste s'affiche", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  await chercher(page, "client.droits@demo");
  await page.getByRole("region", { name: "Liste des clients" }).getByRole("link", { name: /Valdrin/ }).click();
  await expect(page).toHaveURL(/\/admin\/clients\/[a-z0-9]+$/, { timeout: 30_000 });
  const fiche = page.url();
  await requete("site", `INSERT INTO panne_simulee (connecteur, active, date) VALUES ('odoo', true, now()) ON CONFLICT (connecteur) DO UPDATE SET active = true, date = now()`);
  try {
    await page.goto(fiche);
    await expect(page.getByRole("heading", { level: 2, name: "Identité et coordonnées" })).toBeVisible();
    await expect(page.locator("main")).toContainText("Odoo est momentanément injoignable");
  } finally {
    await requete("site", `UPDATE panne_simulee SET active = false WHERE connecteur = 'odoo'`);
  }
});

test("anciennes adresses : /admin/comptes et /admin/assistance mènent aux clients", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  await page.goto("/admin/comptes?statut=en_attente");
  await expect(page).toHaveURL(/\/admin\/clients\?statut=en_attente/);
  await page.goto("/admin/assistance?q=demo");
  await expect(page).toHaveURL(/\/admin\/clients\?statut=tous&q=demo/);
});
