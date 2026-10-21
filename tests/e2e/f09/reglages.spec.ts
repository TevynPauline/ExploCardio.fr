import { expect, test } from "@playwright/test";
import { COMPTES, connecterNavigateur } from "../session";
import { requete } from "../bases";

// T015 (US4, FR-008, FR-013, SC-003, D7) : numéro, horaires et fermetures réglés au back-office et
// mis à jour partout ; numéro vidé → plus de bouton ; contenu créé, relié, publié, retiré.

test.describe.configure({ timeout: 240_000, mode: "serial" });

const CHAMPS = ["contact.whatsapp", "contact.horaires", "contact.fermetures"];

test("numéro et horaires modifiés au back-office : mis à jour partout ; numéro vidé : formulaire de contact", async ({ page, context }) => {
  const avant = await requete<{ cle: string; valeur: string }>("site", `SELECT cle, valeur FROM parametre WHERE cle = ANY($1)`, [CHAMPS]);
  await connecterNavigateur(context, COMPTES.admin);
  // F13 (D3) : numéro et horaires se règlent dans Paramètres › Contact WhatsApp et horaires.
  const enregistrer = async (carte: string, champs: Record<string, string>) => {
    await page.goto("/admin/parametres?theme=contact");
    const c = page.locator(`#${carte}`);
    for (const [libelle, valeur] of Object.entries(champs)) await c.getByLabel(libelle, { exact: true }).fill(valeur);
    await c.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.locator("main").getByRole("status")).toBeVisible();
  };
  try {
    await enregistrer("contact-whatsapp", { "Numéro WhatsApp": "+33 6 99 11 22 33" });
    await enregistrer("contact-horaires", { Samedi: "10:00-12:00" });
    await page.goto("/services/assistance");
    const zone = page.locator("main").getByRole("region", { name: "Contacter l’équipe" });
    await expect(zone).toContainText("+33 6 99 11 22 33");
    await expect(zone).toContainText("samedi de 10 h à 12 h");
    await expect(page.getByRole("contentinfo")).toContainText("+33 6 99 11 22 33");

    await page.goto("/admin/parametres?theme=contact");
    await page.locator("#contact-horaires").getByLabel("Lundi", { exact: true }).fill("9h-18h");
    await page.locator("#contact-horaires").getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.locator("main").getByRole("alert")).toContainText("n'est pas une plage valide");

    await enregistrer("contact-whatsapp", { "Numéro WhatsApp": "" });
    await page.goto("/services/assistance");
    await expect(page.locator("main").getByRole("link", { name: /^Appeler/ })).toHaveCount(0);
    await expect(page.locator("main").getByRole("link", { name: "Écrivez-nous" })).toHaveAttribute("href", "/qui-sommes-nous#contact");
  } finally {
    for (const a of avant) await requete("site", `UPDATE parametre SET valeur = $2 WHERE cle = $1`, [a.cle, a.valeur]);
  }
});

test("contenu en préparation invisible ; publié relié au Holter ; retiré", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  const titre = `Question d'essai ${Date.now() % 100000} ?`;
  await page.goto("/admin/contenus/aide/nouveau");
  await page.getByLabel("Titre (ou question pour la FAQ)").fill(titre);
  await page.getByLabel("Résumé").fill("Résumé d'essai.");
  await page.getByLabel("Appareils et logiciels liés (références d’Odoo)").fill("EC-DMS-3004L");
  await page.getByLabel("Réponse").fill("Réponse d'essai.");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.locator("main").getByRole("status")).toContainText("Contenu enregistré");
  const [c] = await requete<{ id: string }>("site", `SELECT id FROM contenu_aide WHERE titre = $1`, [titre]);
  try {
    await page.goto(`/aide?q=${encodeURIComponent("Question d'essai")}`);
    await expect(page.locator("main")).not.toContainText(titre);
    await page.goto(`/admin/contenus/aide/${c!.id}`);
    await page.getByRole("button", { name: "Publier" }).click();
    await expect(page.locator("main").getByRole("status")).toContainText("Contenu publié");
    await page.goto("/holter-ecg/dms-300-4l");
    await expect(page.locator("main")).toContainText(titre);
    await page.goto(`/admin/contenus/aide/${c!.id}`);
    await page.getByRole("button", { name: "Retirer de l’aide en ligne" }).click();
    await page.goto("/holter-ecg/dms-300-4l");
    await expect(page.locator("main")).not.toContainText(titre);
  } finally {
    await requete("site", `DELETE FROM contenu_aide WHERE id = $1`, [c!.id]);
  }
});
