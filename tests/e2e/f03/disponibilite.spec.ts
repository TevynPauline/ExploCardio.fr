import { expect, test, type Page } from "@playwright/test";
import { COMPTES, connecterNavigateur } from "../session";
import { requete } from "./outils";

// T031 (US5, FR-030 à FR-033, FR-048, SC-013). Chaque modification de la base fictive est
// rétablie en fin de test, en attendant la confirmation (sinon elle déborde sur les suivants).

test.describe.configure({ mode: "serial", timeout: 120_000 });

async function stock(defaultCode: string) {
  const [s] = await requete<{ quantite: number; etatHorsStock: string; delaiJours: number | null }>(
    "demo",
    `SELECT s.quantite, s."etatHorsStock", s."delaiJours" FROM stock_quant s JOIN product_product v ON v.id = s."varianteId" WHERE v."defaultCode" = $1`,
    [defaultCode],
  );
  return s!;
}

async function modifierStock(admin: Page, libelle: RegExp, valeurs: { quantite: number; etat: "delai" | "indisponible"; delai?: number | null }) {
  await admin.goto("/admin/demonstration/stocks");
  const ligne = admin.getByRole("row", { name: libelle });
  await ligne.getByLabel("Quantité").fill(String(valeurs.quantite));
  await ligne.getByLabel("Si épuisé").selectOption(valeurs.etat);
  await ligne.getByLabel("Délai (jours)").fill(valeurs.delai ? String(valeurs.delai) : "");
  await ligne.getByRole("button", { name: /Enregistrer le stock/ }).click();
  await expect(admin.getByRole("status").first()).toBeVisible();
}

test("rupture saisie dans l'écran de démonstration : visible en moins d'une minute partout (SC-013)", async ({ page, browser, baseURL }) => {
  const equipe = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  await connecterNavigateur(equipe, COMPTES.admin);
  const admin = await equipe.newPage();
  const avant = await stock("EC-SUN-MINIBRAVO");
  try {
    const debut = Date.now();
    await modifierStock(admin, /Mini Bravo/, { quantite: 0, etat: "indisponible" });
    await page.goto("/holter-tensionnel");
    await expect(page.locator("main article").filter({ hasText: "Mini Bravo" })).toContainText("Indisponible");
    await page.goto("/holter-tensionnel/suntech-mini-bravo");
    const panneau = page.getByTestId("panneau-formule");
    await expect(panneau).toContainText("Indisponible");
    await expect(panneau.getByRole("button", { name: "Ajouter au panier" })).toHaveCount(0);
    await expect(panneau.getByRole("link", { name: "Nous contacter" })).toBeVisible();
    expect(Date.now() - debut).toBeLessThan(60_000);

    await modifierStock(admin, /Mini Bravo/, { quantite: 0, etat: "delai", delai: 12 });
    await page.goto("/holter-tensionnel/suntech-mini-bravo");
    await expect(panneau).toContainText("Délai 12 jours");
    await panneau.getByRole("button", { name: "Ajouter au panier" }).click();
    await expect(panneau.getByRole("status")).toContainText("Délai : 12 jours");
  } finally {
    await modifierStock(admin, /Mini Bravo/, { quantite: avant.quantite, etat: avant.etatHorsStock as "delai", delai: avant.delaiJours });
    expect((await stock("EC-SUN-MINIBRAVO")).quantite).toBe(avant.quantite);
    await equipe.close();
  }
});

