import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { COMPTES, connecterNavigateur } from "../session";
import { requete } from "./outils";

// T040 (US8, FR-002, FR-034, FR-035). Réglages remis en état en fin de test.

test.describe.configure({ mode: "serial", timeout: 120_000 });

const PAGES = [
  { chemin: "/services/hebergement-donnees-sante", titre: /Hébergement/ },
  { chemin: "/services/assistance", titre: /Assistance/ },
  { chemin: "/financement", titre: /Financement/ },
  { chemin: "/services/installation-formation", titre: /Installation et formation/ },
];

test("quatre pages services : offre, bouton d'action vers le contact avec le motif", async ({ page }) => {
  for (const p of PAGES) {
    await page.goto(p.chemin);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(p.titre);
    await verifierAccessibilite(page);
    const action = page.locator("main a.ec-btn--primary").first();
    // Contact avec motif, ou appel / WhatsApp (page de démonstration) pour l'assistance.
    await expect(action).toHaveAttribute("href", /\/qui-sommes-nous\?motif=|\/demo\/contact\?moyen=/);
  }
  await page.goto("/services");
  await expect(page.locator("main").getByRole("link", { name: /Installation et formation/ })).toBeVisible();
});

test("hébergement « En préparation » sans souscription ; badge retiré et tarif affiché depuis le back-office", async ({ page, browser, baseURL }) => {
  await page.goto("/services/hebergement-donnees-sante");
  await expect(page.locator("main")).toContainText("En préparation");
  await expect(page.locator("main")).not.toContainText(/€ HT/);

  const equipe = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  await connecterNavigateur(equipe, COMPTES.admin);
  const admin = await equipe.newPage();
  const [avant] = await requete<{ valeur: string }>("site", `SELECT valeur FROM parametre WHERE cle = 'accueil.badge_hebergement'`);
  try {
    await admin.goto("/admin/catalogue/services");
    await verifierAccessibilite(admin);
    await admin.getByLabel(/Badge de la page/).fill("");
    await admin.getByLabel("Tarif HT standard : Installation et formation").fill("490,00");
    await admin.getByRole("button", { name: "Enregistrer" }).click();
    await expect(admin.getByRole("status").filter({ hasText: "Réglages enregistrés." })).toBeVisible();

    await page.goto("/services/hebergement-donnees-sante");
    await expect(page.locator("main")).not.toContainText("En préparation");
    await page.goto("/services/installation-formation");
    await expect(page.locator("main")).toContainText("490,00 € HT");
    await expect(page.locator("main")).toContainText("588,00 € TTC");
  } finally {
    await admin.goto("/admin/catalogue/services");
    await admin.getByLabel(/Badge de la page/).fill(avant?.valeur ?? "En préparation");
    await admin.getByLabel("Tarif HT standard : Installation et formation").fill("");
    await admin.getByRole("button", { name: "Enregistrer" }).click();
    await expect(admin.getByRole("status").filter({ hasText: "Réglages enregistrés." })).toBeVisible({ timeout: 20_000 });
    await equipe.close();
  }
});
