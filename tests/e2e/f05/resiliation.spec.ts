import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { demoLocations, expedierEtLivrer, louer, rendreParcDesTests, requete } from "./outils";

// T025 (US4, FR-021 à FR-024, SC-002, SC-007) : résilier en moins de 2 minutes, étiquette,
// prolonger, retour enregistré (complet puis avec dégradation).

test.describe.configure({ timeout: 300_000, mode: "serial" });
test.beforeEach(rendreParcDesTests);

test("résilier, télécharger l'étiquette, prolonger, résilier à nouveau, retour enregistré", async ({ page, browser, baseURL }) => {
  const { client, ref } = await louer(page, browser, baseURL);
  await expedierEtLivrer(browser, baseURL, ref);

  const debut = Date.now();
  await page.goto("/mon-compte/locations");
  await page.getByRole("link", { name: `Résilier la location ${ref}` }).click();
  await page.waitForURL(/\/resilier$/);
  await verifierAccessibilite(page);
  await expect(page.locator("main")).toContainText("Fin de la location");
  await expect(page.locator("main")).toContainText("Retour de l’appareil");
  await page.getByRole("button", { name: "Confirmer la résiliation" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Votre résiliation est enregistrée" })).toBeVisible();
  expect(Date.now() - debut).toBeLessThan(120_000); // SC-007
  const carte = page.getByRole("listitem", { name: `Location ${ref}` });
  await expect(carte).toContainText("Résiliation prévue");
  await expect(carte).toContainText("Retour de l’appareil avant le");
  await expect.poll(async () => (await requete("site", `SELECT 1 FROM message_demonstration WHERE destinataire = $1 AND objet = 'Votre résiliation est enregistrée'`, [client.email])).length).toBe(1);

  // Étiquette préaffranchie, redemandable.
  const lien = carte.getByRole("link", { name: /Étiquette de retour/ });
  for (let i = 0; i < 2; i++) {
    const r = await page.request.get((await lien.getAttribute("href"))!);
    expect(r.status()).toBe(200);
    expect(r.headers()["content-type"]).toBe("application/pdf");
  }

  await carte.getByRole("button", { name: `Prolonger la location ${ref}` }).click();
  await expect(page.getByRole("status").filter({ hasText: "Votre location continue" })).toBeVisible();
  await expect(page.getByRole("listitem", { name: `Location ${ref}` })).toContainText("En cours");

  await page.getByRole("link", { name: `Résilier la location ${ref}` }).click();
  await page.getByRole("button", { name: "Confirmer la résiliation" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Votre résiliation est enregistrée" })).toBeVisible();

  await demoLocations(browser, baseURL, async (admin) => {
    const ligne = admin.getByRole("listitem", { name: `Location ${ref}` });
    await ligne.getByLabel(`État constaté (${ref})`).selectOption("degrade");
    await ligne.getByLabel(`Dégradation HT (${ref})`).fill("80,00");
    await ligne.getByRole("button", { name: "Enregistrer le retour" }).click();
    await expect(admin.getByRole("status").filter({ hasText: `Retour enregistré pour ${ref}` })).toBeVisible();
  });
  await page.reload();
  const terminee = page.getByRole("region", { name: "Locations terminées" }).getByRole("listitem", { name: `Location ${ref}` });
  await expect(terminee).toContainText("Terminée");
  const email = await requete<{ rendu: string }>("site", `SELECT rendu FROM message_demonstration WHERE destinataire = $1 AND objet = 'Nous avons reçu votre appareil'`, [client.email]);
  expect(email[0]!.rendu).toContain("80,00");
});
