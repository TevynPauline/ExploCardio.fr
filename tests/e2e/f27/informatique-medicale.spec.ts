import { expect, test, type Locator } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { COMPTES, connecterNavigateur } from "../session";

// F27, US2 et US6 : page Informatique médicale, questionnaire ouvert à tous, redirection.

async function remplirEtapes1Et2(q: Locator) {
  await q.getByLabel("Accéder à mes examens à distance").check();
  await q.getByLabel("Médecins au cabinet").fill("2");
  await q.getByLabel("Nombre de postes informatiques").fill("4");
  await q.getByRole("radio", { name: "Oui" }).check();
  await q.getByRole("button", { name: "Continuer" }).click();
  for (const x of ["Holter ECG", "MAPA", "Épreuve d'effort"]) await q.getByLabel(`Logiciel utilisé pour : ${x}`).selectOption("cardioscan");
  await q.getByRole("radio", { name: "Non", exact: true }).check();
  await q.getByRole("button", { name: "Continuer" }).click();
}

test("sections dans l'ordre, étape 2 sans prénom, lien PCA en nouvel onglet, sans motif", async ({ page }) => {
  await page.goto("/informatique-medicale");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Votre cabinet accessible partout, en toute sécurité");
  const titres = await page.getByRole("main").getByRole("heading", { level: 2 }).allTextContents();
  expect(titres).toEqual([
    "Ce que PCA change au cabinet",
    "Comment ça se passe",
    "Nous sommes fiers de vous présenter notre partenariat avec PCA",
    "Besoin d’un prestataire informatique pour votre cabinet ?",
    "Décrivez votre besoin en 2 minutes",
    "Patient Care Anywhere®, par Indoor Informatique (2i)",
  ]);
  await expect(page.getByRole("heading", { name: "On vous appelle" })).toBeVisible();
  await expect(page.getByText("Nous précisons avec vous votre cabinet et vos logiciels.")).toBeVisible();
  await expect(page.getByRole("main").getByText("Régis")).toHaveCount(0);
  const pca = page.getByRole("link", { name: /Voir le site de PCA/ });
  await expect(pca).toHaveAttribute("target", "_blank");
  await expect(pca).toHaveAttribute("href", /^https:\/\/patient-care-anywhere\.com/);
  await expect(page.getByText("Aucune donnée de patient n'est demandée.", { exact: false })).toBeVisible();
  await verifierAccessibilite(page);
});

test("questionnaire déconnecté : étape vide refusée, envoi, demande enregistrée", async ({ page }) => {
  await page.goto("/informatique-medicale#questionnaire");
  const q = page.locator("#questionnaire");
  await q.getByRole("button", { name: "Continuer" }).click();
  await expect(q.getByText("Cochez au moins un sujet.")).toBeVisible();
  await expect(q.getByRole("heading", { name: /Étape 1 sur 3/ })).toBeVisible();
  await page.waitForTimeout(5_000); // délai minimal anti-robots
  await remplirEtapes1Et2(q);
  await q.getByLabel("Dès que possible").check();
  await q.getByLabel("Nom et prénom").fill("Dr Parcours F27");
  await q.getByLabel("Cabinet", { exact: true }).fill("Cabinet Parcours F27");
  await q.getByLabel("Code postal du cabinet").fill("13710");
  await q.getByLabel("Adresse e-mail").fill("parcours-f27@demo.explocardio.test");
  await q.getByLabel("Téléphone").fill("04 42 00 00 00");
  await q.getByLabel("Le matin").check();
  await q.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(q.getByText("Cochez la case pour que nous puissions vous recontacter.")).toBeVisible();
  await q.getByRole("checkbox", { name: /J’accepte/ }).check();
  await q.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(q.getByRole("status")).toContainText("Merci, votre demande est bien reçue.");
});

test("questionnaire connecté : coordonnées préremplies", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.clientDroits);
  await page.goto("/informatique-medicale#questionnaire");
  const q = page.locator("#questionnaire");
  await remplirEtapes1Et2(q);
  await expect(q.getByLabel("Adresse e-mail")).toHaveValue(COMPTES.clientDroits);
  await expect(q.getByLabel("Nom et prénom")).not.toHaveValue("");
});

test("l'ancienne page Hébergement redirige définitivement", async ({ page }) => {
  const r = await page.request.get("/services/hebergement-donnees-sante", { maxRedirects: 0 });
  expect(r.status()).toBe(308);
  expect(r.headers().location).toContain("/informatique-medicale#hebergement");
});
