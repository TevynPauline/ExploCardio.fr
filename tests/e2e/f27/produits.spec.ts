import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";

// F27, US1 et US4 : nouvelle barre de menu et panneau « Produits » à trois niveaux.

const ENTREES = ["Produits", "Consommables", "Informatique médicale", "Location et financement", "Services"];

test.describe("ordinateur", () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name !== "desktop");
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test("cinq entrées sur une ligne dès 1 024 px, liens discrets à droite", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 800 });
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(nav.getByRole("button")).toHaveText(ENTREES);
    await expect(nav.getByRole("link", { name: "Qui sommes-nous" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Contact" })).toBeVisible();
    const hauts = await nav.getByRole("button").evaluateAll((b) => b.map((x) => Math.round(x.getBoundingClientRect().top)));
    expect(new Set(hauts).size).toBe(1);
  });

  test("Produits : quatre colonnes, trois niveaux, sans catégorie technique ni motif", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("button", { name: "Produits" }).hover();
    const panneau = page.locator("#megamenu-produits");
    await expect(panneau).toBeVisible();
    await expect(panneau.getByRole("heading", { level: 2 })).toHaveText(["Holter ECG", "Holter tensionnel / MAPA", "Épreuve d'effort", "ECG de repos"]);
    await expect(panneau.getByRole("link", { name: "Accessoires Holter ECG" })).toHaveClass(/font-semibold/);
    await expect(panneau.getByRole("link", { name: "Sacoches pour Holter ECG" })).toBeVisible();
    for (const t of ["Frais d'importation", "Logistique", "Expenses"]) await expect(panneau.getByText(t)).toHaveCount(0);
    await expect(panneau.locator(".ec-dots, [data-dots]")).toHaveCount(0);
    await verifierAccessibilite(page);
    await panneau.getByRole("link", { name: "Sacoches pour Holter ECG" }).click();
    await expect(page).toHaveURL(/\/holter-ecg\?categorie=holter-ecg%2Faccessoires-holter-ecg%2Fsacoches-pour-holter-ecg/);
    await expect(page.getByRole("main").getByText("Sacoches pour Holter ECG").first()).toBeVisible();
    await expect(page.getByRole("main").getByText("Pochette d'enregistreur").first()).toBeVisible();
  });

  test("le titre d'une famille mène à tous ses produits", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("button", { name: "Produits" }).hover();
    await page.locator("#megamenu-produits").getByRole("link", { name: "Holter tensionnel / MAPA" }).click();
    await expect(page).toHaveURL(/\/holter-tensionnel$/);
  });

  test("Location et financement, Services : liens attendus, plus d'hébergement dans Services", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Navigation principale" });
    await nav.getByRole("button", { name: "Location et financement" }).hover();
    const loc = page.locator("#megamenu-location");
    for (const l of ["Mise à disposition au mois", "Dépannage express", "Financement longue durée"]) await expect(loc.getByRole("link", { name: l })).toBeVisible();
    await nav.getByRole("button", { name: "Services" }).hover();
    const services = page.locator("#megamenu-services");
    for (const l of ["Assistance et service", "Centre d’aide", "Installation et formation"]) await expect(services.getByRole("link", { name: l })).toBeVisible();
    await expect(services.getByText("Hébergement")).toHaveCount(0);
  });
});

test.describe("téléphone", () => {
  test.beforeEach(async ({ page }, info) => {
    test.skip(info.project.name !== "mobile");
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test("listes dépliables jusqu'au niveau 3, cibles de 44 px", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menu" }).click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    for (const e of ENTREES) await expect(menu.getByRole("button", { name: e })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Qui sommes-nous" })).toBeVisible();
    await menu.getByRole("button", { name: "Produits" }).click();
    await menu.getByRole("button", { name: "Holter ECG" }).click();
    const lien = menu.getByRole("link", { name: "Câbles pour Holter ECG" });
    await expect(lien).toBeVisible();
    expect((await lien.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
});
