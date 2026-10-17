import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { connecterCompte, creerCompteValide } from "../f02/outils";
import { requete } from "./outils";

// T038 (US7, FR-008, FR-009, FR-045).

test.describe.configure({ timeout: 120_000 });

const PAGE = "/holter-ecg/ecg-de-repos";

test("champ manquant signalé, saisie conservée ; envoi complet transmis à l'équipe", async ({ page }) => {
  await page.goto(PAGE);
  await verifierAccessibilite(page);
  const formulaire = page.locator("section", { has: page.getByRole("heading", { name: "Vous cherchez un autre modèle ?" }) });
  await expect(formulaire.getByText("N’indiquez aucune donnée concernant vos patients.")).toBeVisible();
  const marque = `Modèle test ${Date.now()}`;
  await formulaire.getByLabel("Modèle recherché ou besoin").fill(marque);
  await formulaire.getByLabel("Nom", { exact: true }).fill("Dr Test Devis");
  await page.waitForTimeout(3_200); // délai anti-robots
  await formulaire.getByRole("button", { name: "Demander un devis" }).click();
  await expect(formulaire.getByRole("alert").filter({ hasText: "corrigez les champs signalés" })).toBeVisible();
  await expect(formulaire.getByLabel("Modèle recherché ou besoin")).toHaveValue(marque);
  await expect(formulaire.getByText("Indiquez une adresse email valide")).toBeVisible();
  expect(await requete("site", `SELECT 1 FROM demande_devis WHERE demandeur->>'besoin' = $1`, [marque])).toHaveLength(0);

  await formulaire.getByLabel("Email", { exact: true }).fill("devis-test@demo.explocardio.test");
  await formulaire.getByRole("button", { name: "Demander un devis" }).click();
  await expect(formulaire.getByRole("status")).toContainText("votre demande est transmise");
  const [d] = await requete<{ objet: string }>("site", `SELECT objet FROM demande_devis WHERE demandeur->>'besoin' = $1`, [marque]);
  expect(d?.objet).toBe("devis ECG de repos");
  await expect
    .poll(async () => (await requete("site", `SELECT 1 FROM message_demonstration WHERE objet = 'Nouvelle demande de devis : ECG de repos' AND rendu LIKE $1`, [`%${marque}%`])).length)
    .toBeGreaterThan(0);
});

test("client connecté : coordonnées préremplies", async ({ page, browser, baseURL }) => {
  const visiteur = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  const c = await creerCompteValide(await visiteur.newPage());
  await visiteur.close();
  await connecterCompte(page.context(), c.email);
  await page.goto(PAGE);
  await expect(page.getByLabel("Email", { exact: true }).last()).toHaveValue(c.email);
  await expect(page.getByLabel("Cabinet (facultatif)").last()).toHaveValue("Cabinet de test");
});
