import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { requete } from "./outils";

// T051 (US5, FR-029 à FR-032).

test.describe.configure({ mode: "serial" });

async function remplir(page: import("@playwright/test").Page, message: string) {
  await page.getByLabel("Motif", { exact: true }).selectOption("Information produit");
  await page.getByLabel("Nom", { exact: true }).fill("Dr Test Contact");
  await page.getByLabel("Email", { exact: true }).fill("contact-test@demo.explocardio.test");
  await page.getByLabel("Message", { exact: true }).fill(message);
  await page.waitForTimeout(3_200); // délai minimal anti-robots
}

test("page Qui sommes-nous : équipe, partenariats, formulaire accessible, avertissement patient", async ({ page }) => {
  await page.goto("/qui-sommes-nous");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Qui sommes-nous");
  await expect(page.getByText("Régis Andrieu")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nos partenaires" })).toBeVisible();
  await expect(page.getByText("N’indiquez aucune donnée concernant vos patients.")).toBeVisible();
  await verifierAccessibilite(page);
});

test("champ manquant : erreur sur le champ, saisie conservée, rien d'envoyé", async ({ page }) => {
  await page.goto("/qui-sommes-nous");
  await page.getByLabel("Nom", { exact: true }).fill("Dr Saisie Conservée");
  await page.getByLabel("Message", { exact: true }).fill("Un message suffisamment long.");
  await page.waitForTimeout(3_200);
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "corrigez les champs" })).toBeVisible();
  await expect(page.getByText("Indiquez une adresse email valide")).toBeVisible();
  await expect(page.getByLabel("Nom", { exact: true })).toHaveValue("Dr Saisie Conservée");
  await expect(page.getByLabel("Email", { exact: true })).toHaveAttribute("aria-invalid", "true");
});

test("envoi valide : confirmation et notification dans la boîte de démonstration", async ({ page }) => {
  const marque = `Message de test ${Date.now()}`;
  await page.goto("/qui-sommes-nous");
  await remplir(page, marque);
  await page.getByRole("button", { name: "Envoyer" }).click();
  await expect(page.getByRole("status").filter({ hasText: "votre message a bien été envoyé" })).toBeVisible();
  expect(await requete("site", `SELECT 1 FROM message_contact WHERE texte = $1`, [marque])).toHaveLength(1);
  const notif = await requete("site", `SELECT 1 FROM message_demonstration WHERE type = 'notification_equipe_email' AND rendu LIKE $1`, [`%${marque}%`]);
  expect(notif).toHaveLength(1);
});

test("motif présélectionné depuis la mise à disposition ; motif Assistance : boutons WhatsApp", async ({ page }) => {
  await page.goto("/mise-a-disposition");
  await page.getByRole("link", { name: "Demander une mise à disposition" }).last().click();
  await expect(page.getByLabel("Motif", { exact: true })).toHaveValue("Mise à disposition");
  await page.getByLabel("Motif", { exact: true }).selectOption("Assistance");
  await expect(page.getByRole("link", { name: "Écrire sur WhatsApp" }).first()).toBeVisible();
});

test("au-delà de 5 envois dans l'heure, l'envoi est refusé avec un message clair", async ({ page }) => {
  test.setTimeout(120_000);
  await requete("site", `DELETE FROM limite_envoi WHERE cle LIKE 'contact:%'`);
  let refuse = false;
  for (let i = 0; i < 6 && !refuse; i++) {
    await page.goto("/qui-sommes-nous");
    await remplir(page, `Envoi répété numéro ${i + 1}`);
    await page.getByRole("button", { name: "Envoyer" }).click();
    const limite = page.getByRole("alert").filter({ hasText: "plusieurs messages récemment" });
    const envoye = page.getByRole("status").filter({ hasText: "bien été envoyé" });
    await expect(limite.or(envoye)).toBeVisible();
    refuse = (await limite.count()) > 0;
    expect(refuse, `envoi ${i + 1}`).toBe(i === 5);
  }
  expect(refuse).toBe(true);
  await requete("site", `DELETE FROM limite_envoi WHERE cle LIKE 'contact:%'`);
});
