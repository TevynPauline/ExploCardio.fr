import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { acheterHolterCloud, clientConnecte, requete } from "./outils";

// T016 (US3, FR-012 à FR-014, SC-005, SC-010) : états et dates, « Accéder à la plateforme » dans
// un nouvel onglet (page simulée), aide et WhatsApp, offre pour un client sans logiciel, aucun
// mot de passe ; axe-core.

test.describe.configure({ timeout: 240_000 });

test("rubrique « Mes logiciels Cloud » : accès actif, lien vers la plateforme simulée, aide et WhatsApp", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await page.goto("/mon-compte/logiciels");
  await expect(page.getByRole("heading", { name: "Nos logiciels Cloud" })).toBeVisible();
  await acheterHolterCloud(page, c.email);
  await page.goto("/mon-compte/logiciels");
  const logiciel = page.getByRole("listitem", { name: /Logiciel CardioScan/ });
  await expect(logiciel).toContainText("Actif");
  await expect(logiciel).toContainText(/Depuis le \d+ \S+ \d{4}/);
  const lien = logiciel.getByRole("link", { name: "Accéder à la plateforme (nouvel onglet)" });
  await expect(lien).toHaveAttribute("target", "_blank");
  await expect(page.getByRole("heading", { name: "Première connexion et paramétrage" })).toBeVisible();
  await expect(page.locator("main").getByRole("link", { name: "Écrire sur WhatsApp" })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/mot de passe\s*:/i);
  await verifierAccessibilite(page);

  const [onglet] = await Promise.all([page.context().waitForEvent("page"), lien.click()]);
  await onglet.waitForLoadState();
  await expect(onglet.getByRole("heading", { name: "Plateforme Cloud simulée" })).toBeVisible();
  await onglet.close();

  // SC-005 : rien qui ressemble à un mot de passe ou à une donnée de patient dans le registre.
  const lignes = await requete<{ t: string }>("site", `SELECT row_to_json(a)::text AS t FROM acces_logiciel a WHERE "partenaireRef" = $1`, [c.partenaireRef]);
  expect(lignes.map((l) => l.t).join(" ")).not.toMatch(/password|mot_de_passe|patient/i);
});
