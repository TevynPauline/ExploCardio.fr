import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { ETAT_ACCES } from "./acces-global";
import { verifierAccessibilite } from "./axe";
import { requete } from "./bases";
import { COMPTES, connecter, connecterNavigateur } from "./session";

// T056 (US4, SC-002, SC-013, data-model.md §4) : après une séance, la réinitialisation depuis le
// back-office remet l'état de départ en moins d'une minute, conserve contenus, paramètres et
// comptes de l'équipe, et les cinq comptes de démonstration permettent de se connecter.

test.describe.configure({ mode: "serial" });

test("réinitialiser la démonstration depuis le back-office", async ({ page, context, playwright, baseURL }) => {
  test.setTimeout(120_000);
  const marque = randomUUID().slice(0, 8);

  // --- Séance de critique : activité de test
  await requete("demo", `UPDATE product_product SET "prixHtCentimes" = 1 WHERE "defaultCode" = 'EC-SUN-OSCAR2'`);
  await requete(
    "demo",
    `INSERT INTO sale_order (ref, "partenaireId", "montantHtCentimes", "tvaCentimes", "montantTtcCentimes", "modePaiement")
     SELECT 'FICT-SO-SEANCE-${marque}', id, 100, 20, 120, 'carte' FROM res_partner WHERE ref = 'FICT-P-00001'`,
  );
  await requete(
    "site",
    `INSERT INTO utilisateur (id, name, email, "emailVerified", role, "updatedAt") VALUES ($1, 'Client de séance', $2, true, 'client', now())`,
    [`client-${marque}`, `seance-${marque}@exemple.test`],
  );
  await requete(
    "site",
    `INSERT INTO utilisateur (id, name, email, "emailVerified", role, "updatedAt") VALUES ($1, 'Commercial de l''équipe', $2, true, 'commercial', now())`,
    [`equipe-${marque}`, `equipe-${marque}@explocardio.test`],
  );
  await requete("site", `INSERT INTO message_contact (id, motif, coordonnees, texte) VALUES ($1, 'test', '{}', 'séance')`, [marque]);
  await requete("site", `INSERT INTO contenu (id, type, titre, corps, "modifieLe") VALUES ($1, 'page', 'Page conservée', 'Texte', now())`, [`faq-${marque}`]);

  // --- Réinitialisation depuis le back-office
  await connecterNavigateur(context, COMPTES.admin);
  await page.goto("/admin/demonstration/reinitialiser");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Réinitialiser la démonstration");
  await verifierAccessibilite(page);
  await page.getByLabel(/Je confirme la réinitialisation/).check();
  const debut = Date.now();
  await page.getByRole("button", { name: "Réinitialiser la démonstration" }).click();
  await page.waitForURL(/\/connexion|fait=/);
  expect(Date.now() - debut).toBeLessThan(60_000);

  // --- Remis à l'état de départ
  const [oscar] = await requete<{ prix: number }>("demo", `SELECT "prixHtCentimes" AS prix FROM product_product WHERE "defaultCode" = 'EC-SUN-OSCAR2'`);
  expect(oscar!.prix).toBe(189_000);
  expect(await requete("demo", `SELECT 1 FROM sale_order WHERE ref = 'FICT-SO-SEANCE-${marque}'`)).toHaveLength(0);
  expect(await requete("site", `SELECT 1 FROM utilisateur WHERE email = $1`, [`seance-${marque}@exemple.test`])).toHaveLength(0);
  expect(await requete("site", `SELECT 1 FROM message_contact WHERE id = $1`, [marque])).toHaveLength(0);

  // --- Conservé
  expect(await requete("site", `SELECT 1 FROM utilisateur WHERE email = $1`, [`equipe-${marque}@explocardio.test`])).toHaveLength(1);
  expect(await requete("site", `SELECT 1 FROM contenu WHERE id = $1`, [`faq-${marque}`])).toHaveLength(1);
  const journal = await requete("site", `SELECT 1 FROM journal_action WHERE action = 'demo.reinitialisation' AND date > (now() AT TIME ZONE 'utc') - interval '2 minutes'`);
  expect(journal.length).toBeGreaterThan(0);

  // --- Les cinq comptes de démonstration se connectent immédiatement (SC-013)
  for (const email of Object.values(COMPTES)) {
    const contexte = await playwright.request.newContext({ baseURL, storageState: ETAT_ACCES });
    await connecter(contexte, email, baseURL);
    await contexte.dispose();
  }

  // Nettoyage
  await requete("site", `DELETE FROM utilisateur WHERE id = $1`, [`equipe-${marque}`]);
  await requete("site", `DELETE FROM contenu WHERE id = $1`, [`faq-${marque}`]);
});

test("la réinitialisation exige la confirmation", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.admin);
  await page.goto("/admin/demonstration/reinitialiser");
  await page.getByRole("button", { name: "Réinitialiser la démonstration" }).click();
  // Le navigateur bloque l'envoi tant que la case n'est pas cochée.
  await expect(page).toHaveURL(/\/admin\/demonstration\/reinitialiser$/);
});

test("le support n'a pas accès aux outils de démonstration", async ({ page, context }) => {
  await connecterNavigateur(context, COMPTES.support);
  await page.goto("/admin/demonstration/reinitialiser");
  await expect(page).toHaveURL(/\/admin\?acces=refuse/);
});
