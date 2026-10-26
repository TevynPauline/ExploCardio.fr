import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { COMPTES, connecterNavigateur } from "../session";
import { creerCompteEnAttente, requete } from "./outils";

// T022 (US2, FR-012 à FR-016). F16 : le compte est validé dès la confirmation de l'email ;
// l'équipe vérifie ensuite le numéro d'entreprise (tests/e2e/f16/inscription-numero.spec.ts) et
// peut toujours suspendre ou rétablir un compte.

test.describe.configure({ mode: "serial" });

async function emailRecu(email: string, objet: string) {
  return (await requete("site", `SELECT 1 FROM message_demonstration WHERE destinataire = $1 AND objet = $2`, [email, objet])).length > 0;
}

test("compte validé dès la confirmation de l'email, sans email « compte validé » ; suspendre puis rétablir", async ({ page, browser, baseURL }) => {
  test.setTimeout(120_000);
  const visiteur = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  const compte = await creerCompteEnAttente(await visiteur.newPage(), { numero: "73282932000074" });
  await visiteur.close();

  await connecterNavigateur(page.context(), COMPTES.admin);
  await page.goto("/admin/clients?statut=tous&numero=a_verifier");
  await verifierAccessibilite(page);
  const ligne = page.getByRole("row", { name: new RegExp(compte.email) });
  await expect(ligne).toContainText("SIRET 73282932000074 (à vérifier)");
  await expect(ligne).toContainText("Cabinet de test");
  await ligne.getByRole("link").click();
  await verifierAccessibilite(page);
  await expect(page.getByText("Validé", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/^FICT-P-/)).toBeVisible();
  expect(await emailRecu(compte.email, "Votre compte est validé")).toBe(false);

  await page.getByLabel("Motif de la suspension").fill("Vérification complémentaire");
  await page.getByRole("button", { name: "Suspendre le compte" }).click();
  await expect(page.getByText("Suspendu", { exact: true }).first()).toBeVisible();
  expect(await emailRecu(compte.email, "Votre compte est suspendu")).toBe(true);
  await page.getByRole("button", { name: "Rétablir le compte" }).click();
  await expect(page.getByText("Validé", { exact: true }).first()).toBeVisible();
  const journal = await requete<{ action: string }>("site", `SELECT action FROM journal_action WHERE objet = $1 AND action LIKE 'comptes.%' ORDER BY date`, [compte.id]);
  expect(journal.map((j) => j.action)).toEqual(["comptes.valide", "comptes.suspendu", "comptes.retabli"]);
});

test("paramètre « SIRET ou SIREN exigé dès l'inscription » : le numéro devient obligatoire", async ({ page }) => {
  test.setTimeout(120_000);
  await connecterNavigateur(page.context(), COMPTES.admin);
  // F16 : réglé dans Paramètres › Comptes (remplace la validation automatique).
  const reglage = page.locator("#comptes-numero_exige");
  await page.goto("/admin/parametres?theme=comptes");
  await verifierAccessibilite(page);
  await reglage.getByLabel("SIRET ou SIREN exigé").selectOption("inscription");
  await reglage.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("status").filter({ hasText: "enregistré" })).toBeVisible();
  try {
    await page.goto("/inscription");
    await expect(page.locator("main").getByLabel("SIRET ou SIREN", { exact: true })).toBeVisible();
  } finally {
    await page.goto("/admin/parametres?theme=comptes");
    await reglage.getByLabel("SIRET ou SIREN exigé").selectOption("premiere_commande");
    await reglage.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("status").filter({ hasText: "enregistré" })).toBeVisible();
    await expect.poll(async () => (await requete<{ valeur: string }>("site", `SELECT valeur FROM parametre WHERE cle = 'comptes.numero_exige'`))[0]?.valeur).toBe("premiere_commande");
  }
});

test("le support voit les comptes sans pouvoir décider (F13, D2)", async ({ page }) => {
  await connecterNavigateur(page.context(), COMPTES.support);
  await page.goto("/admin/comptes");
  await expect(page).toHaveURL(/\/admin\/clients/);
  await page.getByRole("region", { name: "Liste des clients" }).getByRole("link").first().click();
  await expect(page.getByRole("button", { name: /Valider le compte|Refuser le compte|Suspendre le compte|Numéro vérifié|Numéro refusé/ })).toHaveCount(0);
});
