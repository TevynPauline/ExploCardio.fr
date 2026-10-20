import { expect, test } from "@playwright/test";
import { motifDeBlocage } from "../../src/connecteurs/garde-reseau";
import { COMPTES, connecterNavigateur } from "./session";

// T048 (SC-003, SC-014, FR-033) : pendant les parcours disponibles, aucune requête du navigateur
// ne vise Odoo, Stripe, la plateforme PCA, l'outil d'emailing ni Google Fonts, et aucune page
// de démonstration ne contient de lien d'appel ou WhatsApp vers un vrai numéro.
// Chaque module (F01 à F10) ajoute ses pages à cette liste.

const PAGES_PUBLIQUES = [
  "/",
  "/connexion",
  "/demo/contact?moyen=appel",
  "/catalogue",
  "/holter-ecg",
  "/holter-tensionnel",
  "/epreuve-effort",
  "/accessoires-consommables",
  "/services/assistance",
  "/qui-sommes-nous",
  "/recherche?q=oscar",
  "/cookies",
  "/inscription",
  "/mot-de-passe-oublie",
  "/holter-tensionnel/suntech-oscar-2",
  "/accessoires-consommables/electrodes-holter",
  "/holter-ecg/ecg-de-repos",
  "/services/installation-formation",
  "/services/hebergement-donnees-sante",
  "/panier",
  "/mise-a-disposition",
];
const PAGES_MON_COMPTE = ["/mon-compte", "/mon-compte/informations", "/mon-compte/adresses", "/mon-compte/preferences", "/mon-compte/securite", "/mon-compte/donnees", "/mon-compte/commandes", "/mon-compte/factures", "/mon-compte/locations", "/mon-compte/financements", "/mon-compte/bons-achat", "/mon-compte/assistance", "/mon-compte/logiciels", "/financement/demande?article=EC-DMS-3004L"];
const PAGES_BACK_OFFICE = ["/admin", "/admin/contenus", "/admin/contenus/tuiles", "/admin/comptes", "/admin/comptes/demandes", "/admin/comptes/reglages", "/admin/comptes/rgpd", "/admin/catalogue", "/admin/catalogue/EC-SUN-OSCAR2", "/admin/catalogue/services", "/admin/commandes", "/admin/financements", "/admin/demonstration/paiements", "/admin/locations", "/admin/demonstration/locations", "/admin/assistance?q=demo", "/admin/demonstration/fidelite", "/admin/logiciels-cloud?q=demo", "/admin/devis"];

const demo = { CONNECTOR_ODOO: "demo", CONNECTOR_STRIPE: "demo", CONNECTOR_PCA: "demo", CONNECTOR_EMAILING: "demo" };

test("aucune requête ne sort vers un service réel ni vers Google Fonts", async ({ page, context }) => {
  test.setTimeout(360_000);
  const bloquees: string[] = [];
  page.on("request", (requete) => {
    if (motifDeBlocage(requete.url(), demo)) bloquees.push(requete.url());
  });

  for (const chemin of PAGES_PUBLIQUES) {
    await page.goto(chemin);
    await page.waitForLoadState("networkidle");
  }
  await connecterNavigateur(context, COMPTES.clientSansDroits);
  for (const chemin of PAGES_MON_COMPTE) {
    await page.goto(chemin);
    await page.waitForLoadState("networkidle");
  }
  await connecterNavigateur(context, COMPTES.admin);
  for (const chemin of PAGES_BACK_OFFICE) {
    await page.goto(chemin);
    await page.waitForLoadState("networkidle");
  }
  expect(bloquees).toEqual([]);
});

test("aucun lien d'appel ou WhatsApp vers un vrai numéro en démonstration (FR-033)", async ({ page }) => {
  test.setTimeout(120_000);
  for (const chemin of PAGES_PUBLIQUES) {
    await page.goto(chemin);
    const liens = await page.locator('a[href^="tel:"], a[href*="wa.me"], a[href*="api.whatsapp.com"]').count();
    expect(liens, chemin).toBe(0);
  }
});
