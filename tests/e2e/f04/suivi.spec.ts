import { expect, test, type Browser, type Page } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { COMPTES, connecterNavigateur } from "../session";
import { ELECTRODES, ajouterDepuisFiche, clientConnecte, jusquAuRecapitulatif, payerSurPageDemo, requete } from "./outils";

// T033 (US7, FR-029 à FR-032) : expédition (transporteur, suivi) et livraison visibles et
// notifiées ; remboursements partiel (décidé dans Odoo) puis total (fait dans Stripe) → statut,
// avoirs PDF, emails.

test.describe.configure({ timeout: 240_000 });

async function ecranDemo(browser: Browser, baseURL: string | undefined, action: (page: Page) => Promise<void>) {
  const contexte = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  await connecterNavigateur(contexte, COMPTES.admin);
  const page = await contexte.newPage();
  await page.goto("/admin/demonstration/paiements");
  await action(page);
  await contexte.close();
}

async function nombreEmails(email: string, debut: string) {
  return (await requete("site", `SELECT 1 FROM message_demonstration WHERE destinataire = $1 AND objet LIKE $2`, [email, `${debut}%`])).length;
}

test("expédiée, livrée, remboursée en partie puis en totalité : statuts, avoirs et emails", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await ajouterDepuisFiche(page, ELECTRODES);
  await jusquAuRecapitulatif(page);
  await page.getByLabel(/J’accepte les conditions générales de vente/).check();
  await page.getByRole("button", { name: /^Payer/ }).click();
  await payerSurPageDemo(page);
  await page.waitForURL(/\/commande\/confirmation\//);
  const [cmd] = await requete<{ ref: string; montant: number; paiement: string }>(
    "demo",
    `SELECT o.ref, o."montantTtcCentimes" AS montant, o."referencePaiement" AS paiement FROM sale_order o JOIN res_partner p ON p.id = o."partenaireId" WHERE p.ref = $1`,
    [c.partenaireRef],
  );
  const ref = cmd!.ref;
  const main = page.locator("main");
  const detail = async () => {
    await page.goto(`/mon-compte/commandes/${encodeURIComponent(ref)}`);
    return main;
  };

  // Expédition depuis l'écran de démonstration (ce que l'équipe fait dans Odoo).
  await ecranDemo(browser, baseURL, async (admin) => {
    const ligne = admin.getByRole("listitem", { name: `Commande ${ref}` });
    await ligne.getByLabel(`Numéro de suivi (${ref})`).fill("FICT-COLIS-E2E");
    await ligne.getByRole("button", { name: "Marquer expédiée" }).click();
    await expect(admin.getByRole("status").filter({ hasText: "client prévenu" })).toBeVisible();
  });
  await expect(await detail()).toContainText("Expédiée");
  await expect(main).toContainText("Colissimo, suivi n° FICT-COLIS-E2E");
  await verifierAccessibilite(page);
  expect(await nombreEmails(c.email, `Votre commande ${ref} est expédiée`)).toBe(1);

  await ecranDemo(browser, baseURL, async (admin) => {
    await admin.getByRole("button", { name: `Marquer livrée (${ref})` }).click();
    await expect(admin.getByRole("status").filter({ hasText: "marquée livrée" })).toBeVisible();
  });
  await expect(await detail()).toContainText("Livrée");

  // Remboursement partiel décidé dans Odoo : exécuté par Stripe, avoir.
  await ecranDemo(browser, baseURL, async (admin) => {
    const ligne = admin.getByRole("listitem", { name: `Commande ${ref}` });
    await ligne.getByLabel(`Montant à rembourser (${ref}, € TTC)`).fill("5,00");
    await ligne.getByRole("button", { name: "Décider un remboursement" }).click();
    await expect(admin.getByRole("status").filter({ hasText: "avoir émis" })).toBeVisible();
  });
  await expect(await detail()).toContainText("Remboursée en partie");
  await expect(main).toContainText("Remboursé : 5,00 €");
  const avoir = main.getByRole("link", { name: /Avoir FICT\/\d{4}\/\d+ \(PDF\)/ });
  await expect(avoir).toHaveCount(1);
  const pdf = await page.request.get((await avoir.getAttribute("href"))!);
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect(await nombreEmails(c.email, `Remboursement de la commande ${ref}`)).toBe(1);

  // Reste remboursé directement dans Stripe (simulé) : reporté dans Odoo.
  await ecranDemo(browser, baseURL, async (admin) => {
    await admin.locator('select[name="paiement"]').selectOption(cmd!.paiement);
    await admin.getByLabel("Montant TTC (€)").last().fill(((cmd!.montant - 500) / 100).toFixed(2).replace(".", ","));
    await admin.getByRole("button", { name: "Simuler le remboursement" }).click();
    await expect(admin.getByRole("status").filter({ hasText: "Remboursement simulé" })).toBeVisible();
  });
  await expect(await detail()).toContainText("Remboursée");
  await expect(main.getByRole("link", { name: /Avoir FICT\/\d{4}\/\d+ \(PDF\)/ })).toHaveCount(2);
  expect(await nombreEmails(c.email, `Remboursement de la commande ${ref}`)).toBe(2);
});
