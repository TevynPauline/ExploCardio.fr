import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { requete } from "../bases";
import { COMPTES, connecterNavigateur } from "../session";

// T020 — suivi des demandes (F13, US6) : message de contact nouveau → en cours → traité avec
// note ; demande de devis traitée ; journalisé ; support refusé.

test.describe.configure({ timeout: 180_000, mode: "serial" });

test("message de contact : nouveau → en cours → traité avec une note, journalisé", async ({ page, context }) => {
  const id = `f13-msg-${Date.now()}`;
  const email = `${id}@demo.explocardio.test`;
  await requete("site", `INSERT INTO message_contact (id, motif, coordonnees, texte, date, etat, "modifieLe") VALUES ($1, 'Autre', $2, 'Message d''essai F13.', now(), 'nouveau', now())`, [id, JSON.stringify({ nom: "Essai F13", email, telephone: null, cabinet: null })]);
  try {
    await connecterNavigateur(context, COMPTES.admin);
    await page.goto("/admin/demandes/messages");
    const carte = page.getByRole("listitem", { name: `Message de ${email}` });
    await carte.getByLabel("État").selectOption("en_cours");
    await carte.getByRole("button", { name: "Enregistrer le suivi" }).click();
    await expect(page.locator("main").getByRole("status")).toContainText("Suivi enregistré");
    await page.goto("/admin/demandes/messages?etat=en_cours");
    await verifierAccessibilite(page);
    const encours = page.getByRole("listitem", { name: `Message de ${email}` });
    await encours.getByLabel("État").selectOption("traite");
    await encours.getByLabel("Note interne").fill("Rappelé le jour même.");
    await encours.getByRole("button", { name: "Enregistrer le suivi" }).click();
    await expect(page.locator("main").getByRole("status")).toContainText("Suivi enregistré");
    await page.goto("/admin/demandes/messages?etat=traite");
    await expect(page.getByRole("listitem", { name: `Message de ${email}` })).toContainText("suivi par");
    const [m] = await requete<{ etat: string; notes: string; traiteLe: Date | null }>("site", `SELECT etat, notes, "traiteLe" FROM message_contact WHERE id = $1`, [id]);
    expect(m).toMatchObject({ etat: "traite", notes: "Rappelé le jour même." });
    expect(m!.traiteLe).not.toBeNull();
    expect(await requete("site", `SELECT id FROM journal_action WHERE objet = $1 AND action = 'demandes.message.suivi'`, [id])).toHaveLength(2);
  } finally {
    await requete("site", `DELETE FROM message_contact WHERE id = $1`, [id]);
  }
});

test("demande de devis : traitée avec une note", async ({ page, context }) => {
  const id = `f13-devis-${Date.now()}`;
  const email = `${id}@demo.explocardio.test`;
  await requete("site", `INSERT INTO demande_devis (id, demandeur, objet, statut, "creeLe", "modifieLe") VALUES ($1, $2, 'devis ECG de repos', 'recue', now(), now())`, [id, JSON.stringify({ nom: "Essai F13", email, telephone: null, cabinet: null, besoin: "ECG 12 pistes", message: null })]);
  try {
    await connecterNavigateur(context, COMPTES.admin);
    await page.goto("/admin/devis");
    const carte = page.getByRole("listitem", { name: `Demande de ${email}` });
    await carte.getByLabel("État").selectOption("traitee");
    await carte.getByLabel("Note interne").fill("Devis envoyé.");
    await carte.getByRole("button", { name: "Enregistrer le suivi" }).click();
    await expect(page.locator("main").getByRole("status")).toContainText("Suivi enregistré");
    const [d] = await requete<{ statut: string; notes: string }>("site", `SELECT statut, notes FROM demande_devis WHERE id = $1`, [id]);
    expect(d).toMatchObject({ statut: "traitee", notes: "Devis envoyé." });
  } finally {
    await requete("site", `DELETE FROM demande_devis WHERE id = $1`, [id]);
  }
});

test("support : demandes refusées", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.support);
  for (const chemin of ["/admin/demandes/messages", "/admin/devis"]) {
    await page.goto(chemin);
    await expect(page).toHaveURL(/\/admin\?acces=refuse/);
  }
});
