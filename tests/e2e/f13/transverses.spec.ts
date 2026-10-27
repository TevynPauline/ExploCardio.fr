import { expect, test, type Page } from "@playwright/test";
import { COMPTES, connecterNavigateur } from "../session";

// T026 — contrôles transverses de F13 : pages du back-office de 768 à 1 920 px sans défilement
// horizontal ; chaque écran à texte libre ou à ajout d'image affiche le rappel « aucune donnée
// de patient » (FR-035).

test.describe.configure({ timeout: 900_000 });

const PAGES = [
  "/admin",
  "/admin/clients?statut=tous",
  "/admin/demandes",
  "/admin/demandes/messages?etat=tous",
  "/admin/demandes/ouverture",
  "/admin/devis?etat=tous",
  "/admin/financements",
  "/admin/catalogue",
  "/admin/catalogue/EC-SUN-OSCAR2",
  "/admin/catalogue/services",
  "/admin/contenus",
  "/admin/contenus/bandeau",
  "/admin/contenus/carrousel",
  "/admin/contenus/accueil",
  "/admin/contenus/marques",
  "/admin/contenus/coordonnees",
  "/admin/contenus/pages",
  "/admin/contenus/pages/assistance",
  "/admin/contenus/aide/nouveau",
  "/admin/emails/campagnes",
  "/admin/emails/modeles/commande_confirmee",
  "/admin/parametres",
  "/admin/parametres?theme=contact",
  "/admin/parametres?theme=comptes",
  "/admin/parametres/bienvenue",
  "/admin/equipe",
  "/admin/journal",
  "/admin/journal?onglet=actions",
];

async function premiereFiche(page: Page, liste: string): Promise<string | null> {
  await page.goto(liste);
  // Liste éventuellement vide : ne pas attendre un lien qui n'existe pas.
  const liens = page.locator("main table tbody a, main ul a");
  return (await liens.count()) ? liens.first().getAttribute("href") : null;
}

test("largeurs de 768 à 1 920 px sans défilement horizontal", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  const fautes: string[] = [];
  for (const largeur of [768, 1024, 1280, 1920]) {
    await page.setViewportSize({ width: largeur, height: 900 });
    for (const chemin of PAGES) {
      await page.goto(chemin);
      if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) fautes.push(`${chemin} à ${largeur} px`);
    }
  }
  expect(fautes).toEqual([]);
});

test("rappel « aucune donnée de patient » sur chaque écran à texte libre ou à image", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  const fiches = [await premiereFiche(page, "/admin/clients?statut=tous"), await premiereFiche(page, "/admin/financements")].filter((h): h is string => !!h?.startsWith("/admin/"));
  const sans: string[] = [];
  let controles = 0;
  for (const chemin of [...PAGES, ...fiches]) {
    await page.goto(chemin);
    const main = page.locator("main");
    if ((await main.locator("textarea, input[type=file]").count()) === 0) continue;
    controles++;
    if (!/aucune donnée de patient/i.test(await main.innerText())) sans.push(chemin);
  }
  expect(controles).toBeGreaterThan(8);
  expect(sans).toEqual([]);
});
