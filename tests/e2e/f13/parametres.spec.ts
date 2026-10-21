import { expect, test, type Page } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { requete } from "../bases";
import { COMPTES, connecterNavigateur } from "../session";

// T016 — paramètres de fonctionnement (F13, US4, FR-015 à FR-019, SC-006) : heure limite,
// valeur refusée, WhatsApp et horaires, historique et « Remettre cette valeur », rappel Odoo,
// commercial limité à l'offre de bienvenue. Les valeurs sont rétablies en fin de test.

test.describe.configure({ timeout: 240_000, mode: "serial" });

const CLES = ["commande.heure_limite_express", "contact.whatsapp", "contact.horaires", "bienvenue.active", "comptes.specialites"];
let avant: { cle: string; valeur: string }[] = [];

test.beforeAll(async () => {
  avant = await requete<{ cle: string; valeur: string }>("site", `SELECT cle, valeur FROM parametre WHERE cle = ANY($1)`, [CLES]);
});

test.afterAll(async () => {
  await requete("site", `DELETE FROM parametre WHERE cle = ANY($1) AND NOT (cle = ANY($2))`, [CLES, avant.map((a) => a.cle)]);
  for (const a of avant) await requete("site", `UPDATE parametre SET valeur = $2 WHERE cle = $1`, [a.cle, a.valeur]);
});

const carte = (page: Page, cle: string) => page.locator(`#${cle.replace(/\./g, "-")}`);

async function enregistrer(page: Page, cle: string, champs: Record<string, string>) {
  const c = carte(page, cle);
  for (const [libelle, valeur] of Object.entries(champs)) await c.getByLabel(libelle, { exact: true }).fill(valeur);
  await c.getByRole("button", { name: "Enregistrer" }).click();
}

test("heure limite, valeur refusée, historique et remise d'une valeur ; rappel Odoo", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  await page.goto("/admin/parametres");
  await expect(page.getByRole("heading", { level: 1, name: "Fonctionnement du site" })).toBeVisible();
  await expect(page.locator("main")).toContainText("se règlent dans Odoo");
  await verifierAccessibilite(page);

  await enregistrer(page, "commande.heure_limite_express", { "Heure limite d'expédition": "25:00" });
  await expect(page.locator("main").getByRole("alert")).toContainText("« 25:00 » n'est pas une heure valide");

  await enregistrer(page, "commande.heure_limite_express", { "Heure limite d'expédition": "13:00" });
  await expect(page.locator("main").getByRole("status")).toContainText("Heure limite d'expédition : enregistré.");
  await page.goto("/mise-a-disposition");
  await expect(page.locator("main")).toContainText("avant 13:00");

  await page.goto("/admin/parametres");
  await enregistrer(page, "commande.heure_limite_express", { "Heure limite d'expédition": "15:30" });
  await expect(page.locator("main").getByRole("status")).toContainText("enregistré");
  const c = carte(page, "commande.heure_limite_express");
  await c.getByText(/^Historique/).click();
  await expect(c.getByRole("listitem").first()).toContainText("13:00 → 15:30");
  await c.getByRole("button", { name: "Remettre cette valeur : 13:00" }).first().click();
  await expect(page.locator("main").getByRole("status")).toContainText("valeur remise");
  await expect(carte(page, "commande.heure_limite_express").getByLabel("Heure limite d'expédition")).toHaveValue("13:00");
});

test("numéro WhatsApp et horaires modifiés : pied de page à jour", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  await page.goto("/admin/parametres?theme=contact");
  await enregistrer(page, "contact.whatsapp", { "Numéro WhatsApp": "06 99 11 22 33" });
  await expect(page.locator("main").getByRole("alert")).toContainText("format international");
  await enregistrer(page, "contact.whatsapp", { "Numéro WhatsApp": "+33 6 99 11 22 33" });
  await expect(page.locator("main").getByRole("status")).toContainText("enregistré");
  await enregistrer(page, "contact.horaires", { Samedi: "10:00-12:00" });
  await expect(page.locator("main").getByRole("status")).toContainText("enregistré");
  await page.goto("/services/assistance");
  await expect(page.getByRole("contentinfo")).toContainText("+33 6 99 11 22 33");
  await expect(page.locator("main").getByRole("region", { name: "Contacter l’équipe" })).toContainText("samedi de 10 h à 12 h");
});

test("deux onglets sur le même paramètre : le second est prévenu", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  const autre = await context.newPage();
  await page.goto("/admin/parametres?theme=comptes");
  await autre.goto("/admin/parametres?theme=comptes");
  await enregistrer(page, "comptes.specialites", { "Spécialités proposées à l'inscription": "Cardiologie\nMédecine du sport" });
  await expect(page.locator("main").getByRole("status")).toContainText("enregistré");
  await enregistrer(autre, "comptes.specialites", { "Spécialités proposées à l'inscription": "Cardiologie" });
  await expect(autre.locator("main").getByRole("alert")).toContainText("depuis que vous avez ouvert la page");
  await autre.close();
});

test("commercial : lecture des paramètres, modification de l'offre de bienvenue seulement", async ({ page, context }) => {
  await requete("site", `UPDATE utilisateur SET role = 'commercial' WHERE email = $1`, [COMPTES.support]);
  try {
    await connecterNavigateur(context, COMPTES.support);
    await page.goto("/admin/parametres");
    await expect(page.locator("main")).toContainText("Lecture seule");
    await expect(page.locator("main").getByRole("button", { name: "Enregistrer" })).toHaveCount(0);
    await page.goto("/admin/parametres/bienvenue");
    const c = carte(page, "bienvenue.active");
    const coche = await c.getByRole("checkbox").isChecked();
    await c.getByRole("checkbox").setChecked(!coche);
    await c.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.locator("main").getByRole("status")).toContainText("enregistré");
    await expect.poll(async () => (await requete<{ valeur: string }>("site", `SELECT valeur FROM parametre WHERE cle = 'bienvenue.active'`))[0]?.valeur).toBe(coche ? "false" : "true");
  } finally {
    await requete("site", `UPDATE utilisateur SET role = 'support' WHERE email = $1`, [COMPTES.support]);
  }
});

test("support : paramètres refusés", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.support);
  await page.goto("/admin/parametres");
  await expect(page).toHaveURL(/\/admin\?acces=refuse/);
});
