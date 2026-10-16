import { expect, test, type Page } from "@playwright/test";
import { COMPTES, connecterNavigateur } from "../session";
import { ETAT_ACCES, requete } from "./outils";

// T031 (US2-7, US2-8, FR-002). Les messages sont créés par le mini back-office (comme le fait
// un administrateur, ce qui met le site à jour aussitôt), puis supprimés.

test.describe.configure({ mode: "serial" });

const marque = `${Date.now() % 100000}`;
const textes = [`Promotion de test A ${marque}`, `Promotion de test B ${marque}`];

test.afterAll(async () => {
  await requete("site", `DELETE FROM contenu WHERE type = 'bandeau' AND corps = ANY($1)`, [textes]);
});

async function bandeau(page: Page) {
  await page.goto("/");
  return page.getByRole("region", { name: "Promotion en cours" });
}

test("sans message actif, aucun bandeau ni espace vide", async ({ page }) => {
  const actifs = await requete<{ n: number }>("site", `SELECT count(*)::int n FROM contenu WHERE type = 'bandeau' AND etat = 'publie'`);
  test.skip(actifs[0]!.n > 0, "Un message réel est actif sur ce site.");
  await expect(await bandeau(page)).toHaveCount(0);
});

test("deux messages actifs défilent, pause possible, non masquable", async ({ page, context }) => {
  test.setTimeout(120_000);
  await connecterNavigateur(context, COMPTES.admin);
  for (const texte of textes) {
    await page.goto("/admin/contenus/bandeau");
    await page.locator("#texte-nouveau").fill(texte);
    await page.getByRole("button", { name: "Ajouter le message" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Message enregistré" })).toBeVisible();
  }
  const zone = await bandeau(page);
  await expect(zone).toBeVisible();
  await expect(zone.getByRole("button", { name: /fermer|masquer/i })).toHaveCount(0);
  const premier = await zone.locator("p").innerText();
  await expect(zone.locator("p")).not.toHaveText(premier, { timeout: 9_000 });
  await zone.getByRole("button", { name: "Mettre en pause" }).click();
  const fige = await zone.locator("p").innerText();
  await page.waitForTimeout(7_000);
  expect(await zone.locator("p").innerText()).toBe(fige);
});

test("rotation suspendue d'office quand les animations sont réduites", async ({ browser, baseURL }) => {
  const contexte = await browser.newContext({ baseURL, reducedMotion: "reduce", storageState: ETAT_ACCES });
  const page = await contexte.newPage();
  const zone = await bandeau(page);
  await expect(zone.getByRole("button", { name: "Reprendre le défilement" })).toBeDisabled();
  const texte = await zone.locator("p").innerText();
  await page.waitForTimeout(7_000);
  expect(await zone.locator("p").innerText()).toBe(texte);
  await contexte.close();
});

test("un message hors de sa période n'est pas affiché", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  await requete("site", `DELETE FROM contenu WHERE type = 'bandeau' AND corps = ANY($1)`, [textes]);
  await page.goto("/admin/contenus/bandeau");
  await page.locator("#texte-nouveau").fill(textes[0]!);
  await page.locator("#fin-nouveau").fill("2020-01-01T10:00");
  await page.getByRole("button", { name: "Ajouter le message" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Message enregistré" })).toBeVisible();
  await expect((await bandeau(page)).getByText(textes[0]!)).toHaveCount(0);
});
