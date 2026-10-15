import { expect, test } from "@playwright/test";
import { ecrireEtatAcces, ETAT_ACCES } from "./acces-global";
import { requete } from "./bases";
import { COMPTES, connecterNavigateur } from "./session";

// T082 (US8, SC-010, FR-034 à FR-037) : aucune page sans le mot de passe ; bandeau sur toutes
// les pages ; robots.txt et en-têtes de non-indexation ; changement du mot de passe qui ferme
// les sessions d'accès.

const PAGES = ["/", "/connexion", "/admin", "/demo/paiement?session=x"];

test.describe("sans le mot de passe", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("aucune page n'est accessible : redirection vers la page d'accès", async ({ page }) => {
    for (const chemin of PAGES) {
      await page.goto(chemin);
      await expect(page, chemin).toHaveURL(/\/demo\/acces\?retour=/);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Site de démonstration");
    }
  });

  test("un mot de passe faux est refusé, le bon ouvre le site", async ({ page }) => {
    await page.goto("/admin");
    await page.getByLabel("Mot de passe de démonstration").fill("mauvais-mot-de-passe");
    await page.getByRole("button", { name: "Entrer" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Mot de passe incorrect" })).toBeVisible();
    await page.getByLabel("Mot de passe de démonstration").fill(process.env.DEMO_SITE_PASSWORD!);
    await page.getByRole("button", { name: "Entrer" }).click();
    await expect(page).not.toHaveURL(/\/demo\/acces/);
  });

  test("robots.txt interdit tout et chaque réponse porte l'en-tête de non-indexation", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(await robots.text()).toMatch(/Disallow: \//);
    expect(robots.headers()["x-robots-tag"]).toBe("noindex, nofollow");
    const accueil = await request.get("/", { maxRedirects: 0 });
    expect(accueil.headers()["x-robots-tag"]).toBe("noindex, nofollow");
    const police = await request.get("/fonts/inter/inter-latin-400-normal.woff2");
    expect(police.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  });
});

test("le bandeau de démonstration est présent sur chaque page et ne se masque pas", async ({ page, context }) => {
  for (const chemin of ["/", "/connexion"]) {
    await page.goto(chemin);
    const bandeau = page.getByRole("region", { name: "Avertissement" });
    await expect(bandeau).toContainText("Version de démonstration — données fictives");
    await expect(bandeau.getByRole("button")).toHaveCount(0);
  }
  await connecterNavigateur(context, COMPTES.admin);
  await page.goto("/admin");
  await expect(page.getByRole("region", { name: "Avertissement" })).toBeVisible();
});

test("changer le mot de passe ferme les sessions d'accès", async ({ page, context, browser, baseURL }) => {
  test.setTimeout(90_000);
  const temoin = await browser.newContext({ baseURL, storageState: ETAT_ACCES });
  const pageTemoin = await temoin.newPage();
  await pageTemoin.goto("/connexion");
  await expect(pageTemoin).toHaveURL(/\/connexion/);

  const motDePasse = process.env.DEMO_SITE_PASSWORD!;
  await connecterNavigateur(context, COMPTES.admin);
  await page.goto("/admin/demonstration/acces");
  // On remet le même mot de passe : seule la version change, ce qui ferme les sessions.
  await page.getByLabel("Nouveau mot de passe", { exact: true }).fill(motDePasse);
  await page.getByLabel("Confirmez le nouveau mot de passe").fill(motDePasse);
  await page.getByRole("button", { name: "Changer le mot de passe" }).click();
  await expect(page).toHaveURL(/\/demo\/acces/);

  await new Promise((fin) => setTimeout(fin, 11_000)); // cache de version du site : 10 s
  await pageTemoin.goto("/connexion");
  await expect(pageTemoin).toHaveURL(/\/demo\/acces/);
  await temoin.close();
  const journal = await requete("site", `SELECT 1 FROM journal_action WHERE action = 'demo.mot_de_passe_change'`);
  expect(journal.length).toBeGreaterThan(0);
  // Les parcours suivants reçoivent l'accès correspondant à la nouvelle version.
  await ecrireEtatAcces(baseURL!);
});
