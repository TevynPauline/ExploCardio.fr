import { expect, test } from "@playwright/test";
import { COMPTES, connecterNavigateur } from "../session";
import { ELECTRODES, HOLTER, ajouterDepuisFiche, clientConnecte, requete } from "./outils";

// T037 (SC-008, FR-044) : pages de F04 de 320 à 1 920 px ; aucune donnée de carte dans les
// tables et journaux du site.

test.describe.configure({ timeout: 300_000 });

const LARGEURS = [320, 390, 820, 1280, 1920];

async function sansDefilement(page: import("@playwright/test").Page, chemins: string[]) {
  const fautes: string[] = [];
  for (const largeur of LARGEURS) {
    await page.setViewportSize({ width: largeur, height: 900 });
    for (const chemin of chemins) {
      await page.goto(chemin);
      if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) fautes.push(`${chemin} à ${largeur} px`);
    }
  }
  return fautes;
}

test("pages client de F04 (panier, tunnel, Mon compte, financement) sans défilement horizontal", async ({ page, browser, baseURL }) => {
  const client = await clientConnecte(browser, baseURL, page);
  await ajouterDepuisFiche(page, ELECTRODES);
  await ajouterDepuisFiche(page, HOLTER, "mise_a_disposition");
  await page.goto("/panier");
  await page.getByRole("link", { name: "Commander" }).click();
  await page.waitForURL(/\/commande\/adresses/);
  const [commande] = await requete<{ ref: string }>("site", `SELECT c.ref FROM commande_site c JOIN compte_client k ON k.id = c."compteId" WHERE k."odooPartnerRef" = $1`, [client.partenaireRef]);
  const ref = commande!.ref;
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForURL(/\/commande\/livraison/);
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForURL(/\/commande\/paiement/);
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.waitForURL(/\/commande\/recapitulatif/);
  const fautes = await sansDefilement(page, [
    "/panier",
    ...["adresses", "livraison", "paiement", "recapitulatif"].map((e) => `/commande/${e}?ref=${ref}`),
    "/mon-compte/commandes",
    "/mon-compte/factures",
    "/mon-compte/locations",
    "/mon-compte/financements",
    "/financement/demande?article=EC-DMS-3004L",
  ]);
  expect(fautes).toEqual([]);
});

test("back-office de F04 sans défilement horizontal", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  expect(await sansDefilement(page, ["/admin/commandes", "/admin/financements", "/admin/demonstration/paiements"])).toEqual([]);
});

/** Numéro de carte plausible : 13 à 19 chiffres, clé de Luhn valide, pas un horodatage en millisecondes. */
function ressembleACarte(brut: string): boolean {
  const n = brut.replace(/[ -]/g, "");
  if (n.length < 13 || n.length > 19 || /^(\d)\1+$/.test(n)) return false; // suite d'un même chiffre : IBAN fictif
  if (/^\d{14}$/.test(brut)) return false; // SIRET (14 chiffres, même clé de Luhn)
  if (n.length === 13 && Number(n) > 1.5e12 && Number(n) < 2.2e12) return false;
  let somme = 0;
  for (let i = 0; i < n.length; i++) {
    let d = Number(n[n.length - 1 - i]);
    if (i % 2 === 1) d = d * 2 > 9 ? d * 2 - 9 : d * 2;
    somme += d;
  }
  return somme % 10 === 0;
}

test("SC-008 : aucune donnée de carte dans les tables et le journal du site", async () => {
  for (const t of ["commande_site", "journal_action", "panier", "ligne_panier", "demande_financement", "message_demonstration"]) {
    const lignes = await requete<{ texte: string }>("site", `SELECT row_to_json(x)::text AS texte FROM ${t} x`);
    const fautes = lignes.flatMap(({ texte }) => [
      ...(texte.match(/\b(?:\d[ -]?){12,18}\d\b/g) ?? []).filter(ressembleACarte),
      ...(/"(cvc|cvv|card_number|numeroCarte|pan)"/.test(texte) ? ["champ de carte"] : []),
    ]);
    expect(fautes, t).toEqual([]);
  }
});
