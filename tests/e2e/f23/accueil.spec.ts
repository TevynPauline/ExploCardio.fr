import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { defileHorizontalement } from "../f16/outils";
import { blocsAccueil } from "./outils";

// T013 — accueil modulable, ordre de départ (F23, US1 ; FR-001 à FR-012, SC-002, SC-004, SC-005).

const TITRES_RAISONS = [
  "Une offre de produits et de services",
  "Achetez, louez, financez",
  "L’assistance sans contrat",
  "Une fidélité récompensée",
  "Dépannage express",
  "Des interlocuteurs experts",
];

test.describe.configure({ timeout: 180_000 });

test("ordre de départ : animation, gammes phares, Pourquoi choisir, offres du moment, contact", async ({ page }) => {
  await page.goto("/");
  expect(await blocsAccueil(page)).toEqual(["trois-temps", "acces-rapide", "pourquoi-choisir", "carrousel"]);
  await expect(page.locator("main [data-section]").last()).toHaveAttribute("data-section", "contact");
  await expect(page.locator("[data-section=offre-digitale]")).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.locator("[data-section=trois-temps] h1")).toHaveText("Une offre pensée pour la cardiologie libérale");
  await expect(page.locator("[data-section=trois-temps]")).not.toHaveAttribute("data-differee");
});

test("trois gammes phares, chacune à un clic de sa gamme (FR-006, SC-001)", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("[data-section=acces-rapide]");
  await expect(section.getByRole("heading", { level: 2 })).toHaveText("Nos gammes phares");
  const cartes = section.locator("[data-tuile]");
  await expect(cartes).toHaveCount(3);
  const liens = await cartes.evaluateAll((els) => els.map((e) => e.getAttribute("href")));
  expect(liens).toEqual(["/holter-ecg", "/holter-tensionnel", "/epreuve-effort"]);
  await cartes.first().click();
  await expect(page).toHaveURL(/\/holter-ecg$/);
});

test("six cartes « Pourquoi choisir », schémas animés à l'entrée à l'écran (FR-008 à FR-010)", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("[data-section=pourquoi-choisir]");
  await expect(section.getByRole("heading", { level: 2 })).toHaveText("Pourquoi choisir ExploCardio.fr ?");
  await expect(section.getByRole("heading", { level: 3 })).toHaveText(TITRES_RAISONS);
  const cartes = section.locator(".pq-carte");
  await expect(cartes.first().locator("[aria-hidden=true]").first()).toBeAttached();
  // Hors de l'écran : pas encore animée ; à l'écran : marquée visible, l'animation se joue.
  await expect(cartes.first()).not.toHaveAttribute("data-visible");
  await cartes.first().scrollIntoViewIfNeeded();
  await expect(cartes.first()).toHaveAttribute("data-visible", "");
  // Fin des animations en 2 secondes au plus (FR-010).
  const durees = await cartes.evaluateAll((els) =>
    els.flatMap((e) => e.getAnimations({ subtree: true }).map((a) => Number(a.effect?.getComputedTiming().endTime ?? 0))),
  );
  expect(Math.max(...durees)).toBeLessThanOrEqual(2000);
});

test("mouvement réduit : aucun élément des six cartes ne bouge (SC-005)", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const section = page.locator("[data-section=pourquoi-choisir]");
  await section.scrollIntoViewIfNeeded();
  const n = await section.evaluate((s) => s.getAnimations({ subtree: true }).length);
  expect(n).toBe(0);
  await expect(section.getByText("Bon d’achat")).toBeVisible();
});

test("SC-002 : sur un portable de 13 pouces, le haut des gammes phares est visible dès l'arrivée", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 760 });
  await page.goto("/");
  await expect(page.locator("[data-section=acces-rapide] h2")).toBeInViewport();
  await expect(page.locator("[data-section=acces-rapide] [data-tuile]").first()).toBeInViewport();
});

test("accessibilité et largeurs d'écran (SC-004)", async ({ page }) => {
  await page.goto("/");
  await verifierAccessibilite(page);
  for (const largeur of [320, 390, 768, 1280, 1920]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto("/");
    expect(await defileHorizontalement(page), `${largeur} px`).toBe(false);
  }
});
