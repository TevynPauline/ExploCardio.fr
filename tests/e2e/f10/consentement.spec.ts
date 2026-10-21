import { expect, test } from "@playwright/test";
import { signerJeton } from "@/domaine/emailing/jetons";
import { verifierAccessibilite } from "../axe";
import { requete } from "../bases";
import { creerCompteValide } from "../f02/outils";
import { COMPTES, connecterNavigateur } from "../session";

// T016 — consentement (F10, US3, SC-002, SC-004, D7, D8) : campagne préparée au back-office,
// test obligatoire, envoyée aux seuls abonnés confirmés ; désinscription sans connexion depuis le
// lien d'un email, effective pour la campagne programmée ; désinscription en un clic (RFC 8058).

test("une campagne ne vise que les abonnés ; la désinscription par lien l'annule", async ({ page, browser, baseURL }) => {
  test.setTimeout(240_000);
  const visiteur = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  const v = await visiteur.newPage();
  const abonne = await creerCompteValide(v, { newsletter: true });
  const nonAbonne = await creerCompteValide(v, { newsletter: false });
  await visiteur.close();

  await connecterNavigateur(page.context(), COMPTES.admin);
  const objet = `Campagne e2e ${Date.now()}`;
  await page.goto("/admin/emails/campagnes");
  await verifierAccessibilite(page);
  await page.getByLabel("Type").selectOption("promotion");
  await page.getByLabel("Objet de l’email").fill(objet);
  await page.getByLabel("Titre affiché dans l’email").fill("Électrodes : offre de test");
  await page.getByLabel("Texte (une ligne vide sépare deux paragraphes)").fill("Une offre de test sur les électrodes Holter, pour vérifier les campagnes.");
  await page.getByLabel(/^Lien/).fill("/accessoires-consommables");
  await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect(page.getByRole("heading", { name: objet, level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Programmer" })).toBeDisabled();

  await page.getByRole("button", { name: "M’envoyer un email de test" }).click();
  await expect(page.getByText(/Email de test envoyé/)).toBeVisible();
  await page.getByRole("button", { name: "Programmer" }).click();
  await expect(page.getByText(/Campagne programmée pour \d+ abonné/)).toBeVisible();
  await verifierAccessibilite(page);

  const [c] = await requete<{ id: string }>("site", `SELECT id FROM campagne WHERE objet = $1`, [objet]);
  const envoi = (email: string) => requete<{ etat: string; motif: string | null }>("site", `SELECT etat, motif FROM envoi WHERE "campagneId" = $1 AND destinataire = $2`, [c!.id, email]);
  expect(await envoi(nonAbonne.email)).toEqual([]);
  expect(await envoi(abonne.email)).toHaveLength(1);

  // Lien « Se désinscrire » d'un email, sans connexion : confirmation en un bouton.
  const anonyme = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  const a = await anonyme.newPage();
  await a.goto(`/preferences/${encodeURIComponent(signerJeton(abonne.email))}?desinscrire=newsletter`);
  await expect(a.getByRole("heading", { name: "Confirmer la désinscription" })).toBeVisible();
  await verifierAccessibilite(a);
  await a.getByRole("button", { name: "Me désinscrire", exact: true }).click();
  await expect(a.getByText(/votre désinscription est enregistrée/)).toBeVisible();
  await expect(a.getByText("Vous n’êtes pas abonné à la newsletter.")).toBeVisible();
  await anonyme.close();

  // L'envoi programmé n'a pas lieu (ou a déjà eu lieu s'il est parti avant la désinscription).
  await page.goto("/admin/demonstration/emails");
  await page.getByRole("button", { name: "Lancer les scénarios" }).click();
  await expect(page.getByText(/Scénarios lancés/)).toBeVisible({ timeout: 60_000 });
  // Hors des plages d'envoi (soir, week-end), l'envoi reste programmé : il sera annulé au moment
  // de partir, puisque l'abonné s'est désinscrit.
  const [e] = await envoi(abonne.email);
  expect(["annule", "envoye", "programme"]).toContain(e!.etat);
  if (e!.etat === "annule") expect(e!.motif).toBe("non abonné");
  const [abonnement] = await requete<{ etat: boolean }>("site", `SELECT etat FROM consentement WHERE email = $1 AND objet = 'newsletter' ORDER BY date DESC LIMIT 1`, [abonne.email]);
  expect(abonnement!.etat).toBe(false);

  // Aucune campagne de test ne reste programmée. Pendant les heures d'envoi, elle a pu partir
  // dès le lancement des scénarios : il n'y a alors plus rien à annuler.
  await page.goto(`/admin/emails/campagnes/${c!.id}`);
  const annuler = page.getByRole("button", { name: "Annuler la campagne" });
  if (await annuler.count()) {
    await annuler.click();
    await expect(page.getByText(/Campagne annulée/)).toBeVisible();
  }
  const [fin] = await requete<{ etat: string }>("site", `SELECT etat FROM campagne WHERE id = $1`, [c!.id]);
  expect(["brouillon", "programmee"]).not.toContain(fin!.etat);
});

test("désinscription en un clic : POST sans connexion (RFC 8058)", async ({ request }) => {
  const email = `un-clic-${Date.now()}@demo.explocardio.test`;
  const ok = await request.post(`/api/emails/desinscription?j=${encodeURIComponent(signerJeton(email))}&objet=panierAbandonne`);
  expect(ok.status()).toBe(200);
  const [p] = await requete<{ panierAbandonne: boolean }>("site", `SELECT "panierAbandonne" FROM preferences_email WHERE email = $1`, [email]);
  expect(p!.panierAbandonne).toBe(false);
  const refuse = await request.post(`/api/emails/desinscription?j=faux&objet=newsletter`);
  expect(refuse.status()).toBe(400);
});
