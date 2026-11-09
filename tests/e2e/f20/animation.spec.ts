import { expect, test, type Page } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { defileHorizontalement } from "../f16/outils";

// T014 — animation « Les trois temps » (F20, US1, US2 ; FR-001 à FR-014, SC-001 à SC-004).
// Les instants de la séquence sont atteints en avançant les animations de la scène.

const ARGUMENTS = [
  "Achetez, louez ou financez",
  "Dépannage express",
  "Des interlocuteurs experts",
  "L'assistance sans contrat",
  "Une fidélité récompensée",
];
const MOTS = ["Liberté", "Expertise", "Fidélité"];

const titresArguments = (page: Page) => scene(page).locator(".tt-arguments li");
const titresSousBulles = (page: Page) => scene(page).locator("[class*=tt-titre-]");

const scene = (page: Page) => page.locator("[data-section=trois-temps]");

/** Fige toutes les animations de la scène à l'instant `t` (secondes depuis le début de la séquence). */
async function figer(page: Page, t: number) {
  await page.evaluate((t) => {
    for (const a of document.querySelector("[data-section=trois-temps]")!.getAnimations({ subtree: true })) {
      a.pause();
      a.currentTime = t * 1000;
    }
  }, t);
}

/** Avance toutes les animations de la scène juste avant leur fin : elles se terminent seules. */
async function allerALaFin(page: Page) {
  await page.evaluate(() => {
    for (const a of document.querySelector("[data-section=trois-temps]")!.getAnimations({ subtree: true })) {
      const fin = a.effect?.getComputedTiming().endTime;
      if (typeof fin === "number" && Number.isFinite(fin)) a.currentTime = fin - 200;
    }
  });
}

const opacite = (page: Page, selecteur: string) => scene(page).locator(selecteur).first().evaluate((e) => Number(getComputedStyle(e).opacity));

test("la séquence : trois disques de même diamètre portant les trois mots, puis logo et phrase d'accroche", async ({ page }) => {
  await page.goto("/");
  // Pendant les mots : trois disques de même diamètre, trois mots affichés, même taille de police (SC-003).
  await figer(page, 5.5);
  const largeurs = await scene(page).locator("[class*=tt-point-]").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)));
  expect(largeurs).toHaveLength(3);
  expect(new Set(largeurs).size, largeurs.join(", ")).toBe(1);
  const mots = scene(page).locator("[class*=tt-mot-]");
  await expect(mots).toHaveText(MOTS);
  for (const i of [0, 1, 2]) expect(await mots.nth(i).locator("span").evaluate((e) => Number(getComputedStyle(e).opacity))).toBeGreaterThan(0.99);
  const tailles = await mots.evaluateAll((els) => els.map((e) => getComputedStyle(e).fontSize));
  expect(new Set(tailles).size).toBe(1);
  expect(await opacite(page, "h1")).toBe(0);
  // Titres des arguments sous leur disque, tous affichés avant que les mots ne s'effacent (FR-022).
  await figer(page, 6.8);
  await expect(titresSousBulles(page)).toHaveText(ARGUMENTS);
  for (const i of [0, 1, 2, 3, 4]) expect(await titresSousBulles(page).nth(i).locator("span").evaluate((e) => Number(getComputedStyle(e).opacity))).toBeGreaterThan(0.99);

  // Image finale : logo officiel, phrase d'accroche en grand, lien vers les six cartes (FR-004 à FR-007).
  await figer(page, 10.9);
  expect(await opacite(page, "img")).toBe(1);
  expect(await opacite(page, "h1")).toBe(1);
  expect(await opacite(page, "[class*=tt-point-]")).toBe(0);
  const titre = scene(page).getByRole("heading", { level: 1 });
  await expect(titre).toHaveText("Une offre pensée pour la cardiologie libérale");
  const hauteurLogo = (await scene(page).getByRole("img", { name: "ExploCardio.fr" }).boundingBox())!.height;
  const taille = await titre.evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  expect(taille).toBeGreaterThanOrEqual(36);
  expect(taille).toBeGreaterThan(hauteurLogo / 2);
  // Arguments commerciaux et bouton « Voir l'offre » (FR-022).
  await expect(titresArguments(page)).toHaveText(ARGUMENTS);
  for (const i of [0, 4]) expect(await opacite(page, `.tt-arguments li:nth-child(${i + 1})`)).toBe(1);
  const lien = scene(page).getByRole("link", { name: "Voir l’offre" });
  await expect(lien).toHaveAttribute("href", "#acces-rapide");
  await lien.click();
  await expect(page.locator("[data-section=acces-rapide]")).toBeInViewport();
});

test("SC-001 : à 1 280 × 800, la phrase d'accroche est lisible et le haut des six cartes visible", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await figer(page, 10.9);
  await expect(scene(page).getByRole("heading", { level: 1 })).toBeInViewport({ ratio: 1 });
  await expect(page.locator("[data-section=acces-rapide] h2")).toBeInViewport();
  const hauteur = (await scene(page).boundingBox())!.height;
  expect(hauteur).toBeLessThanOrEqual(800 * 0.65);
});

