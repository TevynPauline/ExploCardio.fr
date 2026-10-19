import { expect, test } from "@playwright/test";
import { COMPTES, connecterNavigateur } from "../session";
import { PANIER_1200, clientConnecte, composerPanier, payerParCarte } from "./outils";

// T032 : pages de F06 de 320 à 1 920 px sans défilement horizontal.

test.describe.configure({ timeout: 300_000 });

async function sansDefilement(page: import("@playwright/test").Page, chemins: string[]) {
  const fautes: string[] = [];
  for (const largeur of [320, 390, 820, 1280, 1920]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    for (const chemin of chemins) {
      await page.goto(chemin);
      if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) fautes.push(`${chemin} à ${largeur} px`);
    }
  }
  return fautes;
}

test("pages client de F06", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await composerPanier(page, c.email, PANIER_1200);
  await payerParCarte(page);
  const confirmation = new URL(page.url()).pathname;
  await composerPanier(page, c.email, { "EC-DMS-SD-8GO": 2 });
  expect(await sansDefilement(page, ["/panier", confirmation, "/mon-compte/bons-achat", "/mon-compte/assistance", "/accessoires-consommables/electrodes-holter"])).toEqual([]);
});

test("back-office de F06", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  expect(await sansDefilement(page, ["/admin/assistance?q=demo", "/admin/demonstration/fidelite"])).toEqual([]);
});
