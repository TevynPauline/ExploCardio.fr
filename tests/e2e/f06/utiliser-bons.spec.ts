import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { CARTE_SD, CARTON, clientConnecte, composerPanier, ecranDemo, payerParCarte } from "./outils";

// T016 (US3, FR-012, D1) : 120 € crédités au démonstrateur ; 50 € utilisés → reste 70 € ;
// solde supérieur au panier → seul le montant éligible est débité.

test.describe.configure({ timeout: 240_000 });

async function crediter(browser: import("@playwright/test").Browser, baseURL: string | undefined, partenaireRef: string, montant: string) {
  await ecranDemo(browser, baseURL, "/admin/demonstration/fidelite", async (admin) => {
    await admin.getByLabel("Client (référence Odoo)").first().fill(partenaireRef);
    await admin.getByLabel("Montant HT (€)").fill(montant);
    await admin.getByLabel("Motif (obligatoire)").first().fill("Geste commercial (test)");
    await admin.getByRole("button", { name: "Ajuster la cagnotte" }).click();
    await expect(admin.getByRole("status").first()).toBeVisible();
  });
}

test("50 € utilisés sur 120 € : déduits au paiement, reste 70 €", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await crediter(browser, baseURL, c.partenaireRef, "120,00");
  await composerPanier(page, c.email, { [CARTON]: 1 });
  await page.goto("/panier");
  const bons = page.getByRole("region", { name: "Bons d’achat" });
  await expect(bons).toContainText("Solde disponible : 120,00 € HT");
  await bons.getByLabel(/Montant à utiliser/).fill("50,00");
  await bons.getByRole("button", { name: "Utiliser mes bons" }).click();
  await expect(bons.getByRole("status")).toContainText("50,00 € HT de bons appliqués");
  await verifierAccessibilite(page);

  await payerParCarte(page);
  await page.goto("/mon-compte/bons-achat");
  await expect(page.locator("main")).toContainText("70,00 € HT");
  await expect(page.getByRole("row", { name: /Utilisation/ })).toContainText("-50,00");
});

test("solde supérieur au panier : seul le montant des achats est débité", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await crediter(browser, baseURL, c.partenaireRef, "120,00");
  await composerPanier(page, c.email, { [CARTE_SD]: 4 });
  await page.goto("/panier");
  const bons = page.getByRole("region", { name: "Bons d’achat" });
  await bons.getByRole("button", { name: "Utiliser mes bons" }).click();
  await expect(bons.getByRole("status")).toContainText("100,00 € HT de bons appliqués");
  await payerParCarte(page);
  await page.goto("/mon-compte/bons-achat");
  await expect(page.locator("main")).toContainText("20,00 € HT");
});
