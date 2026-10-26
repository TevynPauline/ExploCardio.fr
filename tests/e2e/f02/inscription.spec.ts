import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { MOT_DE_PASSE, lienDeConfirmation, remplirInscription, requete, rppsDeTest } from "./outils";

// T015 (US1, FR-001 à FR-009, SC-011, SC-012) ; F16 : sans RPPS, SIRET ou SIREN facultatif,
// compte validé dès la confirmation de l'email.

test("formulaire : newsletter décochée, CGU/CGV obligatoires, règles du mot de passe en direct", async ({ page }) => {
  await page.goto("/inscription");
  await verifierAccessibilite(page);
  await expect(page.locator("main").getByRole("checkbox", { name: /recevoir la newsletter/ })).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: /conditions générales d’utilisation/ })).not.toBeChecked();
  await page.getByLabel("Mot de passe", { exact: true }).fill("abc");
  await expect(page.getByText("○ 12 caractères au moins")).toBeVisible();
  await page.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await expect(page.getByText("✓ 12 caractères au moins")).toBeVisible();
  await expect(page.getByText("✓ un caractère spécial", { exact: false })).toBeVisible();
});

test("erreurs sur les champs, saisie conservée : numéro mal formé, livraison en outre-mer", async ({ page }) => {
  await page.goto("/inscription");
  await remplirInscription(page, "1234", `erreurs-${Date.now()}@demo.explocardio.test`, { numero: "1234" });
  await page.locator("main").getByRole("checkbox", { name: /livraison identique/ }).uncheck();
  await page.locator("main #adresseLivraison\\.ligne1").fill("1 rue de la Réunion");
  await page.locator("main #adresseLivraison\\.codePostal").fill("97400");
  await page.locator("main #adresseLivraison\\.ville").fill("Saint-Denis");
  await page.waitForTimeout(3_200);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "à corriger" })).toBeVisible();
  await expect(page.getByText(/indiquez un SIRET \(14 chiffres\) ou un SIREN/)).toBeVisible();
  await expect(page.getByText(/livre uniquement en France métropolitaine/)).toBeVisible();
  await expect(page.getByLabel("Nom du cabinet ou de la structure")).toHaveValue("Cabinet de test");
  await expect(page.getByLabel("SIRET ou SIREN (facultatif)")).toHaveAttribute("aria-invalid", "true");
});

test("inscription, confirmation de l'email, compte validé ; doublon refusé sans rien révéler", async ({ page, baseURL }) => {
  test.setTimeout(90_000);
  const rpps = rppsDeTest();
  const email = `inscription-e2e-${rpps}@demo.explocardio.test`;
  await page.goto("/inscription");
  await remplirInscription(page, rpps, email, { newsletter: true });
  await page.waitForTimeout(3_200);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/\/inscription\/verifier-email$/);

  // Connexion refusée avant confirmation
  const r = await page.request.post("/api/auth/sign-in/email", { data: { email, password: MOT_DE_PASSE }, headers: { origin: baseURL! } });
  expect(r.ok()).toBe(false);

  await page.goto(await lienDeConfirmation(email));
  await expect(page).toHaveURL(/\/inscription\/email-confirme/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Votre adresse est confirmée");
  const [c] = await requete<{ statut: string }>("site", `SELECT c.statut FROM compte_client c JOIN utilisateur u ON u.id = c."utilisateurId" WHERE u.email = $1`, [email]);
  expect(c!.statut).toBe("valide");

  // Doublon (même adresse email) : message neutre (SC-012)
  await page.goto("/inscription");
  await remplirInscription(page, rpps, email);
  await page.waitForTimeout(3_200);
  await page.getByRole("button", { name: "Créer mon compte" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Nous ne pouvons pas créer ce compte" })).toBeVisible();
});

test("lien expiré ou invalide : proposition de renvoi", async ({ page }) => {
  await page.goto("/inscription/email-confirme?error=INVALID_TOKEN");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ce lien n’est plus valable");
  await page.locator("main").getByLabel("Votre adresse email").fill("inconnu@demo.explocardio.test");
  await page.getByRole("button", { name: "Renvoyer l’email" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Si un compte attend" })).toBeVisible();
});

test("SC-011 : le formulaire se parcourt au clavier", async ({ page }) => {
  await page.goto("/inscription");
  await page.getByLabel("Civilité").focus();
  for (let i = 0; i < 40; i++) await page.keyboard.press("Tab");
  const actif = await page.evaluate(() => document.activeElement?.tagName);
  expect(["INPUT", "BUTTON", "SELECT", "A"]).toContain(actif);
});
