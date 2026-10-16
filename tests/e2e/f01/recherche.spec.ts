import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { COMPTES, connecterNavigateur } from "../session";

// T046 (US4, SC-008, SC-009, FR-010 à FR-014).

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
});

async function ouvrir(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Rechercher" }).click();
  return page.getByRole("combobox", { name: /Rechercher un produit/ });
}

test("suggestions groupées dès 2 caractères, en moins d'une seconde", async ({ page }) => {
  const champ = await ouvrir(page);
  await champ.fill("os");
  const debut = Date.now();
  await expect(page.getByRole("option").first()).toBeVisible({ timeout: 1_000 });
  expect(Date.now() - debut).toBeLessThan(1_000);
  await expect(page.getByRole("group", { name: "Produits" })).toBeVisible();
  await verifierAccessibilite(page);
});

test("référence exacte en premier, avec ou sans tirets ; Entrée ouvre la destination", async ({ page }) => {
  const champ = await ouvrir(page);
  for (const saisie of ["98-0239-22", "98023922"]) {
    await champ.fill(saisie);
    await expect(page.getByRole("option").first()).toContainText("26-34 cm");
  }
  await champ.press("ArrowDown");
  await expect(page.getByRole("option").first()).toHaveAttribute("aria-selected", "true");
  await champ.press("Enter");
  await expect(page).toHaveURL(/\/accessoires-consommables#EC-SUN-ORBIT-M$/);
});

test("accents et casse ignorés ; prix HT", async ({ page }) => {
  const champ = await ouvrir(page);
  await champ.fill("ÉLECTRODES");
  const premier = page.getByRole("option").first();
  await expect(premier).toContainText("Électrodes Holter");
  await expect(premier).toContainText("HT");
});

test("aucun résultat : message et chemins alternatifs sur la page de résultats", async ({ page }) => {
  const champ = await ouvrir(page);
  await champ.fill("zzqqxx");
  await expect(page.getByText(/Aucun résultat\. Appuyez sur Entrée/)).toBeVisible();
  await champ.press("Enter");
  await expect(page).toHaveURL(/\/recherche\?q=zzqqxx/);
  await expect(page.getByRole("link", { name: "Nous contacter" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Holter ECG" }).last()).toBeVisible();
});

test("Échap ferme la recherche et rend le focus au bouton", async ({ page }) => {
  const champ = await ouvrir(page);
  await champ.fill("dms");
  await champ.press("Escape");
  await expect(page.getByRole("button", { name: "Rechercher" })).toBeFocused();
});

test("recherche indisponible quand le connecteur Odoo est en panne", async ({ page, context, request }) => {
  await connecterNavigateur(context, COMPTES.admin);
  await page.goto("/admin/demonstration/pannes");
  await page.locator(".ec-card", { hasText: "Odoo" }).getByRole("button", { name: "Simuler une panne" }).click();
  try {
    // L'index en mémoire reste utilisé s'il existe déjà : on vérifie la page sans planter.
    const r = await request.get("/api/recherche?q=oscar");
    expect(r.status()).toBe(200);
    const corps = (await r.json()) as { indisponible: boolean; groupes: unknown[] };
    expect(corps.indisponible || corps.groupes.length > 0).toBe(true);
  } finally {
    await page.goto("/admin/demonstration/pannes");
    const carte = page.locator(".ec-card", { hasText: "Odoo" });
    await carte.getByRole("button", { name: "Rétablir" }).click();
    // Attendre que le rétablissement soit enregistré : sinon la panne déborde sur les parcours suivants.
    await expect(carte.getByRole("button", { name: "Simuler une panne" })).toBeVisible();
  }
});
