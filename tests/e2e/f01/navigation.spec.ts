import { expect, test } from "@playwright/test";

// T030 (US2, FR-001 à FR-009), mis à jour par F27 : cinq entrées et deux liens discrets.

const ENTREES = ["Produits", "Consommables", "Informatique médicale", "Location et financement", "Services"];

test.describe("ordinateur", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test("barre fixe, logo, cinq entrées dans l'ordre, recherche, panier, compte", async ({ page }) => {
    await page.goto("/holter-ecg");
    const nav = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(nav.getByRole("button")).toHaveText(ENTREES);
    await expect(page.getByRole("combobox", { name: /Rechercher un produit/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "Panier, vide" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Mon compte" })).toBeVisible();
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
    const produits = page.getByRole("navigation", { name: "Navigation principale" }).getByRole("button", { name: "Produits" });
    await produits.focus();
    await page.keyboard.press("ArrowDown");
    await expect(page.locator("#megamenu-produits a").first()).toBeFocused();
    await expect(page.locator("#megamenu-produits").getByRole("link", { name: "Enregistreurs Holter ECG" })).toBeVisible();
    // Clic à l'extérieur
    await page.mouse.click(10, 700);
    await expect(page.locator("#megamenu-produits")).toBeHidden();
  });

  test("méga-menu ouvert au survol", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Navigation principale" }).getByRole("button", { name: "Services" }).hover();
    await expect(page.locator("#megamenu-services")).toBeVisible();
    await expect(page.locator("#megamenu-services").getByRole("link", { name: "Installation et formation" })).toBeVisible();
  });

  test("le méga-menu suit la souris : reste ouvert sur son panneau, se referme dès qu'elle en sort", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Navigation principale" });
    const panneau = page.locator("#megamenu-services");
    await nav.getByRole("button", { name: "Services" }).hover();
    await expect(panneau).toBeVisible();
    // Descente dans le panneau : il reste ouvert.
    await panneau.getByRole("link", { name: "Installation et formation" }).hover();
    await page.waitForTimeout(400);
    await expect(panneau).toBeVisible();
    // Passage sur une autre entrée : son menu remplace aussitôt le premier.
    await nav.getByRole("button", { name: "Location et financement" }).hover();
    await expect(panneau).toBeHidden();
    await expect(page.locator("#megamenu-location")).toBeVisible();
    // Souris sur le logo, toujours dans l'en-tête : le menu se referme.
    await page.getByRole("link", { name: "ExploCardio.fr, accueil" }).hover();
    await expect(page.locator("#megamenu-location")).toBeHidden({ timeout: 1_000 });
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
    await menu.getByRole("button", { name: "Produits" }).click();
    await menu.getByRole("button", { name: "ECG de repos" }).click();
    const lien = menu.getByRole("link", { name: "Électrocardiographes" });
    await expect(lien).toBeVisible();
    const boite = await lien.boundingBox();
    expect(boite!.height).toBeGreaterThanOrEqual(44);
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
  });
});
