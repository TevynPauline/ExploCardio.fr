import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { requete } from "./outils";

// T017 (US1, FR-015 à FR-025, SC-001) ; ordre et sections revus par F16 (FR-009), F20 (FR-015)
// puis F23 (ordre de départ des blocs, trois gammes phares).

const ORDRE = ["trois-temps", "acces-rapide", "pourquoi-choisir", "carrousel", "contact"];

test("les sections de l'accueil sont dans l'ordre, accessibles", async ({ page }) => {
  await page.goto("/");
  const sections = await page.locator("[data-section]").evaluateAll((els) => els.map((e) => e.getAttribute("data-section")));
  expect(sections).toEqual(ORDRE);
  // F20 (FR-005) : la phrase d'accroche de l'animation est le titre de la page.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Une offre pensée pour la cardiologie libérale");
  await verifierAccessibilite(page);
});

test("SC-001 : chacune des 3 gammes phares mène à sa page en un clic", async ({ page }) => {
  await page.goto("/");
  const tuiles = page.locator("[data-tuile]");
  await expect(tuiles).toHaveCount(3);
  const liens = await tuiles.evaluateAll((els) => els.map((e) => e.getAttribute("href")!));
  for (const [i, lien] of liens.entries()) {
    await page.goto("/");
    await page.locator("[data-tuile]").nth(i).click();
    await expect(page).toHaveURL(new RegExp(`${lien.replace(/[/]/g, "\\/")}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("gammes phares : 3 par ligne sur ordinateur et tablette, 1 sur mobile", async ({ page }) => {
  for (const [largeur, colonnes] of [[1280, 3], [820, 3], [390, 1]] as const) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto("/");
    const tops = await page.locator("[data-tuile]").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(tops.filter((t) => t === tops[0]).length, `${largeur} px`).toBe(colonnes);
  }
});

test("bloc contact sans ligne vide", async ({ page }) => {
  await page.goto("/");
  const contact = page.locator("[data-section=contact]");
  await expect(contact.getByRole("heading")).toHaveText("Une question ? Écrivez-nous");
  const vides = await requete<{ n: number }>("site", `SELECT count(*)::int n FROM parametre WHERE cle IN ('contact.email','contact.telephone','contact.adresse') AND valeur <> ''`);
  if (vides[0]!.n === 0) await expect(contact.locator("dt")).toHaveCount(0);
});

// Le carrousel et ses vignettes sont vérifiés par tests/e2e/f16/.
