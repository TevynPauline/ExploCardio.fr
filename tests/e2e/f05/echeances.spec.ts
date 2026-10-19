import { expect, test, type Browser } from "@playwright/test";
import { demoLocations, expedierEtLivrer, louer, rendreParcDesTests, requete } from "./outils";

// T031 (US6, FR-025 à FR-030, SC-009, SC-010) : rappel puis échéance facturée ; prélèvement
// échoué puis suspension ; résiliation sans retour : rappels puis mois suivant facturé.

test.describe.configure({ timeout: 300_000, mode: "serial" });
test.beforeEach(rendreParcDesTests);

const JOUR = 86_400_000;
const jour = (d: Date) => d.toISOString().slice(0, 10);

async function avancer(browser: Browser, baseURL: string | undefined, date: Date) {
  await demoLocations(browser, baseURL, async (admin) => {
    await admin.getByLabel("Date simulée").fill(jour(date));
    await admin.getByRole("button", { name: "Exécuter les actions planifiées" }).click();
    await expect(admin.getByRole("status").filter({ hasText: "Actions planifiées exécutées" })).toBeVisible();
  });
}

async function location(ref: string) {
  const [l] = await requete<{ echeance: Date; fin: Date | null; limite: Date | null; etat: string }>(
    "demo",
    `SELECT "prochaineEcheance" AS echeance, fin, "dateLimiteRetour" AS limite, etat FROM sale_subscription WHERE ref = $1`,
    [ref],
  );
  return l!;
}

const emails = async (email: string, objet: string) => (await requete("site", `SELECT 1 FROM message_demonstration WHERE destinataire = $1 AND objet LIKE $2`, [email, `${objet}%`])).length;

test("rappel avant l'échéance, puis échéance prélevée et facturée dans « Mon compte »", async ({ page, browser, baseURL }) => {
  const { client, ref } = await louer(page, browser, baseURL);
  await expedierEtLivrer(browser, baseURL, ref);
  const { echeance } = await location(ref);
  await avancer(browser, baseURL, new Date(new Date(echeance).getTime() - 2 * JOUR));
  await expect.poll(() => emails(client.email, "Prochaine échéance de votre location")).toBe(1);
  await page.goto("/mon-compte/locations");
  const factures = async () => (await page.getByRole("listitem", { name: `Location ${ref}` }).getByRole("link", { name: /Facture FICT\// }).count());
  const avant = await factures();
  await avancer(browser, baseURL, new Date(echeance));
  await expect
    .poll(async () => {
      await page.reload();
      return factures();
    })
    .toBe(avant + 1); // SC-009
});

test("prélèvement échoué : client prévenu, puis location suspendue au terme du délai", async ({ page, browser, baseURL }) => {
  const { client, ref } = await louer(page, browser, baseURL);
  await expedierEtLivrer(browser, baseURL, ref);
  await demoLocations(browser, baseURL, async (admin) => {
    await admin.getByRole("button", { name: `Prélèvement échoué (${ref})` }).click();
    await expect(admin.getByRole("status").filter({ hasText: "Prélèvement échoué simulé" })).toBeVisible();
  });
  await expect.poll(() => emails(client.email, "Le prélèvement de votre location n'a pas abouti")).toBe(1);
  await page.goto("/mon-compte/locations");
  await expect(page.getByRole("listitem", { name: `Location ${ref}` })).toContainText("Le dernier prélèvement n’a pas abouti");
  await avancer(browser, baseURL, new Date(Date.now() + 11 * JOUR));
  await page.reload();
  await expect(page.getByRole("listitem", { name: `Location ${ref}` })).toContainText("Suspendue");
  expect(await emails(client.email, "Votre location est suspendue")).toBe(1);
});

test("résiliée sans retour : rappels de retour, puis mois suivant facturé et prélevé", async ({ page, browser, baseURL }) => {
  const { client, ref } = await louer(page, browser, baseURL);
  await expedierEtLivrer(browser, baseURL, ref);
  await page.goto(`/mon-compte/locations/${ref}/resilier`);
  await page.getByRole("button", { name: "Confirmer la résiliation" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Votre résiliation est enregistrée" })).toBeVisible();
  const { fin, limite } = await location(ref);
  await avancer(browser, baseURL, new Date(new Date(fin!).getTime() + JOUR));
  await avancer(browser, baseURL, new Date(new Date(limite!).getTime() + JOUR));
  await expect.poll(() => emails(client.email, "Retour de votre appareil attendu")).toBe(1); // SC-010
  expect(await emails(client.email, "Prélèvement lié à votre location")).toBe(0);
  await avancer(browser, baseURL, new Date(new Date(limite!).getTime() + 7 * JOUR));
  await expect.poll(() => emails(client.email, "Prélèvement lié à votre location")).toBe(1);
  await page.goto("/mon-compte/locations");
  await expect(page.getByRole("listitem", { name: `Location ${ref}` })).toContainText("Retour du matériel attendu");
});
