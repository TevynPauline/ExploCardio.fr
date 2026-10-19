import { expect, test } from "@playwright/test";
import { COMPTES, connecterNavigateur } from "../session";
import { louer, rendreParcDesTests } from "./outils";

// T037 (FR-042, SC-011) : pages de F05 de 320 à 1 920 px sans défilement horizontal.

test.describe.configure({ timeout: 300_000 });
test.beforeEach(rendreParcDesTests);

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

test("pages client de F05", async ({ page, browser, baseURL }) => {
  const { ref } = await louer(page, browser, baseURL);
  expect(await sansDefilement(page, ["/mise-a-disposition", "/mon-compte/locations", "/holter-tensionnel/suntech-oscar-2?formule=mise-a-disposition"])).toEqual([]);
  void ref;
});

test("back-office de F05", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  expect(await sansDefilement(page, ["/admin/locations", "/admin/demonstration/locations", "/admin/contenus/coordonnees"])).toEqual([]);
});
