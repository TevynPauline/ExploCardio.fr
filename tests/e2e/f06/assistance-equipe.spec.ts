import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { COMPTES, connecterNavigateur } from "../session";
import { PANIER_1200, clientConnecte, composerPanier, ecranDemo, payerParCarte, requete } from "./outils";

// T023 (US6, SC-007, D7) : page « Assistance » du back-office, en lecture seule, ouverte au
// support : recherche par nom, cabinet, email, téléphone, RPPS, SIRET ; ajustement manuel au
// démonstrateur affiché avec son motif.

test.describe.configure({ timeout: 240_000 });

test("le support retrouve les droits d'un client en quelques secondes, sans pouvoir les modifier", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await composerPanier(page, c.email, PANIER_1200);
  await payerParCarte(page);
  const [compte] = await requete<{ rpps: string }>("site", `SELECT c.rpps FROM compte_client c JOIN utilisateur u ON u.id = c."utilisateurId" WHERE u.email = $1`, [c.email]);

  const contexte = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  await connecterNavigateur(contexte, COMPTES.support);
  const support = await contexte.newPage();
  await support.goto("/admin");
  const debut = Date.now();
  await support.getByRole("navigation", { name: "Back-office" }).getByRole("link", { name: "Assistance" }).click();
  for (const recherche of [c.email, compte!.rpps]) {
    await support.getByLabel("Nom, cabinet, email, téléphone, RPPS ou SIRET").fill(recherche);
    await support.getByRole("button", { name: "Rechercher" }).click();
    await expect(support.getByRole("listitem").filter({ hasText: c.email })).toContainText("Droits actifs");
  }
  expect(Date.now() - debut).toBeLessThan(15_000); // SC-007
  await expect(support.locator("main").getByRole("button").filter({ hasNotText: "Rechercher" })).toHaveCount(0);
  await expect(support.getByRole("heading", { name: "Règles en vigueur" })).toBeVisible();
  await verifierAccessibilite(support);

  await ecranDemo(browser, baseURL, "/admin/demonstration/fidelite", async (admin) => {
    await admin.getByLabel("Client (référence Odoo)").nth(1).fill(c.partenaireRef);
    const fin = new Date(Date.now() + 400 * 24 * 3600_000).toISOString().slice(0, 10);
    await admin.getByLabel("Nouvelle date de fin").fill(fin);
    await admin.getByLabel("Motif (obligatoire)").nth(1).fill("Geste commercial après une panne");
    await admin.getByRole("button", { name: "Enregistrer les droits" }).click();
    await expect(admin.getByRole("status").first()).toBeVisible();
  });
  await support.reload();
  await expect(support.getByRole("listitem").filter({ hasText: c.email })).toContainText("Geste commercial après une panne");
  await contexte.close();
});
