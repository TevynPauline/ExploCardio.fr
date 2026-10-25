import { expect, test, type Page } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { requete } from "../bases";
import { COMPTES, connecterNavigateur } from "../session";

// T012 — Contenus → Carrousel (F16, US3, FR-012, FR-013, SC-003) : préparation et aperçu,
// publication visible en moins d'une minute, période, ordre, retrait, règles de saisie, verrou,
// droits, journal.

test.describe.configure({ timeout: 240_000, mode: "serial" });

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
const PREFIXE = "Vignette F16";

test.beforeEach(async () => {
  await requete("site", `DELETE FROM contenu WHERE type = 'vignette' AND titre LIKE $1`, [`${PREFIXE}%`]);
});
test.afterAll(async () => {
  await requete("site", `DELETE FROM contenu WHERE type = 'vignette' AND titre LIKE $1`, [`${PREFIXE}%`]);
});

const formulaire = (page: Page, titre: string) => page.locator("form", { has: page.locator(`input[name=titre][value="${titre}"]`) });

async function creer(page: Page, champs: { titre: string; phrase?: string; libelle?: string; lien?: string; etat?: string; debut?: string }) {
  await page.goto("/admin/contenus/carrousel");
  await page.locator("#titre-nouvelle").fill(champs.titre);
  await page.locator("#phrase-nouvelle").fill(champs.phrase ?? "Phrase d'essai.");
  if (champs.libelle !== undefined) await page.locator("#libelle-nouvelle").fill(champs.libelle);
  if (champs.lien !== undefined) await page.locator("#lien-nouvelle").fill(champs.lien);
  if (champs.debut) await page.locator("#debut-nouvelle").fill(champs.debut);
  await page.locator("#etat-nouvelle").selectOption(champs.etat ?? "preparation");
  await page.getByRole("button", { name: "Créer la vignette" }).click();
  // Premier enregistrement : l'action peut être compilée à la volée par le serveur de développement.
  await expect(page.locator("main").getByRole("status").or(page.locator("main").getByRole("alert"))).toBeVisible({ timeout: 20_000 });
}

async function surLAccueil(page: Page, texte: string) {
  const visiteur = await page.context().browser()!.newContext({ baseURL: test.info().project.use.baseURL, storageState: "playwright/.auth/acces-demo.json" });
  const p = await visiteur.newPage();
  await p.goto("/");
  const n = await p.getByRole("region", { name: "À la une" }).getByText(texte).count();
  await visiteur.close();
  return n > 0;
}

test("préparation → aperçu seulement → publication visible en moins d'une minute → retrait", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  const titre = `${PREFIXE} ${Date.now() % 100000}`;
  await creer(page, { titre, libelle: "Voir l'offre", lien: "/accessoires-consommables" });
  await expect(page.locator("main").getByRole("status")).toContainText("Vignette enregistrée");
  await verifierAccessibilite(page);
  expect(await surLAccueil(page, titre)).toBe(false);
  await expect(page.frameLocator('iframe[title="Aperçu ordinateur de /"]').getByText(titre)).toHaveCount(1, { timeout: 30_000 });

  await formulaire(page, titre).getByLabel("État").selectOption("publie");
  await formulaire(page, titre).getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.locator("main").getByRole("status")).toContainText("Vignette enregistrée");
  await expect.poll(() => surLAccueil(page, titre), { timeout: 60_000 }).toBe(true);

  // Ordre : la vignette créée en dernier remonte d'un cran.
  await page.getByRole("button", { name: `Monter « ${titre} »` }).click();
  await expect(page.locator("main").getByRole("status")).toContainText("Ordre du carrousel");
  const [ligne] = await requete<{ action: string }>("site", `SELECT action FROM journal_action WHERE action = 'contenus.vignette.deplacee' ORDER BY date DESC LIMIT 1`);
  expect(ligne?.action).toBe("contenus.vignette.deplacee");

  await formulaire(page, titre).getByLabel("État").selectOption("retire");
  await formulaire(page, titre).getByRole("button", { name: "Enregistrer" }).click();
  await expect.poll(() => surLAccueil(page, titre), { timeout: 60_000 }).toBe(false);
});

