import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { requete } from "../bases";
import { COMPTES, connecterNavigateur } from "../session";
import { blocsAccueil, organiser, ORGANISATION_DEPART } from "./outils";

// T020 — organisation de l'accueil au back-office (F23, US3 ; FR-012, FR-014 à FR-019, SC-003, SC-006).
// Chaque test remet l'ordre de départ par le formulaire (qui vide aussi le cache de l'accueil).

test.describe.configure({ mode: "serial", timeout: 240_000 });

test.beforeEach(async ({ context }) => {
  await connecterNavigateur(context, COMPTES.admin);
});

test.afterEach(async ({ page }) => {
  await organiser(page, ORGANISATION_DEPART);
});

test("carrousel en tête et offre digitale réaffichée : l'accueil suit, un seul titre principal", async ({ page }) => {
  await page.goto("/admin/contenus");
  await page.getByRole("link", { name: /Organisation de l.accueil/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Organisation de l’accueil");
  await expect(page.locator("li[data-bloc]")).toHaveCount(5);
  await expect(page.locator('li[data-bloc="animation"]').getByRole("button", { name: /^Monter/ })).toBeDisabled();
  await verifierAccessibilite(page);

  await organiser(page, [
    { bloc: "offres", affiche: true },
    { bloc: "animation", affiche: true },
    { bloc: "gammes", affiche: true },
    { bloc: "offre-digitale", affiche: true },
    { bloc: "pourquoi", affiche: true },
  ]);
  const [journal] = await requete<{ n: number }>("site", `SELECT count(*)::int n FROM journal_action WHERE action = 'contenus.accueil.organisee'`);
  expect(journal!.n).toBeGreaterThan(0);

  await page.goto("/");
  expect(await blocsAccueil(page)).toEqual(["carrousel", "trois-temps", "acces-rapide", "offre-digitale", "pourquoi-choisir"]);
  // Animation plus en tête : titre principal de remplacement, phrase visible en simple paragraphe (FR-012).
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Une offre pensée pour la cardiologie libérale");
  await expect(page.locator("[data-section=trois-temps] #titre-trois-temps")).toHaveJSProperty("tagName", "P");
  // Lecture différée jusqu'à l'entrée à l'écran (FR-019) ; « Voir l'offre » mène au bloc suivant (FR-018).
  const scene = page.locator("[data-section=trois-temps]");
  await expect(scene).toHaveAttribute("data-differee", "");
  await expect(scene.getByRole("link", { name: "Voir l’offre" })).toHaveAttribute("href", "#acces-rapide");
  await scene.scrollIntoViewIfNeeded();
  await expect(scene).toHaveAttribute("data-vue", "");
  // Le lien du bandeau mène toujours au carrousel, désormais en tête.
  const lien = page.getByRole("link", { name: "Nos offres du moment" });
  if (await lien.count()) await expect(lien).toHaveAttribute("href", "/#offres-du-moment");
  await expect(page.locator("[data-section=offre-digitale]")).toBeVisible();
  // Contrôle en haut de page : défilée, l'en-tête fixe recouvre une partie des boutons.
  await page.evaluate(() => window.scrollTo(0, 0));
  await verifierAccessibilite(page);
});

test("animation et carrousel masqués : titre de remplacement, lien du bandeau retiré (FR-004, FR-012)", async ({ page }) => {
  await organiser(page, [
    { bloc: "animation", affiche: false },
    { bloc: "gammes", affiche: true },
    { bloc: "pourquoi", affiche: true },
    { bloc: "offre-digitale", affiche: false },
    { bloc: "offres", affiche: false },
  ]);
  await page.goto("/");
  expect(await blocsAccueil(page)).toEqual(["acces-rapide", "pourquoi-choisir"]);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Une offre pensée pour la cardiologie libérale");
  await expect(page.getByRole("link", { name: "Nos offres du moment" })).toHaveCount(0);
});

test("aucun bloc affiché : enregistrement refusé, l'accueil ne change pas (FR-015, SC-006)", async ({ page }) => {
  await organiser(
    page,
    ORGANISATION_DEPART.map((p) => ({ ...p, affiche: false })),
    null,
  );
  await expect(page.getByRole("alert").filter({ hasText: "Gardez au moins un bloc affiché sur l’accueil." }).first()).toBeVisible({ timeout: 30_000 });
  await page.goto("/");
  expect(await blocsAccueil(page)).toEqual(["trois-temps", "acces-rapide", "pourquoi-choisir", "carrousel"]);
});

test("clavier : le focus reste sur le bloc déplacé et sa position est annoncée (FR-017)", async ({ page }) => {
  await page.goto("/admin/contenus/organisation");
  const monter = page.locator('li[data-bloc="offres"]').getByRole("button", { name: /^Monter/ });
  await monter.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("li[data-bloc]").nth(3)).toHaveAttribute("data-bloc", "offres");
  await expect(page.locator('li[data-bloc="offres"]').getByRole("button", { name: /^Monter/ })).toBeFocused();
  await expect(page.locator("form [role=status]")).toHaveText("Nos offres du moment (carrousel) : position 4 sur 5.");
});

test("modification concurrente : la seconde est prévenue, rien n'est écrasé (FR-016)", async ({ page, context }) => {
  await page.goto("/admin/contenus/organisation");
  const autre = await context.newPage();
  await organiser(autre, [
    { bloc: "gammes", affiche: true },
    { bloc: "animation", affiche: true },
    { bloc: "pourquoi", affiche: true },
    { bloc: "offre-digitale", affiche: false },
    { bloc: "offres", affiche: true },
  ]);
  await page.locator('li[data-bloc="offre-digitale"]').getByLabel("Affiché sur l’accueil").check();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText(/L’organisation a été modifiée.*rien n'a été écrasé/)).toBeVisible({ timeout: 30_000 });
  const [p] = await requete<{ valeur: string }>("site", `SELECT valeur FROM parametre WHERE cle = 'accueil.organisation'`);
  expect(JSON.parse(p!.valeur)[0].bloc).toBe("gammes");
  await autre.close();
});
