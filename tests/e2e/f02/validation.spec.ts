import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { COMPTES, connecterNavigateur } from "../session";
import { creerCompteEnAttente, requete } from "./outils";

// T022 (US2, FR-012 à FR-016).

test.describe.configure({ mode: "serial" });

async function emailRecu(email: string, objet: string) {
  return (await requete("site", `SELECT 1 FROM message_demonstration WHERE destinataire = $1 AND objet = $2`, [email, objet])).length > 0;
}

test("valider un compte : statut, fiche client, email ; puis suspendre et rétablir", async ({ page, browser, baseURL }) => {
  test.setTimeout(120_000);
  const visiteur = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  const compte = await creerCompteEnAttente(await visiteur.newPage());
  await visiteur.close();

  await connecterNavigateur(page.context(), COMPTES.admin);
  await page.goto("/admin/comptes");
  await verifierAccessibilite(page);
  const ligne = page.getByRole("row", { name: new RegExp(compte.email) });
  await expect(ligne).toContainText(`RPPS ${compte.rpps}`);
  await expect(ligne).toContainText("Cabinet de test");
  await ligne.getByRole("link").click();
  await verifierAccessibilite(page);
  await page.getByRole("button", { name: "Valider le compte" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Décision enregistrée" })).toBeVisible();
  await expect(page.getByText("Validé", { exact: true })).toBeVisible();
  await expect(page.getByText(/^FICT-P-/)).toBeVisible();
  expect(await emailRecu(compte.email, "Votre compte est validé")).toBe(true);

  await page.getByLabel("Motif de la suspension").fill("Vérification complémentaire");
  await page.getByRole("button", { name: "Suspendre le compte" }).click();
  await expect(page.getByText("Suspendu", { exact: true })).toBeVisible();
  expect(await emailRecu(compte.email, "Votre compte est suspendu")).toBe(true);
  await page.getByRole("button", { name: "Rétablir le compte" }).click();
  await expect(page.getByText("Validé", { exact: true })).toBeVisible();
  const journal = await requete("site", `SELECT 1 FROM journal_action WHERE objet = $1 AND action LIKE 'comptes.%'`, [compte.id]);
  expect(journal.length).toBe(3);
});

test("refuser un compte exige un motif et prévient le professionnel", async ({ page, browser, baseURL }) => {
  test.setTimeout(120_000);
  const visiteur = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  const compte = await creerCompteEnAttente(await visiteur.newPage());
  await visiteur.close();
  await connecterNavigateur(page.context(), COMPTES.admin);
  await page.goto(`/admin/comptes/${compte.id}`);
  await page.getByLabel("Motif du refus").fill("Numéro RPPS introuvable");
  await page.getByRole("button", { name: "Refuser le compte" }).click();
  await expect(page.getByText("Refusé", { exact: true })).toBeVisible();
  await expect(page.getByText("Numéro RPPS introuvable").first()).toBeVisible();
  expect(await emailRecu(compte.email, "Votre demande de compte")).toBe(true);
});

test("validation automatique : le compte est validé dès la confirmation de l'email", async ({ page, browser, baseURL }) => {
  test.setTimeout(120_000);
  await connecterNavigateur(page.context(), COMPTES.admin);
  await page.goto("/admin/comptes/reglages");
  await verifierAccessibilite(page);
  await page.getByRole("checkbox", { name: /Valider automatiquement/ }).check();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Réglages enregistrés" })).toBeVisible();
  try {
    const visiteur = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
    const compte = await creerCompteEnAttente(await visiteur.newPage());
    await visiteur.close();
    const [c] = await requete<{ statut: string }>("site", `SELECT statut FROM compte_client WHERE id = $1`, [compte.id]);
    expect(c!.statut).toBe("valide");
  } finally {
    await page.goto("/admin/comptes/reglages");
    await page.getByRole("checkbox", { name: /Valider automatiquement/ }).uncheck();
    await page.getByRole("button", { name: "Enregistrer" }).click();
    // Attendre l'enregistrement : sinon la validation automatique reste active pour les parcours suivants.
    await expect(page.getByRole("status").filter({ hasText: "Réglages enregistrés" })).toBeVisible();
    await expect.poll(async () => (await requete<{ valeur: string }>("site", `SELECT valeur FROM parametre WHERE cle = 'comptes.validation_auto'`))[0]?.valeur).toBe("false");
  }
});

test("le support n'a pas accès aux comptes", async ({ page }) => {
  await connecterNavigateur(page.context(), COMPTES.support);
  await page.goto("/admin/comptes");
  await expect(page).toHaveURL(/\/admin\?acces=refuse/);
});
