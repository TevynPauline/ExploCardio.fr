import { expect, test, type Browser, type Page } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { COMPTES, connecterNavigateur } from "../session";
import { MOT_DE_PASSE, lienDeConfirmation, remplirInscription, rppsDeTest } from "../f02/outils";
import { OSCAR, accepterConditions, ajouterMad, locationsDe, payerSurPageDemo, rendreParcDesTests, requete } from "./outils";

// T019 (US2, FR-008, FR-009, FR-044, FR-045, SC-004) : un médecin sans compte se fait dépanner
// sans perdre ses choix ; F16 (FR-034) : numéro d'entreprise saisi dans le parcours, l'appareil
// part après sa vérification par l'équipe ; numéro refusé → remboursement intégral.

test.describe.configure({ timeout: 300_000, mode: "serial" });
test.beforeEach(rendreParcDesTests);

/** Visiteur : mise à disposition au panier, inscription dans le parcours, paiement. */
async function louerSansCompte(page: Page) {
  const rpps = rppsDeTest();
  const email = `compte-${rpps}@demo.explocardio.test`;
  await ajouterMad(page, OSCAR);
  await page.goto("/panier");
  await page.getByRole("link", { name: "Commander" }).click();
  await page.waitForURL(/\/connexion\?retour=/);
  await page.getByRole("link", { name: "Créer un compte professionnel" }).click();
  await page.waitForURL(/\/inscription\?retour=/);
  await remplirInscription(page, rpps, email);
  await page.waitForTimeout(3_200);
  await page.locator("main").getByRole("button", { name: "Créer mon compte" }).click();
  await page.waitForURL(/\/inscription\/verifier-email/);
  for (let essai = 0; essai < 8; essai++) {
    const r = await page.goto(await lienDeConfirmation(email));
    if (r?.status() !== 429) break;
    await page.waitForTimeout(11_000);
  }
  await page.waitForURL(/\/inscription\/email-confirme\?retour=/);
  await verifierAccessibilite(page);
  await page.getByRole("link", { name: "Reprendre ma commande" }).click();
  await page.waitForURL(/\/connexion\?retour=/);
  const f = page.locator("main");
  await f.getByLabel("Adresse email").fill(email);
  await f.getByLabel("Mot de passe", { exact: true }).fill(MOT_DE_PASSE);
  for (let essai = 0; essai < 8; essai++) {
    const [reponse] = await Promise.all([page.waitForResponse((r) => r.url().includes("/api/auth/sign-in/email")), f.getByRole("button", { name: "Se connecter" }).click()]);
    if (reponse.status() !== 429) break;
    await page.waitForTimeout(11_000);
  }
  // Reprise du tunnel, avec le panier du visiteur (appareil conservé).
  await page.waitForURL(/\/commande\/adresses/);
  await page.locator("main").getByLabel("SIRET ou SIREN de votre cabinet").fill("73282932000074");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForURL(/\/commande\/livraison/);
  await expect(page.getByLabel(/Jour de livraison/)).toBeVisible();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForURL(/\/commande\/paiement/);
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForURL(/\/commande\/recapitulatif/);
  await expect(page.locator("main")).toContainText("Oscar 2");
  await expect(page.getByRole("status").filter({ hasText: "l’appareil sera expédié dès cette vérification" })).toBeVisible();
  await accepterConditions(page);
  await page.getByRole("button", { name: "Autoriser le prélèvement mensuel" }).click();
  await payerSurPageDemo(page, { moyen: "Carte Visa" });
  await page.waitForURL(/\/commande\/confirmation\//);
  const [c] = await requete<{ id: string; partenaire: string }>(
    "site",
    `SELECT c.id, c."odooPartnerRef" AS partenaire FROM compte_client c JOIN utilisateur u ON u.id = c."utilisateurId" WHERE u.email = $1`,
    [email],
  );
  return { email, compteId: c!.id, partenaireRef: c!.partenaire };
}

async function decider(browser: Browser, baseURL: string | undefined, compteId: string, decision: "valider" | "refuser") {
  const contexte = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  await connecterNavigateur(contexte, COMPTES.admin);
  const page = await contexte.newPage();
  await page.goto(`/admin/clients/${compteId}`);
  if (decision === "valider") await page.getByRole("button", { name: "Numéro vérifié" }).click();
  else {
    await page.locator("#motif-numero").fill("numéro introuvable dans l'annuaire des entreprises");
    await page.getByRole("button", { name: "Numéro refusé" }).click();
  }
  await expect(page.getByRole("status").filter({ hasText: "Décision enregistrée" })).toBeVisible();
  await contexte.close();
}

test("sans compte : inscription dans le parcours, choix conservés, expédition après vérification du numéro", async ({ page, browser, baseURL }) => {
  const debut = Date.now();
  const r = await louerSansCompte(page);
  expect(Date.now() - debut).toBeLessThan(8 * 60_000); // SC-004
  const [l] = await locationsDe(r.partenaireRef);
  expect(l!.etat).toBe("commandee");
  const [bloquee] = await requete<{ b: boolean }>("demo", `SELECT "expeditionBloquee" AS b FROM sale_subscription WHERE ref = $1`, [l!.ref]);
  expect(bloquee!.b).toBe(true);
  expect(await requete("site", `SELECT 1 FROM message_demonstration WHERE objet LIKE 'Vérification prioritaire%' AND rendu LIKE '%' || $1 || '%'`, [r.email])).toHaveLength(1);

  await decider(browser, baseURL, r.compteId, "valider");
  const [apres] = await requete<{ b: boolean }>("demo", `SELECT "expeditionBloquee" AS b FROM sale_subscription WHERE ref = $1`, [l!.ref]);
  expect(apres!.b).toBe(false);
});

test("numéro refusé : location annulée et intégralement remboursée, client prévenu", async ({ page, browser, baseURL }) => {
  const r = await louerSansCompte(page);
  await decider(browser, baseURL, r.compteId, "refuser");
  const [l] = await locationsDe(r.partenaireRef);
  expect(l!.etat).toBe("annulee");
  await expect
    .poll(async () => (await requete("site", `SELECT 1 FROM message_demonstration WHERE destinataire = $1 AND objet = 'Votre mise à disposition est annulée'`, [r.email])).length)
    .toBe(1);
  expect(await requete("demo", `SELECT 1 FROM refund_demo WHERE cle = $1`, [`refus:${l!.ref}`])).toHaveLength(1);
});