test("Pause et Lecture ; arrêt après une lecture, puis bandeau et « Revoir » (FR-009, FR-010)", async ({ page }) => {
  await page.goto("/");
  const bouton = scene(page).getByRole("button");
  await expect(bouton).toHaveText("Pause");
  await bouton.click();
  await expect(bouton).toHaveText("Lecture");
  const etats = () => scene(page).evaluate((s) => [...new Set(s.getAnimations({ subtree: true }).map((a) => a.playState))]);
  expect(await etats()).toEqual(["paused"]);
  await bouton.click();
  await expect(bouton).toHaveText("Pause");
  expect(await etats()).toContain("running");

  // Fin de la lecture : l'animation se termine seule et laisse un bandeau compact (FR-021).
  const hauteurAnimation = (await scene(page).boundingBox())!.height;
  await allerALaFin(page);
  await expect(bouton).toHaveText("Revoir");
  await expect(scene(page)).toHaveAttribute("data-compact", "");
  await expect.poll(async () => (await scene(page).boundingBox())!.height).toBeLessThanOrEqual(hauteurAnimation - 100);
  const hauteurBandeau = (await scene(page).boundingBox())!.height;
  await expect(scene(page).getByRole("heading", { level: 1 })).toBeVisible();
  await expect.poll(() => opacite(page, "h1")).toBe(1);
  await expect(scene(page).getByRole("img", { name: "ExploCardio.fr" })).toBeHidden();
  await expect(scene(page).getByRole("link", { name: "Voir l’offre" })).toBeHidden();
  await expect(titresArguments(page)).toHaveText(ARGUMENTS);
  await expect(page.locator("[data-section=acces-rapide] h2")).toBeInViewport();
  // Fondu d'apparition du bandeau terminé avant le contrôle des contrastes.
  await expect.poll(() => scene(page).evaluate((s) => s.getAnimations({ subtree: true }).filter((a) => a.playState === "running").length)).toBe(0);
  await verifierAccessibilite(page);
  await bouton.click();
  await expect(bouton).toHaveText("Pause");
  await expect(scene(page)).not.toHaveAttribute("data-compact");
  expect((await scene(page).boundingBox())!.height).toBe(hauteurAnimation);
  expect(hauteurAnimation).toBeGreaterThan(hauteurBandeau);
  expect(await opacite(page, "h1")).toBeLessThan(1);
});

test("page déjà défilée : la réduction en bandeau ne déplace pas ce que lit le visiteur (FR-021)", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => window.scrollTo(0, 900));
  const cartes = page.locator("[data-section=acces-rapide]");
  const avant = (await cartes.boundingBox())!.y;
  await allerALaFin(page);
  await expect(scene(page)).toHaveAttribute("data-compact", "");
  await expect.poll(async () => Math.abs((await cartes.boundingBox())!.y - avant)).toBeLessThanOrEqual(2);
});

test("onglet en arrière-plan : l'animation se met en pause", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "hidden", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(scene(page)).toHaveAttribute("data-pause", "");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(scene(page)).not.toHaveAttribute("data-pause");
});

test("mouvement réduit : bandeau compact et trois mots, sans forme animée ni bouton (FR-011)", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(scene(page).getByRole("heading", { level: 1 })).toBeVisible();
  await expect(scene(page).locator(".tt-mots-fixes")).toBeVisible();
  await expect(scene(page).locator(".tt-mots-fixes li")).toHaveText(MOTS);
  await expect(scene(page).locator(".tt-anime")).toBeHidden();
  await expect(scene(page).getByRole("button")).toBeHidden();
  await expect(scene(page).getByRole("img", { name: "ExploCardio.fr" })).toBeHidden();
  await expect(titresArguments(page)).toHaveText(ARGUMENTS);
  expect((await scene(page).boundingBox())!.height).toBeLessThanOrEqual(420);
  await expect.poll(() => opacite(page, "h1")).toBe(1);
  await verifierAccessibilite(page);
});

test("lecteurs d'écran, accessibilité et largeurs d'écran (FR-013, FR-014, SC-004)", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(scene(page).locator(".tt-anime")).toHaveAttribute("aria-hidden", "true");
  await expect(scene(page).locator(".tt-mots-fixes")).toHaveAttribute("aria-hidden", "true");
  await expect(scene(page).locator(".sr-only")).toHaveText("Liberté, Expertise, Fidélité.");
  for (const nom of ["Pause", "Voir l’offre"]) {
    const cible = (await scene(page).getByRole(nom === "Pause" ? "button" : "link", { name: nom }).boundingBox())!;
    expect(cible.height, nom).toBeGreaterThanOrEqual(44);
  }
  await figer(page, 10.9);
  await verifierAccessibilite(page);
  for (const largeur of [320, 390, 768, 1920]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto("/");
    await figer(page, 5.5);
    expect(await defileHorizontalement(page), `${largeur} px`).toBe(false);
  }
});
