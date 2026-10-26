import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { requete } from "../bases";
import { COMPTES, connecterNavigateur } from "../session";

// F16 (évolution du 2026-10-26) : image facultative dans les tuiles d'accès rapide (en haut,
// fondue vers le texte) et dans les vignettes du carrousel (légèrement transparente, sous le
// texte) ; design inchangé, texte de remplacement obligatoire.

test.describe.configure({ timeout: 240_000, mode: "serial" });

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

test("tuile : image ajoutée en haut, fondue, avec son texte de remplacement ; puis retirée", async ({ page, context }) => {
  const [tuile] = await requete<{ id: string; titre: string; images: unknown }>("site", `SELECT id, titre, images FROM contenu WHERE type = 'tuile' ORDER BY ordre LIMIT 1`);
  await connecterNavigateur(context, COMPTES.admin);
  try {
    await page.goto("/admin/contenus/tuiles");
    await page.locator(`#image-${tuile!.id}`).setInputFiles({ name: "holter.png", mimeType: "image/png", buffer: PNG });
    await page.getByRole("button", { name: `Enregistrer la tuile ${tuile!.titre}` }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("texte de remplacement est obligatoire");
    await page.locator(`#image-${tuile!.id}`).setInputFiles({ name: "holter.png", mimeType: "image/png", buffer: PNG });
    await page.locator(`#alt-${tuile!.id}`).fill("Enregistreur Holter posé sur un bureau");
    await page.getByRole("button", { name: `Enregistrer la tuile ${tuile!.titre}` }).click();
    await expect(page.locator("main").getByRole("status")).toContainText("Tuile enregistrée");

    const visiteur = await context.browser()!.newContext({ baseURL: test.info().project.use.baseURL, storageState: "playwright/.auth/acces-demo.json" });
    const accueil = await visiteur.newPage();
    await expect
      .poll(async () => {
        await accueil.goto("/");
        return accueil.locator("[data-tuile]").first().getByRole("img", { name: "Enregistreur Holter posé sur un bureau" }).count();
      }, { timeout: 60_000 })
      .toBe(1);
    const masque = await accueil.locator("[data-tuile]").first().locator("img").evaluate((img) => getComputedStyle(img.parentElement!).maskImage);
    expect(masque).toContain("linear-gradient");
    await expect(accueil.locator("[data-tuile]").first()).toContainText(tuile!.titre);
    await verifierAccessibilite(accueil);
    await visiteur.close();
  } finally {
    await requete("site", `UPDATE contenu SET images = $2 WHERE id = $1`, [tuile!.id, JSON.stringify(tuile!.images ?? [])]);
  }
});

test("vignette : image légèrement transparente sous le texte, texte foncé lisible", async ({ page, context }) => {
  const titre = `Vignette image F16 ${Date.now() % 100000}`;
  await connecterNavigateur(context, COMPTES.admin);
  try {
    await page.goto("/admin/contenus/carrousel");
    await page.locator("#titre-nouvelle").fill(titre);
    await page.locator("#phrase-nouvelle").fill("Une vignette avec une image.");
    await page.locator("#image-nouvelle").setInputFiles({ name: "offre.png", mimeType: "image/png", buffer: PNG });
    await page.locator("#alt-nouvelle").fill("Boîtes d'électrodes empilées");
    await page.locator("#etat-nouvelle").selectOption("publie");
    await page.getByRole("button", { name: "Créer la vignette" }).click();
    await expect(page.locator("main").getByRole("status")).toContainText("Vignette enregistrée", { timeout: 20_000 });
    await requete("site", `UPDATE contenu SET ordre = -1 WHERE type = 'vignette' AND titre = $1`, [titre]);
    // Ordre changé en base : le cache des contenus est rafraîchi par un enregistrement au back-office.
    await page.getByRole("button", { name: `Monter « ${titre} »` }).click().catch(() => undefined);

    const visiteur = await context.browser()!.newContext({ baseURL: test.info().project.use.baseURL, storageState: "playwright/.auth/acces-demo.json", reducedMotion: "reduce" });
    const accueil = await visiteur.newPage();
    await expect
      .poll(async () => {
        await accueil.goto("/");
        return accueil.getByRole("region", { name: "À la une" }).getByRole("img", { name: "Boîtes d'électrodes empilées" }).count();
      }, { timeout: 60_000 })
      .toBe(1);
    const img = accueil.getByRole("region", { name: "À la une" }).getByRole("img", { name: "Boîtes d'électrodes empilées" });
    expect(Number(await img.evaluate((e) => getComputedStyle(e).opacity))).toBeLessThan(0.5);
    const vignette = accueil.locator("[data-vignette]", { hasText: titre });
    const couleur = await vignette.getByRole("heading", { level: 2 }).evaluate((e) => getComputedStyle(e).color);
    // Texte foncé (encre), pas blanc : la somme des composantes reste loin du maximum.
    const composantes = (couleur.match(/\d+/g) ?? []).slice(0, 3).map(Number);
    expect(composantes.reduce((a, b) => a + b, 0)).toBeLessThan(400);
    await visiteur.close();
  } finally {
    await requete("site", `DELETE FROM contenu WHERE type = 'vignette' AND titre = $1`, [titre]);
  }
});
