import { randomInt } from "node:crypto";
import type { BrowserContext, Page } from "@playwright/test";
import { requete } from "../bases";
import { postAvecPatience } from "../session";

export { requete };

export function rppsDeTest(): string {
  return `99${String(randomInt(0, 1e9)).padStart(9, "0")}`;
}

export const MOT_DE_PASSE = "Motdepasse-Test-2026!";

/**
 * Remplit le formulaire d'inscription (adresses identiques au cabinet). F16 : plus de RPPS ; le
 * SIRET ou le SIREN est facultatif (`numero`). `rpps` ne sert plus qu'à rendre l'email unique.
 */
export async function remplirInscription(page: Page, _rpps: string, email: string, options: { newsletter?: boolean; numero?: string } = {}) {
  const f = page.locator("main");
  await f.getByLabel("Civilité").selectOption("Dr");
  await f.getByLabel("Spécialité").selectOption("Cardiologie");
  await f.getByLabel("Prénom", { exact: true }).fill("Camille");
  await f.getByLabel("Nom", { exact: true }).fill("Testeur");
  if (options.numero) await f.getByLabel(/^SIRET ou SIREN/).fill(options.numero);
  await f.getByLabel("Nom du cabinet ou de la structure").fill("Cabinet de test");
  await f.getByLabel("Email professionnel").fill(email);
  await f.getByLabel("Téléphone").fill("+33 6 99 00 00 42");
  await f.locator("#adresseCabinet\\.ligne1").fill("1 rue du Test");
  await f.locator("#adresseCabinet\\.codePostal").fill("69003");
  await f.locator("#adresseCabinet\\.ville").fill("Lyon");
  await f.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  await f.getByRole("checkbox", { name: /conditions générales d’utilisation/ }).check();
  if (options.newsletter) await f.getByRole("checkbox", { name: /recevoir la newsletter/ }).check();
}

/** Lien de confirmation reçu dans la boîte de démonstration. */
export async function lienDeConfirmation(email: string): Promise<string> {
  const [m] = await requete<{ rendu: string }>("site", `SELECT rendu FROM message_demonstration WHERE destinataire = $1 AND objet LIKE 'Confirmez%' ORDER BY date DESC LIMIT 1`, [email]);
  const lien = m!.rendu.match(/href="([^"]*verify-email[^"]*)"/)![1]!.replace(/&amp;/g, "&");
  return new URL(lien).pathname + new URL(lien).search;
}

/**
 * Inscrit un professionnel par le formulaire et confirme son email. F16 : le compte est alors
 * validé (il peut commander) ; son numéro d'entreprise n'est pas encore vérifié.
 */
export async function creerCompteEnAttente(page: Page, options: { newsletter?: boolean; numero?: string } = {}) {
  const rpps = rppsDeTest();
  const email = `compte-${rpps}@demo.explocardio.test`;
  await page.goto("/inscription");
  await remplirInscription(page, rpps, email, options);
  await page.waitForTimeout(3_200);
  await page.locator("main").getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL(/\/inscription\/verifier-email$/);
  // Limite de requêtes par adresse IP (Better Auth) : les parcours créent beaucoup de comptes
  // depuis la même machine ; en cas de refus 429, on patiente et on recommence.
  const lien = await lienDeConfirmation(email);
  for (let essai = 0; essai < 8; essai++) {
    const r = await page.goto(lien);
    if (r?.status() !== 429) break;
    await page.waitForTimeout((Number(r.headers()["x-retry-after"] ?? 10) + 1) * 1000);
  }
  await page.waitForURL(/\/inscription\/email-confirme/);
  const [c] = await requete<{ id: string }>("site", `SELECT c.id FROM compte_client c JOIN utilisateur u ON u.id = c."utilisateurId" WHERE u.email = $1`, [email]);
  return { rpps, email, id: c!.id };
}

/** Inscrit un compte et simule la vérification de son numéro par l'équipe (F16). */
export async function creerCompteValide(page: Page, options: { newsletter?: boolean } = {}) {
  const compte = await creerCompteEnAttente(page, options);
  await requete("site", `UPDATE compte_client SET statut = 'valide', "valideLe" = COALESCE("valideLe", now()), siret = '73282932000074', "numeroVerification" = 'verifie' WHERE id = $1`, [compte.id]);
  return compte;
}

/**
 * Connexion par le formulaire du site. Better Auth limite les essais par adresse IP (les parcours
 * tournent en parallèle depuis la même machine) : en cas de refus 429, on patiente et on recommence.
 */
export async function seConnecter(page: Page, email: string, motDePasse = MOT_DE_PASSE) {
  await page.goto("/connexion");
  const f = page.locator("main");
  await f.getByLabel("Adresse email").fill(email);
  await f.getByLabel("Mot de passe", { exact: true }).fill(motDePasse);
  for (let essai = 0; essai < 8; essai++) {
    const [reponse] = await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/auth/sign-in/email")),
      f.getByRole("button", { name: "Se connecter" }).click(),
    ]);
    if (reponse.status() !== 429) return;
    await page.waitForTimeout((Number(reponse.headers()["x-retry-after"] ?? 5) + 1) * 1000);
  }
}

/** Connecte un compte créé par un parcours, sans passer par le formulaire. */
export async function connecterCompte(contexte: BrowserContext, email: string, motDePasse = MOT_DE_PASSE) {
  const r = await postAvecPatience(contexte.request, "/api/auth/sign-in/email", { email, password: motDePasse }, { origin: process.env.E2E_BASE_URL ?? "http://localhost:3100" });
  if (!r.ok()) throw new Error(`Connexion refusée pour ${email} (${r.status()}).`);
}

/** Rattache au compte une fiche client fictive dans la base de démonstration (comme une validation). */
export async function attacherFiche(compte: { id: string; rpps: string; email: string }) {
  const ref = `FICT-P-E2E-${compte.rpps}`;
  await requete("demo", `INSERT INTO res_partner (ref, nom, email, rpps) VALUES ($1, 'Camille Testeur', $2, $3) ON CONFLICT DO NOTHING`, [ref, compte.email, compte.rpps]);
  await requete("site", `UPDATE compte_client SET "odooPartnerRef" = $1 WHERE id = $2`, [ref, compte.id]);
  return ref;
}
