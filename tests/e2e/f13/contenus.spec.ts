import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { requete } from "../bases";
import { COMPTES, connecterNavigateur } from "../session";

// T011 — contenus du site (F13, US2) : message du bandeau en préparation → aperçu → publié
// (SC-001) ; texte de la page Assistance modifié, prévisualisé, publié, revenu à l'origine ;
// image sans texte de remplacement refusée ; deux onglets : le second est prévenu.

test.describe.configure({ timeout: 240_000, mode: "serial" });

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

test("bandeau : en préparation visible en aperçu seulement, puis publié sur le site", async ({ page, context }) => {
  const texte = `Essai F13 ${Date.now() % 100000}`;
  await requete("site", `DELETE FROM contenu WHERE type = 'bandeau' AND (corps LIKE 'Essai F13 %' OR corps LIKE 'Verrou F13 %')`);
  await connecterNavigateur(context, COMPTES.admin);
  try {
    await page.goto("/admin/contenus/bandeau");
    await page.getByLabel("Texte (140 caractères au plus)").last().fill(texte);
    await page.locator("#etat-nouveau").selectOption("preparation");
    await page.getByRole("button", { name: "Ajouter le message" }).click();
    await expect(page.locator("main").getByRole("status")).toBeVisible();

    const visiteur = await context.browser()!.newContext({ baseURL: test.info().project.use.baseURL, storageState: "playwright/.auth/acces-demo.json" });
    const public_ = await visiteur.newPage();
    await public_.goto("/");
    await expect(public_.locator("body")).not.toContainText(texte);

    await page.goto("/admin/contenus/bandeau");
    await expect(page.frameLocator('iframe[title="Aperçu ordinateur de /"]').locator("body")).toContainText(texte, { timeout: 30_000 });
    await expect(page.frameLocator('iframe[title="Aperçu mobile de /"]').locator("body")).toContainText(texte, { timeout: 30_000 });
    await verifierAccessibilite(page);

    const formulaire = page.locator("form", { has: page.locator(`input[value="${texte}"]`) });
    await formulaire.getByLabel("État").selectOption("publie");
    await formulaire.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.locator("main").getByRole("status")).toBeVisible();
    await expect.poll(async () => { await public_.goto("/"); return public_.locator("body").innerText(); }, { timeout: 60_000 }).toContain(texte);
    await visiteur.close();
  } finally {
    await requete("site", `DELETE FROM contenu WHERE type = 'bandeau' AND corps = $1`, [texte]);
  }
});

test("deux onglets sur le même message : le second est prévenu, rien n'est écrasé", async ({ page, context }) => {
  const texte = `Verrou F13 ${Date.now() % 100000}`;
  const autre = await context.newPage();
  try {
    await requete("site", `INSERT INTO contenu (id, type, titre, corps, etat, "modifieLe") VALUES ($1, 'bandeau', 'Message du bandeau', $2, 'preparation', now())`, [`f13-${Date.now()}`, texte]);
    await connecterNavigateur(context, COMPTES.admin);
    await page.goto("/admin/contenus/bandeau");
    await autre.goto("/admin/contenus/bandeau");
    const f1 = page.locator("form", { has: page.locator(`input[value="${texte}"]`) });
    await f1.getByLabel("Texte (140 caractères au plus)").fill(`${texte} (A)`);
    await f1.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.locator("main").getByRole("status")).toBeVisible();
    const f2 = autre.locator("form", { has: autre.locator(`input[value="${texte}"]`) });
    await f2.getByLabel("Texte (140 caractères au plus)").fill(`${texte} (B)`);
    await f2.getByRole("button", { name: "Enregistrer" }).click();
    await expect(autre.locator("main").getByRole("alert")).toContainText("depuis que vous l'avez ouvert");
    const [c] = await requete<{ corps: string }>("site", `SELECT corps FROM contenu WHERE corps LIKE $1`, [`${texte}%`]);
    expect(c!.corps).toBe(`${texte} (A)`);
  } finally {
    await autre.close();
    await requete("site", `DELETE FROM contenu WHERE type = 'bandeau' AND corps LIKE $1`, [`${texte}%`]);
  }
});

test("texte de la page Assistance : brouillon, aperçu, publication, retour à l'origine", async ({ page, context }) => {
  await requete("site", `DELETE FROM contenu WHERE type = 'page' AND cle = 'assistance'`);
  await connecterNavigateur(context, COMPTES.admin);
  try {
    await page.goto("/admin/contenus/pages/assistance");
    const zone = page.getByLabel("Texte de la page");
    const origine = await zone.inputValue();
    const titreOrigine = origine.split("\n")[0]!.replace(/^#\s+/, "");
    await zone.fill(origine.replace(/^# .*/, "# Assistance et SAV (essai F13)"));
    await page.getByRole("button", { name: "Enregistrer le brouillon" }).click();
    await expect(page.locator("main").getByRole("status")).toContainText("Brouillon enregistré");
    await expect(page.frameLocator('iframe[title="Aperçu ordinateur de /services/assistance"]').locator("h1")).toContainText("(essai F13)", { timeout: 30_000 });

    const visiteur = await context.browser()!.newContext({ baseURL: test.info().project.use.baseURL, storageState: "playwright/.auth/acces-demo.json" });
    const public_ = await visiteur.newPage();
    await public_.goto("/services/assistance");
    await expect(public_.locator("main h1")).toHaveText(titreOrigine);

    await page.getByRole("button", { name: "Publier" }).click();
    await expect(page.locator("main").getByRole("status")).toContainText("Texte publié", { timeout: 20_000 });
    await public_.goto("/services/assistance");
    await expect(public_.locator("main h1")).toContainText("(essai F13)");

    await page.getByRole("button", { name: "Revenir au texte d’origine" }).click();
    await expect(page.locator("main").getByRole("status")).toContainText("Texte d’origine rétabli", { timeout: 20_000 });
    await public_.goto("/services/assistance");
    await expect(public_.locator("main h1")).toHaveText(titreOrigine);
    await visiteur.close();
  } finally {
    await requete("site", `DELETE FROM contenu WHERE type = 'page' AND cle = 'assistance'`);
  }
});

test("vignette : une image sans texte de remplacement est refusée", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  await page.goto("/admin/contenus/carrousel");
  await page.locator("#titre-nouvelle").fill("Essai image F13");
  await page.locator("#phrase-nouvelle").fill("Phrase d'essai.");
  await page.locator("#image-nouvelle").setInputFiles({ name: "image.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: "Créer la vignette" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("texte de remplacement est obligatoire");
  expect(await requete("site", `SELECT id FROM contenu WHERE titre = 'Essai image F13'`)).toHaveLength(0);
});
