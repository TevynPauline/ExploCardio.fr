import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { verifierAccessibilite } from "../axe";
import { COMPTES, connecterNavigateur } from "../session";
import { MOT_DE_PASSE, attacherFiche, connecterCompte, creerCompteValide, requete } from "./outils";

// T039 (US6, FR-039, FR-040, SC-010).

test.describe.configure({ mode: "serial" });

test("export : mot de passe redemandé, fichier JSON lisible", async ({ page }) => {
  test.setTimeout(120_000);
  const c = await creerCompteValide(page);
  await connecterCompte(page.context(), c.email);
  await page.goto("/mon-compte/donnees");
  await verifierAccessibilite(page);

  await page.locator("#mdp-export").fill("Pas-le-bon-2026!");
  await page.getByRole("button", { name: "Télécharger mes données" }).click();
  await expect(page).toHaveURL(/erreur=mot-de-passe$/);
  await expect(page.getByText("Mot de passe incorrect.")).toBeVisible();

  const debut = Date.now();
  await page.locator("#mdp-export").fill(MOT_DE_PASSE);
  const [telechargement] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Télécharger mes données" }).click()]);
  expect(telechargement.suggestedFilename()).toMatch(/^explocardio-mes-donnees-\d{4}-\d{2}-\d{2}\.json$/);
  const donnees = JSON.parse(await readFile((await telechargement.path())!, "utf8"));
  expect(donnees.identité.email).toBe(c.email);
  expect(donnees.compte.siret).toBe("73282932000074");
  expect(Date.now() - debut).toBeLessThan(10 * 60_000);
});

test("suppression : connexion impossible ensuite, fiche archivée, newsletter retirée", async ({ page }) => {
  test.setTimeout(120_000);
  const c = await creerCompteValide(page, { newsletter: true });
  const ref = await attacherFiche(c);
  await connecterCompte(page.context(), c.email);
  await page.goto("/mon-compte/donnees");
  await page.locator("#mdp-suppression").fill(MOT_DE_PASSE);
  // Sans la case cochée, le navigateur bloque l'envoi (case obligatoire) : rien n'est supprimé.
  await page.getByRole("button", { name: "Supprimer mon compte" }).click();
  await expect(page).toHaveURL(/\/mon-compte\/donnees$/);
  expect(await requete("site", `SELECT 1 FROM utilisateur WHERE email = $1`, [c.email])).toHaveLength(1);

  await page.getByRole("checkbox", { name: /supprimer définitivement/ }).check();
  await page.getByRole("button", { name: "Supprimer mon compte" }).click();
  await expect(page).toHaveURL(/\/\?compte=supprime$/);

  expect(await requete("site", `SELECT 1 FROM message_demonstration WHERE destinataire = $1 AND objet = 'Votre compte a été supprimé'`, [c.email])).toHaveLength(1);
  expect(await requete("site", `SELECT 1 FROM utilisateur WHERE email = $1`, [c.email])).toHaveLength(0);
  expect(await requete("site", `SELECT 1 FROM compte_client WHERE id = $1 AND statut = 'supprime'`, [c.id])).toHaveLength(1);
  expect(await requete("demo", `SELECT 1 FROM res_partner WHERE ref = $1 AND archive`, [ref])).toHaveLength(1);

  await page.goto("/mon-compte");
  await expect(page).toHaveURL(/\/connexion/);
  const r = await page.context().request.post("/api/auth/sign-in/email", { data: { email: c.email, password: MOT_DE_PASSE }, headers: { origin: new URL(page.url()).origin } });
  expect([401, 429]).toContain(r.status());
});

test("suppression refusée pour un client avec une location en cours", async ({ page }) => {
  test.setTimeout(120_000);
  await connecterNavigateur(page.context(), COMPTES.clientDroits);
  await page.goto("/mon-compte/donnees");
  await page.locator("#mdp-suppression").fill(process.env.DEMO_ACCOUNTS_PASSWORD!);
  await page.getByRole("checkbox", { name: /supprimer définitivement/ }).check();
  await page.getByRole("button", { name: "Supprimer mon compte" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "ne peut pas encore être supprimé" })).toBeVisible();
  await expect(page.getByRole("alert").filter({ hasText: /location/i })).toBeVisible();
  await verifierAccessibilite(page);
  expect(await requete("site", `SELECT 1 FROM utilisateur WHERE email = $1`, [COMPTES.clientDroits])).toHaveLength(1);
});

test("suppression pendant une panne du service de gestion : message clair, rien n'est supprimé", async ({ page, browser, baseURL }) => {
  test.setTimeout(120_000);
  const c = await creerCompteValide(page);
  await attacherFiche(c);
  await connecterCompte(page.context(), c.email);
  const equipe = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  await connecterNavigateur(equipe, COMPTES.admin);
  const admin = await equipe.newPage();
  const carte = admin.locator(".ec-card", { hasText: "Odoo" });
  await admin.goto("/admin/demonstration/pannes");
  await carte.getByRole("button", { name: "Simuler une panne" }).click();
  await expect(carte.getByRole("button", { name: "Rétablir" })).toBeVisible();
  try {
    await page.goto("/mon-compte/donnees");
    await page.locator("#mdp-suppression").fill(MOT_DE_PASSE);
    await page.getByRole("checkbox", { name: /supprimer définitivement/ }).check();
    await page.getByRole("button", { name: "Supprimer mon compte" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "n’a pas été supprimé" })).toBeVisible();
    expect(await requete("site", `SELECT 1 FROM utilisateur WHERE email = $1`, [c.email])).toHaveLength(1);
  } finally {
    await carte.getByRole("button", { name: "Rétablir" }).click();
    await expect(carte.getByRole("button", { name: "Simuler une panne" })).toBeVisible();
    await equipe.close();
  }
});
