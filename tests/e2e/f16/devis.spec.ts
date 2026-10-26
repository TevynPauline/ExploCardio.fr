import { expect, test, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { verifierAccessibilite } from "../axe";
import { accepterConditions, ELECTRODES, ajouterDepuisFiche, clientConnecte, jusquAuRecapitulatif, payerSurPageDemo, requete } from "../f04/outils";

// T034 — devis depuis le panier (F16, US6, FR-018 à FR-022, SC-006).

test.describe.configure({ timeout: 240_000 });

async function recevoirDevis(page: Page): Promise<string> {
  await page.goto("/panier");
  await page.locator("main").getByRole("button", { name: "Recevoir un devis" }).click();
  const statut = page.locator("#resultat-devis");
  await expect(statut).toContainText(/Votre devis .+ est prêt/, { timeout: 10_000 }); // SC-006
  return (await statut.textContent())!.match(/Votre devis (\S+) est prêt/)![1]!;
}

test("devis depuis le panier : PDF FICTIF aussitôt, email, équipe prévenue, panier inchangé ; puis commandé aux prix du devis", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await ajouterDepuisFiche(page, ELECTRODES);
  await page.goto("/panier");
  await verifierAccessibilite(page);
  const lignesAvant = await requete("site", `SELECT l."defaultCode", l.quantite FROM ligne_panier l JOIN panier p ON p.id = l."panierId" WHERE p."compteId" = $1 ORDER BY 1`, [c.id]);

  const debut = Date.now();
  const ref = await recevoirDevis(page);
  const pdf = await page.request.get(`/mon-compte/devis/${encodeURIComponent(ref)}/pdf`);
  expect(Date.now() - debut).toBeLessThan(10_000);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  const doc = await PDFDocument.load(await pdf.body());
  expect(doc.getTitle()).toBe(`Devis ${ref} — FICTIF`);
  // Contrôle en haut de page : l'en-tête fixe ne recouvre alors aucun champ.
  await page.evaluate(() => window.scrollTo(0, 0));
  await verifierAccessibilite(page);

  const lignesApres = await requete("site", `SELECT l."defaultCode", l.quantite FROM ligne_panier l JOIN panier p ON p.id = l."panierId" WHERE p."compteId" = $1 ORDER BY 1`, [c.id]);
  expect(lignesApres).toEqual(lignesAvant);
  await expect.poll(async () => (await requete("site", `SELECT 1 FROM message_demonstration WHERE destinataire = $1 AND objet = $2`, [c.email, `Votre devis ${ref}`])).length).toBe(1);
  await expect.poll(async () => (await requete("site", `SELECT 1 FROM message_demonstration WHERE objet = $1`, [`Nouveau devis ${ref}`])).length).toBe(1);
  const [enregistre] = await requete<{ statut: string; jours: number }>("demo", `SELECT statut, round(extract(epoch FROM ("validiteLe" - date)) / 86400)::int AS jours FROM sale_order WHERE ref = $1`, [ref]);
  expect(enregistre).toEqual({ statut: "devis", jours: 30 });

  // Mon compte → Devis : état, PDF, « Commander ».
  await page.goto("/mon-compte/devis");
  await verifierAccessibilite(page);
  const ligne = page.getByRole("region", { name: "Tableau des devis" }).getByRole("row").filter({ hasText: ref });
  await expect(ligne).toContainText("Valable");
  await expect(ligne.getByRole("link", { name: `Télécharger le devis ${ref}` })).toBeVisible();
  // Prix du devis plus bas que le prix du jour : c'est lui qui s'applique (base fictive).
  await requete("demo", `UPDATE sale_order SET livraison = jsonb_set(livraison, '{devis,calcul,lignes,0,prixUnitaireHt}', '100') WHERE ref = $1`, [ref]);
  await ligne.getByRole("button", { name: `Commander le devis ${ref}` }).click();
  await page.waitForURL(/\/commande\/adresses/);
  await page.goto("/panier");
  await expect(page.locator("main").getByRole("status").filter({ hasText: `Panier repris de votre devis ${ref}` })).toBeVisible();
  await expect(page.locator("main").getByRole("button", { name: "Recevoir un devis" })).toHaveCount(0);

  await jusquAuRecapitulatif(page);
  await accepterConditions(page);
  await page.getByRole("button", { name: /^Payer/ }).click();
  await payerSurPageDemo(page);
  await page.waitForURL(/\/commande\/confirmation\//);
  const [commande] = await requete<{ statut: string; devisRef: string; prix: number }>(
    "demo",
    `SELECT o.statut, o."devisRef", l."prixUnitaireHtCentimes" AS prix FROM sale_order o JOIN sale_order_line l ON l."commandeId" = o.id WHERE o.ref = $1`,
    [ref],
  );
  expect(commande).toEqual({ statut: "payee", devisRef: ref, prix: 100 });
  await page.goto("/mon-compte/devis");
  await expect(page.getByRole("region", { name: "Tableau des devis" }).getByRole("row").filter({ hasText: ref })).toContainText(`Commande ${ref}`);
});

test("devis expiré : panier recomposé aux prix du jour, avec un message", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await ajouterDepuisFiche(page, ELECTRODES);
  const ref = await recevoirDevis(page);
  await requete("demo", `UPDATE sale_order SET "validiteLe" = now() - interval '1 day' WHERE ref = $1`, [ref]);
  // Panier vidé entre-temps : « Commander » le recompose.
  await requete("site", `DELETE FROM ligne_panier WHERE "panierId" IN (SELECT id FROM panier WHERE "compteId" = $1)`, [c.id]);
  await page.goto("/mon-compte/devis");
  const ligne = page.getByRole("region", { name: "Tableau des devis" }).getByRole("row").filter({ hasText: ref });
  await expect(ligne).toContainText("Expiré");
  await ligne.getByRole("button", { name: `Commander le devis ${ref} aux prix du jour` }).click();
  await page.waitForURL(/\/panier\?devis=expire/);
  await expect(page.locator("main").getByRole("status").filter({ hasText: "Votre devis a expiré" })).toBeVisible();
  await expect(page.locator("main")).toContainText("Électrodes Holter");
  const [panier] = await requete<{ devisRef: string | null }>("site", `SELECT "devisRef" FROM panier WHERE "compteId" = $1`, [c.id]);
  expect(panier!.devisRef).toBeNull();
});

