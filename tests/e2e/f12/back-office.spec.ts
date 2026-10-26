import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { COMPTES, connecterNavigateur } from "../session";
import { accesDe, acheterHolterCloud, clientConnecte, nombreEmails, requete } from "./outils";

// T020 (US4, FR-015, FR-018) : administrateur et support suspendent, rétablissent, ferment avec
// un motif → état dans « Mon compte », email, journal ; motif obligatoire. Les commerciaux sont
// refusés par la mise en page de la rubrique (exigerEquipe : administrateur et support).

test.describe.configure({ timeout: 240_000 });

test("le support gère un accès à la main, avec un motif, journalisé", async ({ page, browser, baseURL }) => {
  const c = await clientConnecte(browser, baseURL, page);
  await acheterHolterCloud(page, c.email);

  const contexte = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  await connecterNavigateur(contexte, COMPTES.support);
  const support = await contexte.newPage();
  await support.goto("/admin");
  await support.getByRole("navigation", { name: "Back-office" }).getByRole("link", { name: "Logiciels Cloud" }).click();
  await support.getByLabel("Nom, cabinet, email, SIRET ou SIREN").fill(c.email);
  await support.getByRole("button", { name: "Rechercher" }).click();
  const client = support.getByRole("region", { name: `Client ${c.email}` });
  const acces = client.getByRole("listitem", { name: /Accès CardioScan/ });
  await expect(acces).toContainText("Actif");
  await verifierAccessibilite(support);

  // Motif obligatoire : sans motif, le formulaire n'est pas envoyé et rien ne change.
  await acces.getByRole("button", { name: "Suspendre" }).click();
  await expect(support.locator("main").getByRole("status")).toHaveCount(0);
  await expect(acces).toContainText("Actif");
  await acces.getByLabel("Motif (obligatoire)").first().fill("Geste de test : suspension");
  await acces.getByRole("button", { name: "Suspendre" }).click();
  await expect(support.locator("main").getByRole("status")).toContainText("Accès suspendu");
  await expect(support.getByRole("region", { name: `Client ${c.email}` }).getByRole("listitem", { name: /Accès CardioScan/ })).toContainText("Suspendu");

  const rouvert = support.getByRole("region", { name: `Client ${c.email}` }).getByRole("listitem", { name: /Accès CardioScan/ });
  await rouvert.getByLabel("Motif (obligatoire)").first().fill("Fin du test");
  await rouvert.getByRole("button", { name: "Rétablir" }).click();
  await expect(support.locator("main").getByRole("status")).toContainText("Accès rétabli");
  await contexte.close();

  await page.goto("/mon-compte/logiciels");
  await expect(page.getByRole("listitem", { name: /Logiciel CardioScan/ })).toContainText("Actif");
  expect(await nombreEmails(c.email, "est suspendu")).toBe(1);
  expect(await nombreEmails(c.email, "est rétabli")).toBe(1);
  const [a] = await accesDe(c.partenaireRef);
  const journal = await requete<{ auteur: string; detail: { motif?: string } }>("site", `SELECT auteur, detail FROM journal_action WHERE objet = $1 AND action = 'cloud.suspension'`, [a!.id]);
  expect(journal).toHaveLength(1);
  expect(journal[0]!.auteur).toContain(COMPTES.support);
  expect(journal[0]!.detail.motif).toBe("Geste de test : suspension");
});
