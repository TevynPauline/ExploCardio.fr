import { expect, test, type Page } from "@playwright/test";
import { verifierAccessibilite } from "../axe";

// T008 — carrousel de l'accueil (F16, US2, FR-005 à FR-008, SC-004) : défilement toutes les
// 6 secondes, pause (survol, focus, bouton), flèches et points au clavier, mouvement réduit.
// Données de départ : trois vignettes publiées, l'offre de bienvenue en premier.

test.describe.configure({ timeout: 120_000 });

const carrousel = (page: Page) => page.getByRole("region", { name: "À la une" });
const visible = (page: Page) => carrousel(page).locator("[data-vignette]:not([aria-hidden])");

test("défile toutes les 6 secondes ; la pause l'arrête ; flèches et points au clavier", async ({ page }) => {
  await page.goto("/");
  await expect(visible(page)).toHaveAttribute("aria-label", /^1 sur \d+$/);
  await expect(visible(page)).toContainText("Un tensiomètre offert");
  await page.mouse.move(0, 0);
  await expect(visible(page)).toHaveAttribute("aria-label", /^2 sur/, { timeout: 8_000 });

  await carrousel(page).getByRole("button", { name: "Pause" }).click();
  await page.mouse.move(0, 0);
  await page.locator("body").click({ position: { x: 1, y: 1 } });
  const avant = await visible(page).getAttribute("aria-label");
  await page.waitForTimeout(7_000);
  await expect(visible(page)).toHaveAttribute("aria-label", avant!);
  await expect(carrousel(page).getByRole("button", { name: "Lecture" })).toHaveAttribute("aria-pressed", "true");

  await carrousel(page).getByRole("button", { name: "Vignette précédente" }).focus();
  await page.keyboard.press("Enter");
  await expect(visible(page)).toHaveAttribute("aria-label", /^1 sur/);
  await carrousel(page).getByRole("button", { name: /^Vignette 3 :/ }).focus();
  await page.keyboard.press("Enter");
  await expect(visible(page)).toHaveAttribute("aria-label", /^3 sur/);
  await expect(carrousel(page).getByRole("button", { name: /^Vignette 3 :/ })).toHaveAttribute("aria-current", "true");
  await verifierAccessibilite(page);
});

test("le survol arrête le défilement", async ({ page }) => {
  await page.goto("/");
  await carrousel(page).hover();
  await page.waitForTimeout(7_000);
  await expect(visible(page)).toHaveAttribute("aria-label", /^1 sur/);
});

test("mouvement réduit : aucun défilement automatique", async ({ browser, baseURL }) => {
  const contexte = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json", reducedMotion: "reduce" });
  const page = await contexte.newPage();
  await page.goto("/");
  await page.mouse.move(0, 0);
  await page.waitForTimeout(7_000);
  await expect(visible(page)).toHaveAttribute("aria-label", /^1 sur/);
  await contexte.close();
});

test("le bouton d'une vignette mène à sa page ; aucun grand logo ni signature", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main").getByText("(hors imagerie)")).toHaveCount(0);
  await expect(page.locator("main").getByRole("img", { name: "ExploCardio.fr" })).toHaveCount(0);
  await carrousel(page).getByRole("button", { name: "Pause" }).click();
  await visible(page).getByRole("link", { name: "Créer mon compte" }).click();
  await expect(page).toHaveURL(/\/inscription$/, { timeout: 30_000 });
});