test("visiteur non connecté : invité à se connecter, puis retour au panier", async ({ page }) => {
  await ajouterDepuisFiche(page, ELECTRODES);
  await page.goto("/panier");
  await page.locator("main").getByRole("link", { name: "Se connecter pour recevoir un devis" }).click();
  await expect(page).toHaveURL(/\/connexion\?retour=%2Fpanier/);
});

test("adresse du cabinet hors métropole : devis refusé avec « Nous contacter »", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await requete("site", `UPDATE adresse SET "codePostal" = '97400', ville = 'Saint-Denis' WHERE "compteId" = $1`, [c.id]);
  await ajouterDepuisFiche(page, ELECTRODES);
  await page.goto("/panier");
  await page.locator("main").getByRole("button", { name: "Recevoir un devis" }).click();
  const statut = page.locator("#resultat-devis");
  await expect(statut).toContainText("uniquement en France métropolitaine");
  await expect(statut.getByRole("link", { name: "Nous contacter" })).toHaveAttribute("href", "/qui-sommes-nous?motif=hors-metropole#contact");
  await page.evaluate(() => window.scrollTo(0, 0));
  await verifierAccessibilite(page);
  const devis = await requete("demo", `SELECT 1 FROM sale_order o JOIN res_partner p ON p.id = o."partenaireId" WHERE p.ref = $1 AND o.statut = 'devis'`, [c.partenaireRef]);
  expect(devis).toHaveLength(0);
});
