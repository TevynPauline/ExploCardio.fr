import { expect, test, type Page } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { COMPTES, connecterNavigateur } from "../session";
import { requete } from "./outils";

// T033 (US6, FR-036, FR-037, FR-040, SC-008). Article de test : Mobil-O-Graph, remis en état à la fin.

test.describe.configure({ mode: "serial", timeout: 180_000 });

const REF = "EC-IEM-MOBILOGRAPH";
const ADMIN = `/admin/catalogue/${REF}`;
const FICHE = "/holter-tensionnel/iem-mobil-o-graph";
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

async function enregistrer(page: Page) {
  await page.getByRole("button", { name: "Enregistrer le contenu" }).click();
}

test("liste des articles d'Odoo et de l'état de leur contenu ; données d'Odoo en lecture seule", async ({ page }) => {
  await connecterNavigateur(page.context(), COMPTES.admin);
  await page.goto("/admin/catalogue");
  await verifierAccessibilite(page);
  const ligne = page.getByRole("row", { name: /SunTech Oscar 2/ });
  await expect(ligne).toContainText("Publié");
  await expect(page.getByRole("row", { name: /Tensiomètre électronique/ })).toContainText("En préparation");

  await page.goto(ADMIN);
  await verifierAccessibilite(page);
  await expect(page.getByText("Ces informations se gèrent dans Odoo")).toBeVisible();
  // Aucun champ de prix, stock, référence, configuration ou formule (US6-4).
  for (const nom of ["prix", "prixHt", "stock", "quantite", "defaultCode", "configuration", "formules"]) {
    await expect(page.locator(`[name="${nom}"]`)).toHaveCount(0);
  }
});

test("publication refusée avec la liste de ce qui manque ; rédaction, photo, publication, recherche, adresse modifiée", async ({ page }) => {
  await connecterNavigateur(page.context(), COMPTES.admin);
  const [avant] = await requete<{ textes: { descriptionCourte?: string }; slug: string }>("site", `SELECT textes, slug FROM contenu_produit WHERE "defaultCode" = $1`, [REF]);
  const debut = Date.now();
  try {
    await page.goto(ADMIN);
    await page.getByRole("button", { name: "Remettre en préparation" }).click();
    await expect(page.getByRole("status").filter({ hasText: "remis en préparation" })).toBeVisible();
    expect((await page.request.get(FICHE)).status()).toBe(404);
    await page.goto("/holter-tensionnel");
    await expect(page.locator("main")).not.toContainText("Mobil-O-Graph");

    await page.goto(ADMIN);
    await page.getByLabel(/Description courte/).fill("");
    await enregistrer(page);
    await expect(page.getByRole("status").filter({ hasText: "Contenu enregistré." })).toBeVisible();
    await page.getByRole("button", { name: "Publier" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Publication impossible" })).toContainText("La description courte.");

    // Photo sans texte de remplacement : refusée, saisie conservée.
    await page.getByLabel(/Description courte/).fill("Holter tensionnel et mesure de la rigidité artérielle (texte de test).");
    await page.getByLabel("Ajouter une photo").setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: PNG });
    await enregistrer(page);
    await expect(page.getByRole("alert").filter({ hasText: "texte de remplacement" }).first()).toBeVisible();
    await expect(page.getByLabel(/Description courte/)).toHaveValue(/rigidité artérielle/);

    await page.getByLabel("Ajouter une photo").setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: PNG });
    await page.getByLabel("Texte de remplacement de la nouvelle photo").fill("Enregistreur Mobil-O-Graph (photo de test)");
    await page.getByLabel("Adresse de la fiche").fill("iem-mobil-o-graph-test");
    await enregistrer(page);
    await expect(page.getByRole("status").filter({ hasText: "Contenu enregistré." })).toBeVisible();
    await page.getByRole("button", { name: "Publier" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Produit publié" })).toBeVisible();
    expect(Date.now() - debut).toBeLessThan(10 * 60_000); // SC-008

    await page.goto("/holter-tensionnel/iem-mobil-o-graph-test");
    await expect(page.getByRole("img", { name: "Enregistreur Mobil-O-Graph (photo de test)" })).toBeVisible();
    await page.goto(FICHE);
    await expect(page).toHaveURL(/iem-mobil-o-graph-test/); // ancienne adresse redirigée
    await page.goto("/recherche?q=mobil");
    await expect(page.locator("main").getByRole("link", { name: /Mobil-O-Graph/ }).first()).toHaveAttribute("href", /iem-mobil-o-graph-test/);
    const journal = await requete("site", `SELECT 1 FROM journal_action WHERE objet = $1 AND action IN ('catalogue.contenu', 'catalogue.publication')`, [REF]);
    expect(journal.length).toBeGreaterThanOrEqual(2);
  } finally {
    // Remise en état par l'écran (invalide les caches) : adresse, description, photo retirée, publié.
    await page.goto(ADMIN);
    await page.getByLabel("Adresse de la fiche").fill(avant!.slug);
    await page.getByLabel(/Description courte/).fill(avant!.textes.descriptionCourte ?? "");
    for (const c of await page.getByRole("checkbox", { name: "Retirer" }).all()) await c.check();
    await enregistrer(page);
    await expect(page.getByRole("status").filter({ hasText: "Contenu enregistré." })).toBeVisible();
    if (await page.getByRole("button", { name: "Publier" }).isVisible()) {
      await page.getByRole("button", { name: "Publier" }).click();
      await expect(page.getByRole("status").filter({ hasText: "Produit publié" })).toBeVisible();
    }
    await requete("site", `UPDATE contenu_produit SET "anciensSlugs" = '{}' WHERE "defaultCode" = $1`, [REF]);
  }
});

test("retrait du catalogue : l'adresse indique que le produit n'est plus proposé", async ({ page }) => {
  await connecterNavigateur(page.context(), COMPTES.admin);
  try {
    await page.goto(ADMIN);
    await page.getByRole("button", { name: "Retirer du catalogue" }).click();
    await expect(page.getByRole("status").filter({ hasText: "retiré du catalogue" })).toBeVisible();
    await page.goto(FICHE);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("n’est plus proposé");
    await expect(page.getByRole("link", { name: /Voir les produits/ })).toHaveAttribute("href", "/holter-tensionnel");
  } finally {
    await page.goto(ADMIN);
    await page.getByRole("button", { name: "Publier" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Produit publié" })).toBeVisible();
  }
});

test("le support n'a pas accès au catalogue", async ({ page }) => {
  await connecterNavigateur(page.context(), COMPTES.support);
  await page.goto("/admin/catalogue");
  await expect(page).toHaveURL(/\/admin\?acces=refuse/);
});

test("types : création, suppression refusée s'ils sont utilisés", async ({ page }) => {
  await connecterNavigateur(page.context(), COMPTES.admin);
  await page.goto("/admin/catalogue/sous-categories");
  await verifierAccessibilite(page);
  await page.getByRole("button", { name: "Supprimer Brassards" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "utilisé par" })).toBeVisible();
  const nom = `Type test ${Date.now() % 100000}`;
  await page.getByLabel("Nouveau type").first().fill(nom);
  await page.getByRole("button", { name: "Ajouter" }).first().click();
  await expect(page.getByText(nom)).toBeVisible();
  await page.getByRole("button", { name: `Supprimer ${nom}` }).click();
  await expect(page.getByText(nom)).toHaveCount(0);
});
