import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { COMPTES, connecterNavigateur } from "../session";
import { attacherFiche, connecterCompte, creerCompteValide, requete } from "./outils";

// T034 (US5, FR-036, FR-037).

test.describe.configure({ mode: "serial" });

const RUBRIQUES = ["logiciels"];
// Rubriques remplies par F04 à F06 : elles s'affichent sans erreur, même sans commande.
const RUBRIQUES_F04 = {
  commandes: "Vous n’avez pas encore passé de commande",
  factures: "",
  locations: "Vous n’avez pas de mise à disposition en cours",
  "bons-achat": "Comment gagner des bons",
  assistance: "Droits d’assistance",
} as const;

test("sans session, Mon compte renvoie vers la connexion avec retour", async ({ page }) => {
  await page.goto("/mon-compte/adresses");
  await expect(page).toHaveURL(/\/connexion\?retour=%2Fmon-compte%2Fadresses$/);
});

test("tableau de bord : statut, contact WhatsApp, rubriques sans erreur", async ({ page }) => {
  test.setTimeout(120_000);
  const c = await creerCompteValide(page);
  await connecterCompte(page.context(), c.email);
  await page.goto("/mon-compte");
  await verifierAccessibilite(page);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Bonjour");
  await expect(page.getByRole("link", { name: "Écrire sur WhatsApp" })).toHaveAttribute("href", "/demo/contact?moyen=whatsapp");
  for (const r of RUBRIQUES) {
    const reponse = await page.goto(`/mon-compte/${r}`);
    expect(reponse?.status(), r).toBe(200);
    await expect(page.getByText("Cette rubrique sera bientôt disponible")).toBeVisible();
  }
  for (const [r, texte] of Object.entries(RUBRIQUES_F04)) {
    const reponse = await page.goto(`/mon-compte/${r}`);
    expect(reponse?.status(), r).toBe(200);
    if (texte) await expect(page.locator("main")).toContainText(texte);
  }
});

test("téléphone et adresse de livraison : enregistrés et reportés sur la fiche client", async ({ page }) => {
  test.setTimeout(120_000);
  const c = await creerCompteValide(page);
  const ref = await attacherFiche(c);
  await connecterCompte(page.context(), c.email);

  await page.goto("/mon-compte/informations");
  await verifierAccessibilite(page);
  await page.locator("main").getByLabel("Téléphone").fill("+33 6 11 22 33 44");
  await page.locator("main").getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByText("Vos informations sont enregistrées.")).toBeVisible();

  await page.goto("/mon-compte/adresses");
  await verifierAccessibilite(page);
  await page.locator("#livraison\\.codePostal").fill("97400");
  await page.getByRole("button", { name: "Enregistrer les adresses" }).click();
  await expect(page.getByText(/France métropolitaine/).first()).toBeVisible();
  await page.locator("#livraison\\.ligne1").fill("8 avenue de la Livraison");
  await page.locator("#livraison\\.codePostal").fill("20000");
  await page.locator("#livraison\\.ville").fill("Ajaccio");
  await page.getByRole("button", { name: "Enregistrer les adresses" }).click();
  await expect(page.getByText("Vos adresses sont enregistrées.")).toBeVisible();

  await expect
    .poll(async () => (await requete<{ telephone: string; adresses: unknown }>("demo", `SELECT telephone, adresses FROM res_partner WHERE ref = $1`, [ref]))[0])
    .toMatchObject({ telephone: "+33 6 11 22 33 44", adresses: expect.arrayContaining([expect.objectContaining({ ville: "Ajaccio" })]) });
});

test("changement d'email : confirmation de la nouvelle adresse, ancienne prévenue, journal", async ({ page }) => {
  test.setTimeout(120_000);
  const c = await creerCompteValide(page);
  await connecterCompte(page.context(), c.email);
  const nouvel = `nouvel-${c.rpps}@demo.explocardio.test`;
  await page.goto("/mon-compte/informations");
  await page.locator("main").getByLabel("Nouvelle adresse email").fill(nouvel);
  await page.getByRole("button", { name: "Changer d’adresse" }).click();
  await expect(page.getByText(/Un lien de confirmation a été envoyé/)).toBeVisible();

  const [m] = await requete<{ rendu: string }>("site", `SELECT rendu FROM message_demonstration WHERE destinataire = $1 AND objet = 'Confirmez votre nouvelle adresse'`, [nouvel]);
  const lien = new URL(m!.rendu.match(/href="([^"]*confirmer-email[^"]*)"/)![1]!.replace(/&amp;/g, "&"));
  await page.goto(lien.pathname + lien.search);
  await expect(page.getByRole("heading", { name: "Nouvelle adresse confirmée" })).toBeVisible();
  expect(await requete("site", `SELECT 1 FROM utilisateur WHERE email = $1`, [nouvel])).toHaveLength(1);
  expect(await requete("site", `SELECT 1 FROM message_demonstration WHERE destinataire = $1 AND objet = 'Changement de l''adresse de votre compte'`, [c.email])).toHaveLength(1);
  const journal = await requete<{ action: string }>("site", `SELECT j.action FROM journal_action j JOIN utilisateur u ON u.id = j.objet WHERE u.email = $1`, [nouvel]);
  expect(journal.map((j) => j.action)).toEqual(expect.arrayContaining(["securite.email_change_demande", "securite.email_modifie"]));
});

test("changement de RPPS : demande transmise, visible par l'équipe, non appliquée", async ({ page, browser, baseURL }) => {
  test.setTimeout(120_000);
  const c = await creerCompteValide(page);
  await connecterCompte(page.context(), c.email);
  const nouveau = `99${String(Date.now()).slice(-9)}`;
  await page.goto("/mon-compte/informations");
  await page.locator("main").getByLabel("Nouveau numéro RPPS").fill(nouveau);
  await page.getByRole("button", { name: "Demander le changement" }).click();
  await expect(page.getByText(/Votre demande est transmise/)).toBeVisible();
  expect(await requete("site", `SELECT 1 FROM compte_client WHERE id = $1 AND rpps = $2`, [c.id, c.rpps])).toHaveLength(1);

  const equipe = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  await connecterNavigateur(equipe, COMPTES.admin);
  const admin = await equipe.newPage();
  await admin.goto("/admin/comptes/demandes");
  await verifierAccessibilite(admin);
  await expect(admin.getByText(nouveau)).toBeVisible();
  await equipe.close();
});

test("newsletter : désabonnement puis réabonnement, chaque choix enregistré", async ({ page }) => {
  test.setTimeout(120_000);
  const c = await creerCompteValide(page, { newsletter: true });
  await connecterCompte(page.context(), c.email);
  await page.goto("/mon-compte/preferences");
  await verifierAccessibilite(page);
  await expect(page.locator("main").getByRole("status")).toContainText("Vous êtes abonné");
  await page.getByRole("button", { name: "Me désabonner" }).click();
  await expect(page.locator("main").getByRole("status")).toContainText("Vous n'êtes pas abonné");
  await page.getByRole("button", { name: "M’abonner à la newsletter" }).click();
  await expect(page.locator("main").getByRole("status")).toContainText("Vous êtes abonné");
  const lignes = await requete<{ etat: boolean }>("site", `SELECT etat FROM consentement WHERE "compteId" = $1 AND objet = 'newsletter' ORDER BY date`, [c.id]);
  expect(lignes.map((l) => l.etat)).toEqual([true, false, true]);
});
