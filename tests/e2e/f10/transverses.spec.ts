import { expect, test } from "@playwright/test";
import { signerJeton } from "@/domaine/emailing/jetons";
import { COMPTES, connecterNavigateur } from "../session";

// T031 : pages de F10 de 320 à 1 920 px sans défilement horizontal de la page.

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

test("page de préférences sans connexion", async ({ page }) => {
  const jeton = encodeURIComponent(signerJeton("client.droits@demo.explocardio.test"));
  expect(await sansDefilement(page, [`/preferences/${jeton}`, `/preferences/${jeton}?desinscrire=newsletter`])).toEqual([]);
});

test("préférences de « Mon compte »", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.clientDroits);
  expect(await sansDefilement(page, ["/mon-compte/preferences"])).toEqual([]);
});

test("back-office de F10", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  expect(
    await sansDefilement(page, ["/admin/emails", "/admin/emails/scenarios", "/admin/emails/modeles", "/admin/emails/modeles/commande_confirmee", "/admin/emails/campagnes", "/admin/demonstration/emails"]),
  ).toEqual([]);
});
