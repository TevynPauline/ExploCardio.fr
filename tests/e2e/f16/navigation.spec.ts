import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { COMPTES, connecterNavigateur } from "../session";
import { boite } from "./outils";

// T004 — navigation (F16, US1, FR-001 à FR-004, SC-001, SC-002) : en-tête mobile, menu
// horizontal dès 1 024 px (PC Windows à affichage agrandi compris), fil d'Ariane.

test.describe.configure({ timeout: 180_000 });

const ENTREES = ["Holter ECG", "Holter tensionnel", "Épreuve d'effort", "Accessoires & consommables", "Services", "Financement", "Qui sommes-nous / Contact"];

for (const largeur of [320, 390]) {
  test(`en-tête à ${largeur} px : menu à gauche, logo au centre, recherche, panier et compte à droite`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: 800 });
    await page.goto("/");
    const entete = page.getByRole("banner");
    const menu = await boite(page, entete.getByRole("button", { name: "Menu" }));
    const logo = await boite(page, entete.getByRole("link", { name: "ExploCardio.fr, accueil" }));
    const recherche = await boite(page, entete.getByRole("button", { name: /Rechercher/ }));
    const panier = await boite(page, entete.getByRole("link", { name: /^Panier/ }));
    const compte = await boite(page, entete.getByRole("link", { name: "Mon compte / Connexion" }));
    expect(menu.x + menu.width).toBeLessThanOrEqual(logo.x);
    expect(Math.abs(logo.x + logo.width / 2 - largeur / 2)).toBeLessThan(24);
    expect(logo.x + logo.width).toBeLessThanOrEqual(recherche.x);
    expect(recherche.x).toBeLessThan(panier.x);
    expect(panier.x).toBeLessThan(compte.x);
    for (const b of [menu, recherche, panier, compte]) expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(44);
    await expect(page.getByRole("navigation", { name: "Navigation principale" })).toBeHidden();
  });
}

// 1 093 px : écran de 1 366 px à 125 % ; 1 280 px : écran de 1 920 px à 150 % (Windows).
for (const largeur of [1024, 1093, 1280, 1920]) {
  test(`menu horizontal complet à ${largeur} px`, async ({ page }) => {
    await page.setViewportSize({ width: largeur, height: 800 });
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(nav).toBeVisible();
    await expect(page.getByRole("banner").getByRole("button", { name: "Menu" })).toBeHidden();
    const hauts = new Set<number>();
    for (const e of ENTREES) {
      const b = await boite(page, nav.getByRole("button", { name: e, exact: true }));
      expect(b.x + b.width).toBeLessThanOrEqual(largeur);
      hauts.add(Math.round(b.y));
    }
    expect(hauts.size).toBe(1);
    await nav.getByRole("button", { name: "Holter ECG", exact: true }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#megamenu-holter_ecg")).toBeVisible();
  });
}

test("fil d'Ariane : famille, fiche, services, aide ; absent de l'accueil", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Fil d’Ariane" })).toHaveCount(0);

  await page.goto("/holter-ecg");
  const fil = page.getByRole("navigation", { name: "Fil d’Ariane" });
  await expect(fil.getByRole("link", { name: "Accueil" })).toHaveAttribute("href", "/");
  await expect(fil.locator('[aria-current="page"]')).toHaveText("Holter ECG");

  await page.goto("/holter-ecg/dms-300-4l");
  await expect(fil.getByRole("link", { name: "Holter ECG" })).toHaveAttribute("href", "/holter-ecg");
  await expect(fil.locator('[aria-current="page"]')).toContainText("300-4L");
  await fil.getByRole("link", { name: "Holter ECG" }).click();
  await expect(page).toHaveURL(/\/holter-ecg$/);

  await page.goto("/services/assistance");
  await expect(fil.getByRole("link", { name: "Services" })).toHaveAttribute("href", "/services");
  await page.goto("/aide");
  await expect(fil.locator('[aria-current="page"]')).toHaveText("Centre d’aide");
  await page.goto("/cgv");
  await expect(fil.locator('[aria-current="page"]')).toBeVisible();
  await verifierAccessibilite(page);
});

test("fil d'Ariane sur téléphone : lien vers la rubrique parente", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/holter-ecg/dms-300-4l");
  const fil = page.getByRole("navigation", { name: "Fil d’Ariane" });
  await expect(fil.getByRole("link", { name: /Holter ECG/ }).first()).toBeVisible();
  await expect(fil.locator("ol")).toBeHidden();
});

test("fil d'Ariane de Mon compte", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.clientDroits);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/mon-compte/commandes");
  const fil = page.getByRole("navigation", { name: "Fil d’Ariane" });
  await expect(fil.getByRole("link", { name: "Mon compte" })).toHaveAttribute("href", "/mon-compte");
  await expect(fil.locator('[aria-current="page"]')).toHaveText("Commandes");
});
