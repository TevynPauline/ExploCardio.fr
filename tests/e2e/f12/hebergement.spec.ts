import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { COMPTES, connecterNavigateur } from "../session";
import { requete } from "./outils";

// T025 (US6, FR-023 à FR-025) : badge « En préparation », aucune souscription, formulaire
// d'intérêt → confirmation, demande enregistrée (back-office, opportunité) ; badge retiré → offre.

test.describe.configure({ mode: "serial" });
const PAGE = "/services/hebergement-donnees-sante";

test("offre en préparation : badge, formulaire d'intérêt enregistré", async ({ page }) => {
  await page.goto(PAGE);
  await expect(page.locator("main")).toContainText("En préparation");
  await expect(page.getByRole("button", { name: /Souscrire|Ajouter au panier/ })).toHaveCount(0);
  await verifierAccessibilite(page);
  const email = `interet-${Date.now()}@demo.explocardio.test`;
  await page.waitForTimeout(3500); // délai minimal anti-robots des formulaires
  await page.getByLabel("Votre besoin (logiciels utilisés, nombre de médecins…)").fill("CardioScan pour trois cardiologues");
  await page.getByLabel("Nom", { exact: true }).fill("Dr Intérêt Test");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Être informé de l’ouverture" }).click();
  await expect(page.getByRole("status").filter({ hasText: "votre intérêt est enregistré" })).toBeVisible();
  const [d] = await requete<{ objet: string; opportuniteRef: string | null }>("site", `SELECT objet, "opportuniteRef" FROM demande_devis WHERE demandeur->>'email' = $1`, [email]);
  expect(d).toMatchObject({ objet: "Hébergement des données de santé — intérêt", opportuniteRef: expect.any(String) });
});

test("badge retiré : l'offre est présentée normalement, sans formulaire d'intérêt", async ({ page, context }) => {
  // Le badge se règle dans Back-office → Contenus → Coordonnées et textes (cache invalidé aussitôt).
  await connecterNavigateur(context, COMPTES.admin);
  const badge = async (valeur: string) => {
    await page.goto("/admin/contenus/coordonnees");
    await page.getByLabel("Badge « Hébergement des données de santé »").fill(valeur);
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.locator("main").getByRole("status")).toBeVisible();
  };
  await badge("");
  try {
    await page.goto(PAGE);
    await expect(page.getByRole("heading", { name: "Être informé de l’ouverture" })).toHaveCount(0);
    await expect(page.locator("main").getByRole("link", { name: "Mes logiciels Cloud" })).toBeVisible();
  } finally {
    await badge("En préparation");
  }
});
