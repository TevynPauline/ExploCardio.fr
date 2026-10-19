import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { libelleJour, premiereDateLivraison } from "@/domaine/location/calendrier";
import { accepterConditions, clientConnecte, locationsDe, parametre, payerSurPageDemo, rendreParcDesTests, requete } from "./outils";

// T012 (US1, FR-005 à FR-011, SC-001, SC-004) : « Dépannage express », date de livraison,
// récapitulatif complet, paiement du premier mois, location commandée.

test.describe.configure({ timeout: 240_000, mode: "serial" });
test.beforeEach(rendreParcDesTests);

const regles = (heureLimite: string) => ({ heureLimite, joursNonLivres: [], zonesSansLendemain: ["20"], delaiZonesJours: 2 });

test("dépannage commandé : date au plus tôt, récapitulatif, paiement SEPA, location commandée", async ({ page, browser, baseURL }) => {
  const retablir = await parametre("commande.heure_limite_express", "23:59");
  try {
    const debut = Date.now();
    const c = await clientConnecte(browser, baseURL, page);
    await page.goto("/mise-a-disposition");
    await verifierAccessibilite(page);
    const main = page.locator("main");
    await expect(main.getByRole("heading", { name: "Équipements disponibles en dépannage" })).toBeVisible();
    const carte = main.getByRole("listitem", { name: /SunTech Oscar 2/ }).first();
    await expect(carte).toContainText("Premier mois");
    await expect(carte).toContainText(/HT/);
    await expect(carte).toContainText(/TTC/);
    const attendue = premiereDateLivraison(new Date(), regles("23:59"), "69003");
    const demain = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    if (attendue === demain) await expect(carte).toContainText("Livraison demain");
    await carte.getByRole("link", { name: /Choisir/ }).click();
    await page.waitForURL(/formule=mise-a-disposition/);
    await page.getByTestId("panneau-formule").getByRole("button", { name: "Ajouter la mise à disposition au panier" }).click();
    await page.locator("main").getByRole("status").filter({ hasText: "Ajouté au panier" }).first().waitFor();

    await page.goto("/panier");
    await page.getByRole("link", { name: "Commander" }).click();
    await page.waitForURL(/\/commande\/adresses/);
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.waitForURL(/\/commande\/livraison/);
    await verifierAccessibilite(page);
    const choix = page.getByLabel(/Jour de livraison/);
    await expect(choix).toHaveValue(attendue);
    // Le médecin préfère une date ultérieure parmi les jours ouvrés proposés.
    const options = await choix.locator("option").evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
    expect(options.length).toBeGreaterThan(5);
    const retenue = options[1]!;
    await choix.selectOption(retenue);
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.waitForURL(/\/commande\/paiement/);
    await page.getByRole("radio", { name: /Prélèvement SEPA/ }).check();
    await page.getByRole("button", { name: "Continuer" }).click();
    await page.waitForURL(/\/commande\/recapitulatif/);
    await verifierAccessibilite(page);
    await expect(main).toContainText("Premier mois TTC");
    await expect(main).toContainText("Mois suivants TTC");
    await expect(main).toContainText("L'enregistreur, prêt à l'emploi");
    await expect(main).toContainText("frais d'envoi et de retour");
    await expect(main).toContainText("Valeur de remplacement");
    await expect(main).toContainText("Prochaine échéance");
    await expect(main).toContainText(/résiliable à tout moment/);

    // Conditions de location obligatoires.
    await page.getByLabel(/J’accepte les conditions générales de vente/).check();
    await page.getByRole("button", { name: "Autoriser le prélèvement mensuel" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "conditions de location" })).toBeVisible();
    await accepterConditions(page);
    await page.getByRole("button", { name: "Autoriser le prélèvement mensuel" }).click();
    await payerSurPageDemo(page, { moyen: "Prélèvement SEPA" });
    await page.waitForURL(/\/commande\/confirmation\//);
    expect(Date.now() - debut).toBeLessThan(180_000); // SC-004

    const [l] = await locationsDe(c.partenaireRef);
    expect(l!.etat).toBe("commandee");
    expect(l!.serie).not.toBeNull(); // appareil réservé
    expect(new Date(l!.dateLivraison!).toISOString().slice(0, 10)).toBe(retenue);
    await page.goto("/mon-compte/locations");
    await expect(page.locator("main")).toContainText("Commandée");
  } finally {
    await retablir();
  }
});

test("heure limite passée : le lendemain n'est plus proposé ; parc en maintenance : première date réelle", async ({ page, browser, baseURL }) => {
  const retablir = await parametre("commande.heure_limite_express", "00:00");
  const lots = await requete<{ id: number }>("demo", `SELECT l.id FROM stock_lot l JOIN product_product v ON v.id = l."varianteId" WHERE v."defaultCode" = 'EC-SUN-OSCAR2' AND l.statut = 'disponible'`);
  try {
    await clientConnecte(browser, baseURL, page);
    await page.goto("/mise-a-disposition");
    const carte = page.locator("main").getByRole("listitem", { name: /SunTech Oscar 2/ }).first();
    await expect(carte).not.toContainText("Livraison demain");
    await expect(carte).toContainText("Première livraison possible");

    await requete("demo", `UPDATE stock_lot SET statut = 'en_maintenance', "retourPrevu" = now() + interval '12 days' WHERE id = ANY($1)`, [lots.map((x) => x.id)]);
    await page.reload();
    // La première date proposée est le premier jour ouvré à partir du retour prévu des appareils.
    const retour = new Date(Date.now() + 12 * 86_400_000).toISOString().slice(0, 10);
    const attendue = premiereDateLivraison(new Date(), regles("00:00"), null, retour);
    await expect(carte).toContainText(`Première livraison possible : ${libelleJour(attendue)}`);
  } finally {
    await requete("demo", `UPDATE stock_lot SET statut = 'disponible', "retourPrevu" = NULL WHERE id = ANY($1)`, [lots.map((x) => x.id)]);
    await retablir();
  }
});
