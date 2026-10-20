import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { COMPTES, connecterNavigateur } from "../session";
import { requete } from "../bases";

// T012 (US3, FR-011 à FR-015, SC-004) : centre d'aide classé et recherchable, FAQ, mode d'emploi
// pas à pas, notices des produits, vidéo sous-titrée avec transcription, « Besoin d'aide ? »,
// aide d'un modèle sur sa fiche, recherche du site.

test.describe.configure({ timeout: 240_000, mode: "serial" });

test("centre d'aide : thèmes, appareils, recherche, FAQ, mode d'emploi, notices", async ({ page }) => {
  await page.goto("/aide");
  await verifierAccessibilite(page);
  await expect(page.getByRole("navigation", { name: "Thèmes de l’aide" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Les questions les plus consultées" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Notices des appareils" })).toBeVisible();

  const question = page.locator("details").filter({ hasText: "Comment retourner un appareil loué ?" });
  const avant = (await requete<{ n: number }>("site", `SELECT consultations AS n FROM contenu_aide WHERE slug = 'retour-appareil-loue'`))[0]!.n;
  await question.locator("summary").click();
  await expect(question).toContainText("étiquette de retour");
  await expect.poll(async () => (await requete<{ n: number }>("site", `SELECT consultations AS n FROM contenu_aide WHERE slug = 'retour-appareil-loue'`))[0]!.n).toBeGreaterThanOrEqual(avant);

  await page.getByRole("navigation", { name: "Thèmes de l’aide" }).getByRole("link", { name: "Enregistrement" }).click();
  await expect(page.locator("main")).toContainText("Poser un enregistreur Holter DMS 300-4L");
  await page.getByRole("link", { name: "Poser un enregistreur Holter DMS 300-4L" }).click();
  const etapes = page.locator("main ol > li");
  await expect(etapes).toHaveCount(3);
  await expect(etapes.first().getByRole("img")).toHaveAttribute("alt", /.+/);
  await expect(page.locator("main").getByRole("region", { name: "Contacter l’équipe" })).toContainText("Besoin d’aide ? Écrivez-nous ou appelez-nous sur WhatsApp.");
  await verifierAccessibilite(page);

  await page.goto("/aide?q=electrodes%20interrompu%20zzz");
  await expect(page.locator("main").getByRole("status")).toContainText("Écrivez-nous ou appelez-nous sur WhatsApp");
});

test("fiche du Holter : « Aide pour ce modèle » ; recherche du site : groupes d'aide", async ({ page }) => {
  await page.goto("/holter-ecg/dms-300-4l");
  const aide = page.getByRole("region", { name: "Aide pour ce modèle" }).or(page.locator("section").filter({ has: page.getByRole("heading", { name: "Aide pour ce modèle" }) }));
  await expect(aide.first()).toContainText("Poser un enregistreur Holter DMS 300-4L");
  await page.goto("/recherche?q=retourner%20appareil");
  await expect(page.locator("main")).toContainText(/Questions fréquentes|Tutoriels/);
});

test("vidéo publiée : piste de sous-titres et transcription ; publication refusée sans sous-titres", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  const titre = `Vidéo d'essai ${Date.now() % 100000}`;
  await page.goto("/admin/contenus/aide/nouveau");
  await page.getByLabel("Type").selectOption("video");
  await page.getByLabel("Titre (ou question pour la FAQ)").fill(titre);
  await page.getByLabel("Résumé").fill("Vidéo d'essai du test automatique.");
  await page.getByLabel("Fichier vidéo (MP4)").setInputFiles({ name: "essai.mp4", mimeType: "video/mp4", buffer: Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypisom"), Buffer.alloc(64)]) });
  await page.getByLabel("Transcription").fill("Bonjour, voici la transcription de la vidéo d'essai.");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.locator("main").getByRole("status")).toContainText("Contenu enregistré");
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(page.locator("main").getByRole("alert")).toContainText("sous-titres");

  await page.getByLabel("Sous-titres (WebVTT, .vtt)").setInputFiles({ name: "essai.vtt", mimeType: "text/vtt", buffer: Buffer.from("WEBVTT\n\n00:00.000 --> 00:02.000\nBonjour\n") });
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.locator("main").getByRole("status")).toContainText("Contenu enregistré");
  await page.getByRole("button", { name: "Publier" }).click();
  await expect(page.locator("main").getByRole("status")).toContainText("Contenu publié");
  const [c] = await requete<{ id: string; slug: string }>("site", `SELECT id, slug FROM contenu_aide WHERE titre = $1`, [titre]);
  try {
    await page.goto(`/aide/${c!.slug}`);
    await expect(page.locator("video track[kind='captions']")).toHaveCount(1);
    await page.getByText("Transcription de la vidéo", { exact: true }).click();
    await expect(page.locator("main")).toContainText("voici la transcription");
  } finally {
    await requete("site", `DELETE FROM contenu_aide WHERE id = $1`, [c!.id]);
  }
});
