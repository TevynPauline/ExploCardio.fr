import { expect, test, type Page } from "@playwright/test";
import { verifierAccessibilite } from "./axe";
import { requete } from "./bases";
import { COMPTES, connecterNavigateur } from "./session";

// T072 (US7, FR-028) : paiements accepté (American Express), refusé et avec authentification
// forte ; confirmations répétée et tardive traitées une seule fois.

test.describe.configure({ mode: "serial" });

async function ouvrirPaiementDeTest(page: Page, montant = "120,00") {
  await page.goto("/admin/demonstration/paiements");
  await page.getByLabel("Montant TTC (€)").first().fill(montant);
  await page.getByRole("button", { name: "Ouvrir la page de paiement" }).click();
  await page.waitForURL(/\/demo\/paiement\?session=/);
  return decodeURIComponent(new URL(page.url()).searchParams.get("session")!);
}

async function nombreTraites(sessionId: string, type: string): Promise<number> {
  const [session] = await requete<{ commande: string }>("demo", `SELECT "commandeRef" AS commande FROM payment_session_demo WHERE id = $1`, [sessionId]);
  const lignes = await requete("site", `SELECT 1 FROM journal_action WHERE action = $1 AND objet = $2`, [`paiement.${type}`, session!.commande]);
  return lignes.length;
}

test("paiement accepté par American Express, confirmation répétée traitée une seule fois", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  const session = await ouvrirPaiementDeTest(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("120,00");
  await expect(page.locator('input[autocomplete="cc-number"], input[name*="carte" i][type="text"]')).toHaveCount(0);
  await verifierAccessibilite(page);
  await page.getByLabel("Carte American Express").check();
  await page.getByLabel("Paiement accepté").check();
  await page.getByLabel(/Confirmation répétée/).check();
  await page.getByRole("button", { name: "Valider" }).click();
  await page.waitForURL(/paiement=accepte/);
  await expect(page.getByRole("status").filter({ hasText: "paiement accepté" })).toBeVisible();
  expect(await nombreTraites(session, "paiement_reussi")).toBe(1);
  const [s] = await requete<{ etat: string }>("demo", `SELECT etat FROM payment_session_demo WHERE id = $1`, [session]);
  expect(s!.etat).toBe("payee");
});

test("paiement refusé", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  const session = await ouvrirPaiementDeTest(page);
  await page.getByLabel("Carte Visa").check();
  await page.getByLabel("Paiement refusé").check();
  await page.getByRole("button", { name: "Valider" }).click();
  await page.waitForURL(/paiement=refuse/);
  expect(await nombreTraites(session, "paiement_refuse")).toBe(1);
});

test("authentification forte puis paiement confirmé", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  const session = await ouvrirPaiementDeTest(page);
  await page.getByLabel("Carte Mastercard").check();
  await page.getByLabel(/Authentification forte/).check();
  await page.getByRole("button", { name: "Valider" }).click();
  await page.waitForURL(/etape=authentification/);
  await expect(page.getByRole("heading", { name: /Authentification forte/ })).toBeVisible();
  expect(await nombreTraites(session, "authentification_requise")).toBe(1);
  await page.getByRole("button", { name: "Confirmer le paiement" }).click();
  await page.waitForURL(/paiement=accepte/);
  expect(await nombreTraites(session, "paiement_reussi")).toBe(1);
});

test("confirmation tardive : traitée une fois, environ 20 secondes plus tard", async ({ page, context }) => {
  test.setTimeout(120_000);
  await connecterNavigateur(context, COMPTES.admin);
  const session = await ouvrirPaiementDeTest(page);
  await page.getByLabel("Prélèvement SEPA").check();
  await page.getByLabel("Paiement accepté").check();
  await page.getByLabel(/Confirmation tardive/).check();
  await page.getByRole("button", { name: "Valider" }).click();
  await page.waitForURL(/paiement=accepte/);
  expect(await nombreTraites(session, "paiement_reussi")).toBe(0);
  await expect.poll(() => nombreTraites(session, "paiement_reussi"), { timeout: 90_000, intervals: [5_000] }).toBe(1);
});

test("échéance mensuelle refusée et remboursement simulés depuis l'écran de démonstration", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  await page.goto("/admin/demonstration/paiements");
  await page.getByLabel("Issue").selectOption("refusee");
  await page.getByRole("button", { name: "Simuler l’échéance" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Échéance refusée simulée" })).toBeVisible();

  await page.getByLabel("Montant TTC (€)").nth(1).fill("20,00");
  await page.getByRole("button", { name: "Simuler le remboursement" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Remboursement simulé" })).toBeVisible();
});

