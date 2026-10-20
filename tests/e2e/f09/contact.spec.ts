import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { clientConnecte, ELECTRODES } from "../f04/outils";
import { requete } from "../bases";

// T005 (US1, FR-001 à FR-007, SC-001, SC-006, SC-007) : le contact est partout, avec horaires,
// boutons explicites et mention sur les données de patients ; en démonstration, personne n'est
// contacté ; bloc de contact dans les emails.

test.describe.configure({ timeout: 180_000 });

async function verifierContact(page: import("@playwright/test").Page, zone: import("@playwright/test").Locator) {
  const appeler = zone.getByRole("link", { name: /^Appeler/ });
  const ecrire = zone.getByRole("link", { name: /^Écrire sur WhatsApp/ });
  await expect(appeler).toHaveAttribute("href", "/demo/contact?moyen=appel"); // SC-007
  await expect(ecrire).toHaveAttribute("href", "/demo/contact?moyen=whatsapp");
  await expect(appeler).toHaveAccessibleName(/ouvre votre téléphone/);
  await expect(ecrire).toHaveAccessibleName(/ouvre WhatsApp/);
  await expect(zone).toContainText("Ne transmettez aucune donnée patient.");
  await expect(zone).toContainText(/hors jours fériés/);
  await expect(zone).toContainText(/Nous vous répond/);
  void page;
}

test("pied de page, page Assistance, fiche produit et centre d'aide : numéro, horaires, boutons, mention", async ({ page }) => {
  const debut = Date.now();
  await page.goto("/");
  await verifierContact(page, page.getByRole("contentinfo").getByRole("region", { name: "Contact rapide" }));
  expect(Date.now() - debut).toBeLessThan(10_000); // SC-006
  for (const chemin of ["/services/assistance", ELECTRODES, "/aide"]) {
    await page.goto(chemin);
    await verifierContact(page, page.locator("main").getByRole("region", { name: "Contacter l’équipe" }));
  }
  await verifierAccessibilite(page);
  await page.locator("main").getByRole("link", { name: /^Écrire sur WhatsApp/ }).click();
  await expect(page.getByRole("heading", { name: "Discussion WhatsApp non lancé" })).toBeVisible();
});

test("Mon compte : le contact ; un email transactionnel contient le bloc de contact", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await page.goto("/mon-compte");
  await verifierContact(page, page.locator("main").getByRole("region", { name: "Contacter l’équipe" }));
  const [email] = await requete<{ rendu: string }>("site", `SELECT rendu FROM message_demonstration WHERE destinataire = $1 ORDER BY date DESC LIMIT 1`, [c.email]);
  expect(email?.rendu ?? "").toContain("Écrire sur WhatsApp");
  expect(email?.rendu ?? "").toContain("Ne transmettez aucune donnée patient");
});

test("mobile : boutons de 44 px au moins", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/services/assistance");
  for (const nom of [/^Appeler/, /^Écrire sur WhatsApp/]) {
    const boite = await page.locator("main").getByRole("link", { name: nom }).boundingBox();
    expect(boite!.height).toBeGreaterThanOrEqual(44);
  }
});