test("prix modifié dans l'écran de démonstration : visible en moins d'une minute", async ({ page, browser, baseURL }) => {
  const equipe = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  await connecterNavigateur(equipe, COMPTES.admin);
  const admin = await equipe.newPage();
  const [v] = await requete<{ prix: number }>("demo", `SELECT "prixHtCentimes" AS prix FROM product_product WHERE "defaultCode" = 'EC-SUN-MINIBRAVO'`);
  const champ = () => admin.getByLabel(/Prix HT de SunTech Mini Bravo/);
  try {
    await admin.goto("/admin/demonstration/prix");
    await champ().fill("1234,00");
    await admin.getByRole("button", { name: /Enregistrer le prix de SunTech Mini Bravo/ }).click();
    await expect(admin.getByRole("status").first()).toBeVisible();
    await page.goto("/holter-tensionnel/suntech-mini-bravo");
    await expect(page.getByTestId("panneau-formule")).toContainText("1 234,00 € HT");
  } finally {
    await admin.goto("/admin/demonstration/prix");
    await champ().fill((v!.prix / 100).toFixed(2).replace(".", ","));
    await admin.getByRole("button", { name: /Enregistrer le prix de SunTech Mini Bravo/ }).click();
    await expect(admin.getByRole("status").first()).toBeVisible();
    await equipe.close();
  }
});

test("disponibilité indiquée par formule quand le parc de location diffère du stock de vente", async ({ page }) => {
  await page.goto("/holter-ecg/dms-300-3a?formule=achat&config=EC-DMS-3003A-CLOUD");
  const panneau = page.getByTestId("panneau-formule");
  await expect(panneau).toContainText("Disponible");
  await page.locator("main").getByText("Mise à disposition mensuelle (sans engagement)").click();
  await expect(panneau).toContainText(/Délai \d+ jours|Indisponible/);
});

test("un pack suit la disponibilité de ses composants", async ({ page, browser, baseURL }) => {
  const equipe = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  await connecterNavigateur(equipe, COMPTES.admin);
  const admin = await equipe.newPage();
  const avant = await stock("EC-DMS-3004L");
  try {
    await modifierStock(admin, /DMS 300-4L — Enregistreur seul/, { quantite: 0, etat: "indisponible" });
    await page.goto("/holter-ecg/dms-300-4l?formule=achat&config=EC-DMS-3004L-PACK");
    await expect(page.getByTestId("panneau-formule")).toContainText("Indisponible");
    // L'autre configuration, sans ce composant, reste commandable (cas limite de la spec).
    await page.locator("main").getByText("Enregistreur + logiciel Cloud").click();
    await expect(page.getByTestId("panneau-formule").getByRole("button", { name: "Ajouter au panier" })).toBeVisible();
  } finally {
    await modifierStock(admin, /DMS 300-4L — Enregistreur seul/, { quantite: avant.quantite, etat: avant.etatHorsStock as "delai", delai: avant.delaiJours });
    expect((await stock("EC-DMS-3004L")).quantite).toBe(avant.quantite);
    await equipe.close();
  }
});

test("Odoo en panne : la fiche reste consultable sans affirmer prix ni disponibilité", async ({ page, browser, baseURL }) => {
  const equipe = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  await connecterNavigateur(equipe, COMPTES.admin);
  const admin = await equipe.newPage();
  const carte = admin.locator(".ec-card", { hasText: "Odoo" });
  await admin.goto("/admin/demonstration/pannes");
  await carte.getByRole("button", { name: "Simuler une panne" }).click();
  await expect(carte.getByRole("button", { name: "Rétablir" })).toBeVisible();
  try {
    await page.goto("/holter-tensionnel/suntech-oscar-2");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Oscar 2");
    await expect(page.locator("main")).toContainText("Prix et disponibilité momentanément indisponibles");
    await expect(page.locator("main")).not.toContainText(/€ HT/);
    await expect(page.locator("main").getByRole("button", { name: "Ajouter au panier" })).toHaveCount(0);
    await page.goto("/holter-tensionnel");
    await expect(page.locator("main")).toContainText("Le catalogue est momentanément indisponible");
  } finally {
    await carte.getByRole("button", { name: "Rétablir" }).click();
    await expect(carte.getByRole("button", { name: "Simuler une panne" })).toBeVisible();
    await equipe.close();
  }
});
