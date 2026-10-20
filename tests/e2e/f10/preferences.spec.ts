import { expect, test } from "@playwright/test";
import { signerJeton } from "@/domaine/emailing/jetons";
import { verifierAccessibilite } from "../axe";
import { requete } from "../bases";
import { clientConnecte } from "../f04/outils";

// T018 — centre de préférences (F10, US4, SC-010, FR-022 à FR-024) : dans « Mon compte » et
// par le lien d'un email sans connexion ; aucune information du compte sur la page du lien.

test("régler ses emails dans « Mon compte », puis par le lien d'un email", async ({ page, browser, baseURL }) => {
  test.setTimeout(180_000);
  const client = await clientConnecte(browser, baseURL, page);
  const debut = Date.now();
  await page.goto("/mon-compte/preferences");
  await verifierAccessibilite(page);
  await expect(page.getByRole("heading", { name: "Emails utiles, que vous pouvez désactiver" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Emails toujours envoyés" })).toBeVisible();
  await expect(page.getByText(/Suivi de vos commandes et de vos paiements/i)).toBeVisible();

  const reappro = page.getByRole("listitem", { name: "Relances de réapprovisionnement" });
  await reappro.getByRole("button", { name: /Désactiver/ }).click();
  await expect(page.getByText("Votre préférence est enregistrée.")).toBeVisible();
  await expect(page.getByRole("listitem", { name: "Relances de réapprovisionnement" })).toContainText("Désactivé");
  expect(Date.now() - debut).toBeLessThan(60_000); // SC-010
  const [p] = await requete<{ reapprovisionnement: boolean }>("site", `SELECT reapprovisionnement FROM preferences_email WHERE email = $1`, [client.email]);
  expect(p!.reapprovisionnement).toBe(false);

  // Par le lien d'un email, sans connexion : mêmes réglages, aucune information du compte.
  const anonyme = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  const a = await anonyme.newPage();
  await a.goto(`/preferences/${encodeURIComponent(signerJeton(client.email))}`);
  await verifierAccessibilite(a);
  await expect(a.getByRole("listitem", { name: "Relances de réapprovisionnement" })).toContainText("Désactivé");
  // Aucune information du compte (hors l'adresse du lien elle-même).
  const texte = (await a.getByRole("main").innerText()).replace(client.email, "");
  expect(texte).not.toContain("Testeur");
  expect(texte).not.toContain(client.rpps);
  expect(texte).not.toContain("Cabinet de test");
  await a.getByRole("listitem", { name: "Relances de réapprovisionnement" }).getByRole("button", { name: /Activer/ }).click();
  await expect(a.getByText("Votre préférence est enregistrée.")).toBeVisible();
  const [q] = await requete<{ reapprovisionnement: boolean }>("site", `SELECT reapprovisionnement FROM preferences_email WHERE email = $1`, [client.email]);
  expect(q!.reapprovisionnement).toBe(true);
  const preuves = await requete<{ origine: string }>("site", `SELECT origine FROM consentement WHERE email = $1 AND objet = 'email:reapprovisionnement' ORDER BY date`, [client.email]);
  expect(preuves.map((x) => x.origine)).toEqual(["mon_compte", "lien_email"]);

  // Jeton falsifié : refusé.
  await a.goto(`/preferences/${encodeURIComponent(signerJeton(client.email))}x`);
  await expect(a.getByRole("heading", { name: "Lien invalide" })).toBeVisible();

  // Page lisible à 320 px.
  await a.setViewportSize({ width: 320, height: 800 });
  await a.goto(`/preferences/${encodeURIComponent(signerJeton(client.email))}`);
  const deborde = await a.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(deborde).toBe(false);
  await anonyme.close();
});

test("abonné à la newsletter sans compte : seulement la newsletter", async ({ page }) => {
  const email = `pied-${Date.now()}@demo.explocardio.test`;
  await requete("site", `INSERT INTO inscription_newsletter (id, email, etat, "textePresente", "confirmeeLe") VALUES ($1, $2, 'confirmee', 'test', now())`, [`test-${Date.now()}`, email]);
  await page.goto(`/preferences/${encodeURIComponent(signerJeton(email))}`);
  await expect(page.getByText("Vous êtes abonné à la newsletter (promotions, ventes flash, nouveautés).")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Emails utiles, que vous pouvez désactiver" })).toHaveCount(0);
  await page.getByRole("button", { name: "Me désinscrire de la newsletter" }).click();
  await expect(page.getByText("Vous n’êtes pas abonné à la newsletter.")).toBeVisible();
});
