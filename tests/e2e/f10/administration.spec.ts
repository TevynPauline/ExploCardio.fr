import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { requete } from "../bases";
import { COMPTES, connecterNavigateur } from "../session";

// T027 — Back-office → Emails (F10, US8, SC-009) : scénarios et règles d'envoi, modèles (brouillon,
// aperçu, test, publication en moins de 5 minutes, retour à l'origine), suivi des envois, levée
// d'une suspension, désinscription enregistrée par l'équipe ; réservé à l'administrateur.

// Les tests modifient des réglages partagés : ils sont rétablis quoi qu'il arrive.
test.afterEach(async () => {
  await requete("site", `DELETE FROM parametre WHERE cle LIKE 'emailing.%'`);
  await requete("site", `DELETE FROM modele_email WHERE code = 'commande_confirmee'`);
});

const parametres = (cles: string[]) => requete<{ cle: string; valeur: string }>("site", `SELECT cle, valeur FROM parametre WHERE cle = ANY($1)`, [cles]);

test("scénarios et règles d'envoi : régler, puis rétablir", async ({ page }) => {
  test.setTimeout(120_000);
  await connecterNavigateur(page.context(), COMPTES.admin);
  await page.goto("/admin/emails/scenarios");
  await verifierAccessibilite(page);
  const panier = page.getByRole("checkbox").nth(1);
  await expect(panier).toBeChecked();
  await panier.uncheck();
  await page.getByLabel("Avance avant la date prévue (jours)").fill("10");
  await page.getByLabel("Nom de l’expéditeur").fill("ExploCardio.fr (test)");
  await page.getByRole("button", { name: "Enregistrer les réglages" }).click();
  await expect(page.getByText(/Réglages enregistrés/)).toBeVisible();
  expect(Object.fromEntries((await parametres(["emailing.panier.actif", "emailing.reappro.avance_jours", "emailing.expediteur_nom"])).map((p) => [p.cle, p.valeur]))).toEqual({
    "emailing.panier.actif": "false",
    "emailing.reappro.avance_jours": "10",
    "emailing.expediteur_nom": "ExploCardio.fr (test)",
  });
  // Valeur refusée : plage incohérente.
  await page.getByLabel("Envois à partir de (heure, jours ouvrés)").fill("20");
  await page.getByRole("button", { name: "Enregistrer les réglages" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("La plage d'envoi doit commencer avant de finir.");
  // Rétablir.
  await page.goto("/admin/emails/scenarios");
  await page.getByRole("checkbox").nth(1).check();
  await page.getByLabel("Avance avant la date prévue (jours)").fill("7");
  await page.getByLabel("Nom de l’expéditeur").fill("ExploCardio.fr");
  await page.getByRole("button", { name: "Enregistrer les réglages" }).click();
  await expect(page.getByText(/Réglages enregistrés/)).toBeVisible();
});

test("modèle : brouillon, aperçu, test, publication en moins de 5 minutes, retour à l'origine", async ({ page }) => {
  test.setTimeout(180_000);
  await connecterNavigateur(page.context(), COMPTES.admin);
  const debut = Date.now();
  await page.goto("/admin/emails/modeles");
  await verifierAccessibilite(page);
  await page.getByRole("link", { name: "Confirmation de commande" }).click();
  await expect(page.getByRole("heading", { name: "Confirmation de commande", level: 1 })).toBeVisible();

  // Variable inconnue : refusée.
  await page.getByLabel("Objet", { exact: true }).fill("Commande {{ref}} {{inconnue}}");
  await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Variable inconnue : {{inconnue}}");

  await page.getByLabel("Objet", { exact: true }).fill("Merci pour votre commande {{ref}}");
  await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
  await expect(page.getByText(/Brouillon enregistré/)).toBeVisible();
  await expect(page.getByText("Objet : Merci pour votre commande FICT-SO-00042")).toBeVisible();
  await verifierAccessibilite(page);
  await page.getByRole("button", { name: "M’envoyer un email de test" }).click();
  await expect(page.getByText(/Email de test envoyé/)).toBeVisible();
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(page.getByText(/Texte publié/)).toBeVisible();
  expect(Date.now() - debut).toBeLessThan(5 * 60_000); // SC-009
  const [publie] = await requete<{ objet: string }>("site", `SELECT "textesPublies"->>'objet' AS objet FROM modele_email WHERE code = 'commande_confirmee'`);
  expect(publie!.objet).toBe("Merci pour votre commande {{ref}}");

  await page.getByRole("button", { name: "Revenir au texte d’origine" }).click();
  await expect(page.getByText("Texte d’origine rétabli.")).toBeVisible();
  expect(await requete("site", `SELECT 1 FROM modele_email WHERE code = 'commande_confirmee'`)).toHaveLength(0);
});

test("suivi des envois : recherche, suspension levée, désinscription enregistrée par l'équipe", async ({ page }) => {
  test.setTimeout(120_000);
  const email = `suivi-e2e-${Date.now()}@rejet.demo.explocardio.test`;
  await requete("site", `INSERT INTO adresse_rejetee (email, "rejetsTemporaires", "suspendueLe", motif, "modifieLe") VALUES ($1, 0, now(), 'Adresse inexistante (simulation)', now())`, [email]);
  await requete("site", `INSERT INTO envoi (id, cle, famille, modele, destinataire, declencheur, etat, motif, "programmeLe", "creeLe") VALUES ($1, $1, 'service', 'panier_abandonne', $2, 'panier en attente', 'annule', 'adresse suspendue', now(), now())`, [`e2e-suivi-${Date.now()}`, email]);
  await connecterNavigateur(page.context(), COMPTES.admin);
  await page.goto(`/admin/emails?q=${encodeURIComponent(email)}`);
  await verifierAccessibilite(page);
  await expect(page.getByRole("cell", { name: email })).toBeVisible();
  await expect(page.getByRole("cell", { name: /Non envoyé.*adresse suspendue/ })).toBeVisible();
  await page.getByRole("button", { name: "Lever la suspension" }).click();
  await expect(page.getByText(`Suspension levée pour ${email}.`)).toBeVisible();
  const [r] = await requete<{ levee: boolean }>("site", `SELECT "leveeLe" IS NOT NULL AS levee FROM adresse_rejetee WHERE email = $1`, [email]);
  expect(r!.levee).toBe(true);

  await page.goto(`/admin/emails?q=${encodeURIComponent(email)}`);
  await page.getByLabel("Désinscription reçue par réponse à un email").selectOption("panierAbandonne");
  await page.getByRole("button", { name: "Enregistrer la désinscription" }).click();
  await expect(page.getByText("Désinscription enregistrée.")).toBeVisible();
  const [c] = await requete<{ origine: string }>("site", `SELECT origine FROM consentement WHERE email = $1 AND objet = 'email:panierAbandonne'`, [email]);
  expect(c!.origine).toBe("equipe");
});

test("réservé à l'administrateur", async ({ page }) => {
  await connecterNavigateur(page.context(), COMPTES.support);
  const r = await page.goto("/admin/emails/modeles");
  expect(page.url()).toContain("acces=refuse");
  expect(r?.ok()).toBe(true);
});
