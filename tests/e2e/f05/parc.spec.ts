import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { COMPTES, connecterNavigateur } from "../session";
import { parametre, rendreParcDesTests, requete } from "./outils";

// T035 (US8, FR-035 à FR-039, SC-006) : disponibilité affichée = parc ; réglages du back-office ;
// locations en lecture seule pour l'équipe.

test.describe.configure({ timeout: 240_000, mode: "serial" });
test.beforeEach(rendreParcDesTests);

test("appareil passé en maintenance ou remis disponible : proposé ou non en moins d'une minute", async ({ page }) => {
  const lots = await requete<{ id: number }>("demo", `SELECT l.id FROM stock_lot l JOIN product_product v ON v.id = l."varianteId" WHERE v."defaultCode" = 'EC-DMS-ABP-KIT' AND l.statut = 'disponible'`);
  try {
    await page.goto("/mise-a-disposition");
    await expect(page.locator("main").getByRole("listitem", { name: /DMS300-ABP/ })).toBeVisible();
    const debut = Date.now();
    await requete("demo", `UPDATE stock_lot SET statut = 'en_maintenance', "retourPrevu" = NULL WHERE id = ANY($1)`, [lots.map((x) => x.id)]);
    await page.reload();
    await expect(page.locator("main").getByRole("listitem", { name: /DMS300-ABP/ })).toContainText("Première livraison possible");
    expect(Date.now() - debut).toBeLessThan(60_000); // SC-006
  } finally {
    await requete("demo", `UPDATE stock_lot SET statut = 'disponible' WHERE id = ANY($1)`, [lots.map((x) => x.id)]);
  }
});

test("réglages du back-office (heure limite, jours non livrés) et locations en lecture seule", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  // F13 (D3) : la livraison se règle dans Paramètres › Livraison.
  await page.goto("/admin/parametres?theme=livraison");
  await verifierAccessibilite(page);
  await expect(page.getByRole("heading", { level: 2, name: "Livraison" })).toBeVisible();
  const retablir = await parametre("livraison.jours_non_livres", "[]");
  const carte = page.locator("#livraison-jours_non_livres");
  try {
    await carte.getByLabel("Jours non livrés").fill("2026-12-24\n2026-13-45");
    await carte.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Jours non livrés" })).toBeVisible();
    await carte.getByLabel("Jours non livrés").fill("2026-12-24");
    await carte.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("status").filter({ hasText: "enregistré" })).toBeVisible();
    const [p] = await requete<{ valeur: string }>("site", `SELECT valeur FROM parametre WHERE cle = 'livraison.jours_non_livres'`);
    expect(JSON.parse(p!.valeur)).toEqual(["2026-12-24"]);
  } finally {
    await retablir();
  }

  await page.goto("/admin/locations?vue=en_cours");
  await verifierAccessibilite(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mises à disposition");
  await expect(page.locator("main").getByRole("button")).toHaveCount(0);
  for (const vue of ["Commandées", "Impayés", "Retards de retour"]) await expect(page.getByRole("link", { name: new RegExp(vue) })).toBeVisible();
});
