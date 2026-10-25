import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { requete } from "./outils";

// T017 (US1, FR-015 à FR-025, SC-001) ; ordre et sections revus par F16 (FR-009).

const ORDRE = ["carrousel", "acces-rapide", "pourquoi", "service-fidelite", "offre-digitale", "contact"];

test("les sections de l'accueil sont dans l'ordre, accessibles", async ({ page }) => {
  await page.goto("/");
  const sections = await page.locator("[data-section]").evaluateAll((els) => els.map((e) => e.getAttribute("data-section")));
  expect(sections).toEqual(ORDRE);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Le spécialiste des explorations fonctionnelles cardiaques");
  await verifierAccessibilite(page);
});

test("SC-001 : chacune des 6 tuiles mène à sa page en un clic", async ({ page }) => {
  await page.goto("/");
  const tuiles = page.locator("[data-tuile]");
  await expect(tuiles).toHaveCount(6);
  const liens = await tuiles.evaluateAll((els) => els.map((e) => e.getAttribute("href")!));
  for (const [i, lien] of liens.entries()) {
    await page.goto("/");
    await page.locator("[data-tuile]").nth(i).click();
    await expect(page).toHaveURL(new RegExp(`${lien.replace(/[/]/g, "\\/")}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
});

test("grille de tuiles : 3 par ligne sur ordinateur, 2 sur tablette, 1 sur mobile", async ({ page }) => {
  for (const [largeur, colonnes] of [[1280, 3], [820, 2], [390, 1]] as const) {
    await page.setViewportSize({ width: largeur, height: 900 });
    await page.goto("/");
    const tops = await page.locator("[data-tuile]").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    expect(tops.filter((t) => t === tops[0]).length, `${largeur} px`).toBe(colonnes);
  }
});

test("badges « En préparation » et bloc contact sans ligne vide", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("[data-tuile]", { hasText: "Hébergement des données de santé" }).getByText("En préparation")).toBeVisible();
  await expect(page.locator("[data-section=offre-digitale]").getByText("En préparation")).toBeVisible();
  const contact = page.locator("[data-section=contact]");
  await expect(contact.getByRole("heading")).toHaveText("Une question ? Écrivez-nous");
  const vides = await requete<{ n: number }>("site", `SELECT count(*)::int n FROM parametre WHERE cle IN ('contact.email','contact.telephone','contact.adresse') AND valeur <> ''`);
  if (vides[0]!.n === 0) await expect(contact.locator("dt")).toHaveCount(0);
});

// Le carrousel et ses vignettes sont vérifiés par tests/e2e/f16/.
