import { expect, test } from "@playwright/test";

// T030 (US2, FR-001 à FR-009).

const ENTREES = ["Holter ECG", "Holter tensionnel", "Épreuve d'effort", "Accessoires & consommables", "Services", "Financement", "Qui sommes-nous / Contact"];

test.describe("ordinateur", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test("barre fixe, logo, sept entrées dans l'ordre, recherche, panier, compte", async ({ page }) => {
    await page.goto("/holter-ecg");
    const nav = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(nav.getByRole("button")).toHaveText(ENTREES);
    await expect(page.getByRole("button", { name: "Rechercher" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Panier, vide" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Mon compte / Connexion" })).toBeVisible();
    await page.mouse.wheel(0, 2000);
    await expect(nav).toBeInViewport();
    await page.getByRole("link", { name: "ExploCardio.fr, accueil" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("méga-menus au clic et au clavier, fermés par Échap avec retour du focus", async ({ page }) => {
    await page.goto("/");
    for (const libelle of ENTREES) {
      const bouton = page.getByRole("navigation", { name: "Navigation principale" }).getByRole("button", { name: libelle });
      await bouton.click();
      await expect(bouton).toHaveAttribute("aria-expanded", "true");
      const panneau = page.locator(`#${await bouton.getAttribute("aria-controls")}`);
      await expect(panneau).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(panneau).toBeHidden();
      await expect(bouton).toBeFocused();
    }
    // Clavier : flèche bas ouvre et place le focus dans le panneau
    const holter = page.getByRole("navigation", { name: "Navigation principale" }).getByRole("button", { name: "Holter ECG" });
    await holter.focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.locator("#megamenu-holter_ecg a").first()).toBeFocused();
    await expect(page.locator("#megamenu-holter_ecg").getByRole("link", { name: "ECG de repos" })).toBeVisible();
    // Clic à l'extérieur
    await page.mouse.click(10, 700);
    await expect(page.locator("#megamenu-holter_ecg")).toBeHidden();
  });

  test("méga-menu ouvert au survol", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("button", { name: "Services" }).hover();
    await expect(page.locator("#megamenu-services")).toBeVisible();
    await expect(page.locator("#megamenu-services").getByRole("link", { name: "Hébergement des données de santé" })).toBeVisible();
  });
});

test.describe("mobile", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
  });

  test("menu replié au même contenu, cibles de 44 px", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Menu" }).click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu).toBeVisible();
    for (const libelle of ENTREES) await expect(menu.getByRole("button", { name: libelle })).toBeVisible();
    await menu.getByRole("button", { name: "Holter ECG" }).click();
    const lien = menu.getByRole("link", { name: "ECG de repos" });
    await expect(lien).toBeVisible();
    const boite = await lien.boundingBox();
    expect(boite!.height).toBeGreaterThanOrEqual(44);
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  });
});
