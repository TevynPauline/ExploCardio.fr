import { readFileSync } from "node:fs";
import { createOTP } from "@better-auth/utils/otp";
import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { MOT_DE_PASSE, creerCompteValide, requete, seConnecter } from "./outils";

// T027 (US3, FR-029 à FR-035, SC-008, SC-012).

test.describe.configure({ mode: "serial" });

test("connexion, retour à la page consultée, déconnexion ; message d'échec unique", async ({ page }) => {
  test.setTimeout(90_000);
  const c = await creerCompteValide(page);
  await page.goto("/connexion?retour=/mon-compte/adresses");
  await verifierAccessibilite(page);
  await page.locator("main").getByLabel("Adresse email").fill(c.email);
  await page.locator("main").getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await page.locator("main").getByRole("button", { name: "Se connecter" }).click();
  await expect(page).toHaveURL(/\/mon-compte\/adresses$/);
  await page.context().clearCookies({ name: "better-auth.session_token" });

  await seConnecter(page, c.email, "Mauvais-mot-2026!");
  await expect(page.getByText("Email ou mot de passe incorrect.")).toBeVisible();
  await seConnecter(page, `inconnu-${Date.now()}@demo.explocardio.test`, "Mauvais-mot-2026!");
  await expect(page.getByText("Email ou mot de passe incorrect.")).toBeVisible();
});

test("5 échecs : compte bloqué, message identique, email au titulaire, journal", async ({ page }) => {
  test.setTimeout(120_000);
  const c = await creerCompteValide(page);
  for (let i = 0; i < 5; i++) {
    await seConnecter(page, c.email, `Faux-mot-de-passe-${i}!`);
    await expect(page.getByText("Email ou mot de passe incorrect.")).toBeVisible();
  }
  await seConnecter(page, c.email);
  await expect(page.getByText("Email ou mot de passe incorrect.")).toBeVisible();
  expect(await requete("site", `SELECT 1 FROM message_demonstration WHERE destinataire = $1 AND objet = 'Votre compte est temporairement bloqué'`, [c.email])).toHaveLength(1);
  const journal = await requete<{ action: string }>("site", `SELECT action FROM journal_action j JOIN utilisateur u ON u.id = j.objet WHERE u.email = $1`, [c.email]);
  expect(journal.map((j) => j.action)).toEqual(expect.arrayContaining(["securite.echec_connexion", "securite.blocage"]));
  await requete("site", `UPDATE utilisateur SET "bloqueJusqua" = NULL WHERE email = $1`, [c.email]);
});

test("mot de passe oublié : même message pour un email inconnu ; nouveau mot de passe en moins de 2 minutes", async ({ page }) => {
  test.setTimeout(120_000);
  const c = await creerCompteValide(page);
  const debut = Date.now();
  await page.goto("/mot-de-passe-oublie");
  await verifierAccessibilite(page);
  await page.locator("main").getByLabel("Votre adresse email").fill(`inconnu-${Date.now()}@demo.explocardio.test`);
  await page.locator("main").getByRole("button", { name: "Recevoir un lien" }).click();
  const message = await page.locator("main").getByRole("status").innerText();
  await page.goto("/mot-de-passe-oublie");
  await page.locator("main").getByLabel("Votre adresse email").fill(c.email);
  await page.locator("main").getByRole("button", { name: "Recevoir un lien" }).click();
  await expect(page.locator("main").getByRole("status")).toHaveText(message);

  // L'email part en arrière-plan (même durée de réponse que l'adresse soit connue ou non).
  const lireEmail = () => requete<{ rendu: string }>("site", `SELECT rendu FROM message_demonstration WHERE destinataire = $1 AND objet = 'Réinitialiser votre mot de passe' ORDER BY date DESC LIMIT 1`, [c.email]);
  await expect.poll(async () => (await lireEmail()).length).toBe(1);
  const [m] = await lireEmail();
  const lien = m!.rendu.match(/href="([^"]*reset-password[^"]*)"/)![1]!.replace(/&amp;/g, "&");
  await page.goto(new URL(lien).pathname + new URL(lien).search);
  await expect(page).toHaveURL(/\/reinitialiser-mot-de-passe\?token=/);
  await page.locator("main").getByLabel("Nouveau mot de passe").fill("Nouveau-Motdepasse-2026?");
  await page.locator("main").getByRole("button", { name: "Enregistrer le mot de passe" }).click();
  await expect(page.locator("main").getByRole("status").filter({ hasText: "Votre mot de passe est modifié" })).toBeVisible();
  expect(Date.now() - debut).toBeLessThan(120_000);
  expect(await requete("site", `SELECT 1 FROM message_demonstration WHERE destinataire = $1 AND objet = 'Votre mot de passe a été modifié'`, [c.email])).toHaveLength(1);
  await seConnecter(page, c.email, "Nouveau-Motdepasse-2026?");
  await expect(page).toHaveURL(/\/mon-compte$/);
});

test("double authentification : activation, connexion avec un code, puis avec un code de secours", async ({ page }) => {
  test.setTimeout(120_000);
  const c = await creerCompteValide(page);
  await seConnecter(page, c.email);
  await expect(page).toHaveURL(/\/mon-compte$/);
  await page.goto("/mon-compte/securite");
  await verifierAccessibilite(page);
  await page.getByRole("button", { name: "Activer la double authentification" }).click();
  await page.locator("main").getByLabel("Votre mot de passe").fill(MOT_DE_PASSE);
  await page.locator("main").getByRole("button", { name: "Continuer" }).click();
  const secret = (await page.locator("main p.break-all").innerText()).trim();
  const codesSecours = await page.getByRole("list", { name: "Codes de secours" }).getByRole("listitem").allInnerTexts();
  const [ligne] = await requete<{ id: string }>("site", `SELECT u.id FROM utilisateur u WHERE u.email = $1`, [c.email]);
  // Le code se calcule à partir de la clé affichée (base32), comme le ferait une application.
  const code = await createOTP(decodeBase32(secret)).totp();
  await page.locator("main").getByLabel(/Code à 6 chiffres/).fill(code);
  await page.locator("main").getByRole("button", { name: "Activer la double authentification" }).click();
  await expect(page.getByText("activée", { exact: false }).first()).toBeVisible();
  expect(await requete("site", `SELECT 1 FROM journal_action WHERE objet = $1 AND action = 'securite.double_authentification_activee'`, [ligne!.id])).toHaveLength(1);

  await page.context().clearCookies();
  await page.context().addCookies(JSON.parse(readFileSync("playwright/.auth/acces-demo.json", "utf8")).cookies);
  await seConnecter(page, c.email);
  await expect(page).toHaveURL(/\/connexion\/double-authentification/);
  await page.getByRole("button", { name: "Utiliser un code de secours" }).click();
  await page.locator("main").getByLabel("Code de secours").fill(codesSecours[0]!);
  await page.locator("main").getByRole("button", { name: "Valider" }).click();
  await expect(page).toHaveURL(/\/mon-compte$/);
});

function decodeBase32(texte: string): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of texte.replace(/=+$/, "").toUpperCase()) bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const octets: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) octets.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(octets).toString("utf8");
}
