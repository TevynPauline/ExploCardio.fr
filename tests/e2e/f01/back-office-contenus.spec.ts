import { expect, test, type Page } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { COMPTES, connecterNavigateur } from "../session";
import { requete } from "./outils";

// T059 (US6, SC-003, FR-036, FR-037).

test.describe.configure({ mode: "serial" });

async function visibleSurLeSite(page: Page, chemin: string, texte: string) {
  const debut = Date.now();
  await expect
    .poll(async () => {
      await page.goto(chemin);
      return page.getByText(texte).count();
    }, { timeout: 60_000, intervals: [1_000, 2_000, 5_000] })
    .toBeGreaterThan(0);
  expect(Date.now() - debut).toBeLessThan(60_000);
}

test("modifier une tuile : visible sur l'accueil en moins d'une minute, journalisé", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  await page.goto("/admin/contenus/tuiles");
  await verifierAccessibilite(page);
  const [tuile] = await requete<{ id: string; corps: string }>("site", `SELECT id, corps FROM contenu WHERE type = 'tuile' ORDER BY ordre LIMIT 1`);
  // Texte d'origine, même si un essai interrompu a laissé une phrase de test.
  const origine = tuile!.corps.startsWith("Phrase modifiée") ? "Enregistreurs et analyse, à l'achat ou au mois." : tuile!.corps;
  const phrase = `Phrase modifiée ${Date.now() % 100000}`;
  try {
    await page.locator(`#phrase-${tuile!.id}`).fill(phrase);
    await page.getByRole("button", { name: /Enregistrer la tuile Holter ECG/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "Tuile enregistrée" })).toBeVisible();
    await visibleSurLeSite(page, "/", phrase);
    expect(await requete("site", `SELECT 1 FROM journal_action WHERE action = 'contenus.tuile.modifiee' AND objet = $1`, [tuile!.id])).not.toHaveLength(0);
  } finally {
    await requete("site", `UPDATE contenu SET corps = $2 WHERE id = $1`, [tuile!.id, origine]);
  }
});

test("un lien de tuile vers une page inexistante est refusé avec l'explication", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  await page.goto("/admin/contenus/tuiles");
  const [tuile] = await requete<{ id: string }>("site", `SELECT id FROM contenu WHERE type = 'tuile' ORDER BY ordre LIMIT 1`);
  await page.locator(`#lien-${tuile!.id}`).fill("/promotions");
  await page.getByRole("button", { name: /Enregistrer la tuile Holter ECG/ }).click();
  await expect(page.getByRole("alert").filter({ hasText: "n'existe pas" })).toBeVisible();
});

test("ajouter un message au bandeau puis le désactiver", async ({ page, context }) => {
  // Messages laissés par un essai interrompu : ils passeraient avant dans la rotation.
  await requete("site", `DELETE FROM contenu WHERE type = 'bandeau' AND corps LIKE 'Promotion admin %'`);
  await connecterNavigateur(context, COMPTES.admin);
  await page.goto("/admin/contenus/bandeau");
  const texte = `Promotion admin ${Date.now() % 100000}`;
  await page.locator("#texte-nouveau").fill(texte);
  await page.getByRole("button", { name: "Ajouter le message" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Message enregistré" })).toBeVisible();
  await visibleSurLeSite(page, "/", texte);
  await requete("site", `DELETE FROM contenu WHERE type = 'bandeau' AND corps = $1`, [texte]);
});

// F16 : les actualités de l'accueil sont remplacées par le carrousel de vignettes.
test("publier une vignette du carrousel ; une image sans texte de remplacement est refusée", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  await page.goto("/admin/contenus/carrousel");
  const titre = `Vignette admin ${Date.now() % 100000}`;
  await page.locator("#titre-nouvelle").fill(titre);
  await page.locator("#phrase-nouvelle").fill("Phrase de la vignette.");
  await page.locator("#image-nouvelle").setInputFiles({
    name: "image.png",
    mimeType: "image/png",
    buffer: Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex"),
  });
  await page.getByRole("button", { name: "Créer la vignette" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "texte de remplacement est obligatoire" })).toBeVisible();
  try {
    await page.locator("#titre-nouvelle").fill(titre);
    await page.locator("#phrase-nouvelle").fill("Phrase de la vignette.");
    await page.locator("#etat-nouvelle").selectOption("publie");
    await page.getByRole("button", { name: "Créer la vignette" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Vignette enregistrée" })).toBeVisible();
    await visibleSurLeSite(page, "/", titre);
  } finally {
    await requete("site", `DELETE FROM contenu WHERE type = 'vignette' AND titre = $1`, [titre]);
  }
});

test("renseigner puis vider le téléphone : la ligne apparaît puis disparaît", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  await page.goto("/admin/contenus/coordonnees");
  await verifierAccessibilite(page);
  await page.getByLabel("Téléphone").fill("+33 6 99 00 00 01");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByRole("status").filter({ hasText: "enregistrés" })).toBeVisible();
  await visibleSurLeSite(page, "/", "+33 6 99 00 00 01");
  await page.goto("/admin/contenus/coordonnees");
  await page.getByLabel("Téléphone").fill("");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect
    .poll(async () => {
      await page.goto("/");
      return page.locator("[data-section=contact] dt").count();
    }, { timeout: 60_000, intervals: [2_000] })
    .toBe(0);
});

test("produit phare : une référence inconnue est refusée, une référence connue apparaît dans le menu", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  await page.goto("/admin/contenus/menus");
  await page.locator("#ref-holter_tensionnel").fill("EC-INCONNUE");
  await page.locator("form", { has: page.locator("#ref-holter_tensionnel") }).getByRole("button", { name: "Ajouter le produit" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Référence inconnue" })).toBeVisible();
  await page.locator("#ref-holter_tensionnel").fill("EC-SUN-OSCAR2");
  await page.locator("form", { has: page.locator("#ref-holter_tensionnel") }).getByRole("button", { name: "Ajouter le produit" }).click();
  await expect(page.getByRole("status").filter({ hasText: "ajouté au menu" })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("button", { name: "Holter tensionnel" }).click();
  await expect(page.locator("#megamenu-holter_tensionnel").getByRole("link", { name: /Oscar 2/ })).toBeVisible();
  await requete("site", `DELETE FROM element_menu WHERE "defaultCode" = 'EC-SUN-OSCAR2'`);
});

test("le support n'a pas accès aux contenus", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.support);
  await page.goto("/admin/contenus/tuiles");
  await expect(page).toHaveURL(/\/admin\?acces=refuse/);
});