test("vignette programmée pour demain : invisible aujourd'hui", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  const titre = `${PREFIXE} demain ${Date.now() % 100000}`;
  const demain = new Date(Date.now() + 86_400_000).toISOString().slice(0, 16);
  await creer(page, { titre, etat: "publie", debut: demain });
  await expect(page.locator("main").getByRole("status")).toContainText("Vignette enregistrée");
  expect(await surLAccueil(page, titre)).toBe(false);
});

test("règles de saisie : image sans texte de remplacement, textes trop longs, lien inconnu, bouton incomplet", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  const alerte = page.locator("main").getByRole("alert");
  await page.goto("/admin/contenus/carrousel");
  await page.locator("#titre-nouvelle").fill(`${PREFIXE} image`);
  await page.locator("#phrase-nouvelle").fill("Phrase.");
  await page.locator("#image-nouvelle").setInputFiles({ name: "image.png", mimeType: "image/png", buffer: PNG });
  await page.getByRole("button", { name: "Créer la vignette" }).click();
  await expect(alerte).toContainText("texte de remplacement est obligatoire");

  await page.locator("#titre-nouvelle").evaluate((el) => el.removeAttribute("maxlength"));
  await page.locator("#titre-nouvelle").fill(`${PREFIXE} ${"x".repeat(60)}`);
  await page.locator("#phrase-nouvelle").fill("Phrase.");
  await page.getByRole("button", { name: "Créer la vignette" }).click();
  await expect(alerte).toContainText("Titre : 60 caractères au plus");

  await creer(page, { titre: `${PREFIXE} lien`, libelle: "Voir", lien: "/page-inconnue" });
  await expect(alerte).toContainText("n'existe pas");
  await creer(page, { titre: `${PREFIXE} bouton`, libelle: "Voir" });
  await expect(alerte).toContainText("Bouton : indiquez à la fois son texte et son lien");
  await creer(page, { titre: `${PREFIXE} fiche`, libelle: "Voir", lien: "/holter-ecg/dms-300-4l" });
  await expect(page.locator("main").getByRole("status")).toContainText("Vignette enregistrée");
});

test("deux onglets sur la même vignette : le second est prévenu", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  const titre = `${PREFIXE} verrou ${Date.now() % 100000}`;
  await creer(page, { titre });
  const autre = await context.newPage();
  await page.goto("/admin/contenus/carrousel");
  await autre.goto("/admin/contenus/carrousel");
  await formulaire(page, titre).getByLabel("Phrase (140 caractères au plus)").fill("Version A.");
  await formulaire(page, titre).getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.locator("main").getByRole("status")).toContainText("Vignette enregistrée");
  await formulaire(autre, titre).getByLabel("Phrase (140 caractères au plus)").fill("Version B.");
  await formulaire(autre, titre).getByRole("button", { name: "Enregistrer" }).click();
  await expect(autre.locator("main").getByRole("alert")).toContainText("depuis que vous l'avez ouvert", { timeout: 20_000 });
  await autre.close();
});

test("droits : support refusé", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.support);
  await page.goto("/admin/contenus/carrousel");
  await expect(page).toHaveURL(/\/admin\?acces=refuse/);
});

test("droits : commercial autorisé", async ({ page, context }) => {
  await requete("site", `UPDATE utilisateur SET role = 'commercial' WHERE email = $1`, [COMPTES.support]);
  try {
    await connecterNavigateur(context, COMPTES.support);
    await page.goto("/admin/contenus/carrousel");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Carrousel de l’accueil");
  } finally {
    await requete("site", `UPDATE utilisateur SET role = 'support' WHERE email = $1`, [COMPTES.support]);
  }
});
