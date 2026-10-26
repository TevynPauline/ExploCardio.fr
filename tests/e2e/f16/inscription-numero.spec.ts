import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { requete } from "../bases";
import { connecterCompte, creerCompteEnAttente } from "../f02/outils";
import { ELECTRODES, ajouterDepuisFiche } from "../f04/outils";
import { COMPTES, connecterNavigateur } from "../session";

// T028 — inscription sans RPPS (F16, US7, FR-023 à FR-027, SC-007) : numéro facultatif, demandé
// une seule fois à la première commande, vérifié ensuite par l'équipe ; refus → compte suspendu.

test.describe.configure({ timeout: 240_000, mode: "serial" });

test("inscription sans numéro en moins de 3 minutes ; le formulaire ne demande plus de RPPS", async ({ page }) => {
  await page.goto("/inscription");
  await expect(page.locator("main").getByText(/RPPS/)).toHaveCount(0);
  await expect(page.locator("main").getByLabel("SIRET ou SIREN (facultatif)")).toBeVisible();
  await verifierAccessibilite(page);
  const debut = Date.now();
  const c = await creerCompteEnAttente(page);
  expect(Date.now() - debut).toBeLessThan(180_000);
  await expect(page.locator("main")).toContainText("vous pouvez commander dès maintenant");
  const [compte] = await requete<{ statut: string; siret: string | null }>("site", `SELECT statut, siret FROM compte_client WHERE id = $1`, [c.id]);
  expect(compte).toEqual({ statut: "valide", siret: null });
});

test("première commande : numéro demandé avant le paiement, une seule fois ; puis vérifié par l'équipe", async ({ page, browser, baseURL }) => {
  const visiteur = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  const c = await creerCompteEnAttente(await visiteur.newPage());
  await visiteur.close();
  await connecterCompte(page.context(), c.email);
  await ajouterDepuisFiche(page, ELECTRODES);
  await page.goto("/commande/adresses");
  const numero = page.locator("main").getByLabel("SIRET ou SIREN de votre cabinet");
  await expect(numero).toBeVisible();
  await numero.fill("12345");
  await page.locator("main").getByRole("button", { name: "Continuer" }).click();
  await expect(page.locator("main").getByRole("alert").first()).toContainText("numéro d'entreprise n'est pas valide");
  await numero.fill("732 829 320 00074");
  await page.locator("main").getByRole("button", { name: "Continuer" }).click();
  await expect(page).toHaveURL(/\/commande\/livraison/, { timeout: 20_000 });
  const [compte] = await requete<{ siret: string; numeroVerification: string }>("site", `SELECT siret, "numeroVerification" FROM compte_client WHERE id = $1`, [c.id]);
  expect(compte).toEqual({ siret: "73282932000074", numeroVerification: "a_verifier" });
  await page.goto("/commande/adresses");
  await expect(page.locator("main").getByLabel("SIRET ou SIREN de votre cabinet")).toHaveCount(0);

  // L'équipe vérifie le numéro depuis « À traiter ».
  const equipe = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  await connecterNavigateur(equipe, COMPTES.admin);
  const admin = await equipe.newPage();
  await admin.goto("/admin");
  await admin.locator("main").getByRole("link", { name: /Numéros à vérifier/ }).click();
  await admin.getByRole("region", { name: "Liste des clients" }).getByRole("row").filter({ hasText: c.email }).getByRole("link").click();
  await admin.getByRole("button", { name: "Numéro vérifié" }).click();
  await expect(admin.locator("main").getByRole("status")).toContainText("Décision enregistrée");
  const [apres] = await requete<{ numeroVerification: string }>("site", `SELECT "numeroVerification" FROM compte_client WHERE id = $1`, [c.id]);
  expect(apres!.numeroVerification).toBe("verifie");
  await equipe.close();
});

test("numéro refusé : compte suspendu, client prévenu avec le motif", async ({ page, browser, baseURL }) => {
  const visiteur = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  const c = await creerCompteEnAttente(await visiteur.newPage(), { numero: "73282932000074" });
  await visiteur.close();
  await connecterNavigateur(page.context(), COMPTES.admin);
  await page.goto(`/admin/clients/${c.id}`);
  await page.getByLabel("Motif du refus (envoyé au client)").fill("aucune entreprise en activité sous ce numéro");
  await page.getByRole("button", { name: "Numéro refusé" }).click();
  await expect(page.locator("main").getByRole("status")).toContainText("Décision enregistrée");
  const [compte] = await requete<{ statut: string }>("site", `SELECT statut FROM compte_client WHERE id = $1`, [c.id]);
  expect(compte!.statut).toBe("suspendu");
  await expect
    .poll(async () => (await requete("site", `SELECT 1 FROM message_demonstration WHERE destinataire = $1 AND objet = 'Votre numéro d''entreprise' AND rendu LIKE '%aucune entreprise en activité%'`, [c.email])).length, { timeout: 20_000 })
    .toBe(1);
});
