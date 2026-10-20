import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { CARTE_SD, ajouterDepuisFiche, clientConnecte, ecranDemo, reapprovisionner, requete } from "./outils";

// T028 (US8, FR-030 à FR-034, SC-010, A4) : vente flash créée au démonstrateur → bandeau et fiche
// (prix d'origine, prix remisé HT, fin), appliquée au panier avec la règle de cumul ; terminée
// pendant qu'un article est au panier → prix en vigueur et client informé ; plus affichée.

test.describe.configure({ timeout: 240_000, mode: "serial" });
const FICHE_SD = "/accessoires-consommables/dms-carte-sd";

test("vente flash : annoncée, appliquée, puis terminée", async ({ page, browser, baseURL }) => {
  const nom = `Vente flash cartes SD ${Date.now() % 100000} (−20 %)`;
  await reapprovisionner([CARTE_SD]);
  const fin = new Date(Date.now() + 2 * 24 * 3600_000);
  const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
  // La vente flash ne doit jamais survivre au test (elle fausserait les prix des autres parcours).
  const terminer = () => requete("demo", `UPDATE loyalty_promotion SET fin = now() WHERE nom = $1 AND (fin IS NULL OR fin > now())`, [nom]);
  try {
  await ecranDemo(browser, baseURL, "/admin/demonstration/fidelite", async (admin) => {
    await admin.getByLabel("Nom", { exact: true }).fill(nom);
    await admin.getByLabel("Remise (%)").fill("20");
    await admin.getByLabel(/Références concernées/).fill(CARTE_SD);
    await admin.getByLabel("Fin", { exact: true }).fill(local(fin));
    await admin.getByRole("button", { name: "Créer la promotion" }).click();
    await expect(admin.getByRole("status").filter({ hasText: "Promotion créée" })).toBeVisible({ timeout: 20_000 });
  });
  } catch (e) {
    await terminer();
    throw e;
  }

  try {
    await clientConnecte(browser, baseURL, page);
    await page.goto(FICHE_SD);
    const promo = page.getByRole("region", { name: "Promotion sur ce produit" });
    await expect(promo).toContainText(nom);
    await expect(promo).toContainText(/25,00\s€\sHT\s+20,00\s€\sHT/);
    await expect(promo).toContainText("Jusqu’au");
    await expect(page.getByRole("region", { name: "Promotion en cours" })).toContainText(nom, { timeout: 60_000 }); // bandeau, en rotation
    await verifierAccessibilite(page);

    await ajouterDepuisFiche(page, `${FICHE_SD}?config=${CARTE_SD}`);
    await page.goto("/panier");
    const ligne = page.getByRole("listitem").filter({ hasText: `Réf. ${CARTE_SD}` });
    await expect(ligne).toContainText(nom);
    await expect(page.locator("main")).toContainText("Un seul code promo par commande.");
  } catch (e) {
    await terminer();
    throw e;
  } finally {
    await ecranDemo(browser, baseURL, "/admin/demonstration/fidelite", async (admin) => {
      await admin.getByRole("button", { name: `Terminer « ${nom} »` }).click();
      await expect(admin.getByRole("status").filter({ hasText: "Promotion terminée" })).toBeVisible();
    });
  }

  await page.goto("/panier");
  const ligne = page.getByRole("listitem").filter({ hasText: `Réf. ${CARTE_SD}` });
  await expect(ligne).toContainText(`La promotion « ${nom} » est terminée : le prix en vigueur s’applique.`);
  await expect(ligne).toContainText("25,00");
  await page.goto(FICHE_SD);
  await expect(page.getByRole("region", { name: "Promotion sur ce produit" })).toHaveCount(0);
  const [terminee] = await requete<{ n: number }>("demo", `SELECT count(*)::int AS n FROM loyalty_promotion WHERE nom = $1 AND fin <= now()`, [nom]);
  expect(terminee!.n).toBe(1);
});
