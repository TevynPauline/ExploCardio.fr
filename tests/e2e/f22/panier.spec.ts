import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { ELECTRODES, HOLTER, ajouterDepuisFiche } from "../f04/outils";
import { centimes, verifierPrixTtcDabord } from "./outils";

// T013 — panier en TTC d'abord ; somme des lignes = total TTC à payer (F22, US2, FR-010 à FR-012).

test.describe.configure({ timeout: 120_000 });

test("lignes en TTC d'abord ; « Total TTC à payer » mis en avant ; somme des lignes et du port = total", async ({ page }) => {
  await ajouterDepuisFiche(page, ELECTRODES);
  await ajouterDepuisFiche(page, "/holter-ecg/dms-300-4l");
  await page.goto("/panier");
  const unique = page.locator("section", { has: page.getByRole("heading", { name: "Paiement unique" }) });
  await verifierPrixTtcDabord(unique, 2);
  const total = unique.locator("[data-total-ttc]");
  await expect(total).toContainText("Total TTC à payer");
  await expect(total.locator("dd")).toHaveClass(/text-h2/);
  // Ordre : détail HT et TVA avant le total à payer.
  const texte = await unique.locator("dl").innerText();
  expect(texte.indexOf("Total HT")).toBeLessThan(texte.indexOf("TVA"));
  expect(texte.indexOf("TVA")).toBeLessThan(texte.indexOf("Total TTC à payer"));

  const lignes = await unique.locator("[data-total-ligne] [data-prix-ttc]").evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-prix-ttc"))));
  const livraison = await unique.locator("dl div", { hasText: "Livraison HT" }).locator("dd").innerText();
  const portTtc = Math.round(centimes(livraison) * 1.2);
  expect(lignes.reduce((s, x) => s + x, 0) + portTtc).toBe(centimes(await total.locator("dd").innerText()));
  await verifierAccessibilite(page);
});

test("mise à disposition au panier : premier mois et mois suivants en TTC d'abord", async ({ page }) => {
  await ajouterDepuisFiche(page, HOLTER, "mise_a_disposition");
  await page.goto("/panier");
  const mensuel = page.locator("section", { has: page.getByRole("heading", { name: "Abonnement mensuel" }) });
  await verifierPrixTtcDabord(mensuel, 2);
  await expect(mensuel).toContainText(/Mois suivants.*TTC \/ mois/s);
});
