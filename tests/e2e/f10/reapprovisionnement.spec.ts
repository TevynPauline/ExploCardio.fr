import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { requete } from "../bases";
import { clientConnecte } from "../f04/outils";
import { COMPTES, connecterNavigateur } from "../session";

// T014 — relance de réapprovisionnement (F10, US2) : historique régulier préparé par l'outil de
// démonstration, scénarios lancés → une relance tracée (dans la boîte si l'heure est dans les
// plages d'envoi) ; « Commander de nouveau » remplit le panier ; relancer n'ajoute rien.

const ELECTRODES = "EC-ELEC-HOLTER-500";

test("une relance de réapprovisionnement, puis « Commander de nouveau »", async ({ page, browser, baseURL }) => {
  test.setTimeout(240_000);
  const client = await clientConnecte(browser, baseURL, page);

  const admin = await browser.newContext({ baseURL, storageState: "playwright/.auth/acces-demo.json" });
  await connecterNavigateur(admin, COMPTES.admin);
  const a = await admin.newPage();
  await a.goto("/admin/demonstration/emails");
  await verifierAccessibilite(a);
  await a.getByLabel("Client").selectOption(client.partenaireRef);
  await a.getByLabel("Consommable").selectOption(ELECTRODES);
  await a.getByRole("button", { name: "Créer l’historique" }).click();
  await expect(a.getByText("Historique de commandes créé.")).toBeVisible();

  await a.getByRole("button", { name: "Lancer les scénarios" }).click();
  await expect(a.getByText(/Scénarios lancés/)).toBeVisible({ timeout: 60_000 });
  const envois = () =>
    requete<{ etat: string; cle: string }>("site", `SELECT etat, cle FROM envoi WHERE "compteId" = $1 AND scenario = 'reapprovisionnement'`, [client.id]);
  const [envoi] = await envois();
  expect(["envoye", "programme"]).toContain(envoi!.etat);
  if (envoi!.etat === "envoye") {
    await a.goto(`/admin/demonstration/boite?onglet=clients&destinataire=${encodeURIComponent(client.email)}`);
    await expect(a.getByRole("link", { name: /Bientôt à court de/ })).toBeVisible();
  }

  // Relancer : aucune relance de plus pour la même échéance.
  await a.goto("/admin/demonstration/emails");
  await a.getByRole("button", { name: "Lancer les scénarios" }).click();
  await expect(a.getByText(/Scénarios lancés/)).toBeVisible({ timeout: 60_000 });
  expect(await envois()).toHaveLength(1);
  await admin.close();

  // « Commander de nouveau » : l'article et sa quantité habituelle arrivent dans le panier.
  await page.goto(`/panier/recommander?ref=${ELECTRODES}&quantite=2`);
  await page.waitForURL(/\/panier\?ajout=recommande/);
  await expect(page.getByRole("status").filter({ hasText: "a été ajouté à votre panier" })).toBeVisible();
  await expect(page.getByRole("main")).toContainText(/Électrodes Holter/);
});

test("« Commander de nouveau » sans être connecté : connexion d'abord", async ({ page }) => {
  await page.goto(`/panier/recommander?ref=${ELECTRODES}&quantite=2`);
  await page.waitForURL(/\/connexion\?retour=/);
  expect(decodeURIComponent(page.url())).toContain(`/panier/recommander?ref=${ELECTRODES}&quantite=2`);
});
