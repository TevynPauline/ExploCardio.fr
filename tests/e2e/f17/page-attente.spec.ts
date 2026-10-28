import { expect, test } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { requete } from "../bases";
import { COMPTES, connecterNavigateur } from "../session";

// T007 — page d'attente (F17, SC-001 à SC-004). L'adresse 127.0.0.1 est déclarée comme page
// d'attente (DOMAINES_PAGE_ATTENTE) ; localhost reste l'adresse de la démonstration.

test.describe.configure({ timeout: 180_000, mode: "serial" });

const attente = (baseURL: string | undefined) => {
  const url = new URL(baseURL ?? "http://localhost:3100");
  url.hostname = "127.0.0.1";
  return url.origin;
};

test("page d'attente publique : formulaire, aucune autre page, démonstration inchangée", async ({ browser, baseURL, page: admin, context: equipe }) => {
  const origine = attente(baseURL);
  const email = `f17-${Date.now()}@demo.explocardio.test`;
  // Sans cookie d'accès à la démonstration : la page d'attente ne demande aucun mot de passe.
  const contexte = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await contexte.newPage();
  try {
    const reponse = await page.goto(`${origine}/`);
    expect(reponse?.headers()["x-robots-tag"]).toContain("noindex");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Plus que quelques jours avant le lancement officiel du site ExploCardio.fr");
    await expect(page.getByText("Version de démonstration")).toHaveCount(0);
    await verifierAccessibilite(page);

    for (const chemin of ["/catalogue", "/admin", "/demo/acces", "/bientot", "/mon-compte"]) {
      await page.goto(`${origine}${chemin}`);
      await expect(page).toHaveURL(`${origine}/`);
    }

    // Envoi incomplet : erreurs reliées aux champs, rien d'enregistré.
    await page.waitForTimeout(1600);
    await page.getByRole("button", { name: "Envoyer" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "corrigez les champs" })).toBeVisible();
    await expect(page.getByLabel("Nom et prénom")).toHaveAttribute("aria-invalid", "true");

    // Deux envois avec la même adresse : une seule ligne, les deux commentaires gardés.
    for (const [nom, commentaire] of [["Dr Essai F17", "Rappelez-moi pour un Holter."], ["Dr Essai F17 bis", "Plutôt le matin."]] as const) {
      await page.getByLabel("Nom et prénom").fill(nom);
      await page.getByRole("textbox", { name: "Adresse email" }).fill(email);
      await page.getByLabel("Numéro de téléphone (facultatif)").fill("06 12 34 56 78");
      await page.getByLabel("Commentaires (facultatif)").fill(commentaire);
      await page.getByRole("checkbox").check();
      // Délai minimal entre l'affichage et l'envoi (protection contre les robots) : la page est
      // réaffichée après chaque envoi, un humain met plus de 1,5 s à saisir l'inscription suivante.
      await page.waitForTimeout(1600);
      await page.getByRole("button", { name: "Envoyer" }).click();
      await expect(page.getByRole("status")).toContainText("Message bien envoyé, nous revenons vers vous rapidement.");
      // Formulaire vidé pour la personne suivante.
      await expect(page.getByRole("textbox", { name: "Adresse email" })).toHaveValue("");
    }
    await verifierAccessibilite(page);
    const lignes = await requete<{ nom: string; telephone: string; commentaire: string }>("site", `SELECT nom, telephone, commentaire FROM inscription_ouverture WHERE email = $1`, [email]);
    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toMatchObject({ nom: "Dr Essai F17 bis", telephone: "06 12 34 56 78" });
    expect(lignes[0]!.commentaire).toMatch(/^Rappelez-moi pour un Holter\.\n\n\[.+\] Plutôt le matin\.$/);

    // La démonstration reste protégée par son mot de passe.
    const demo = await page.goto(`${baseURL}/`);
    expect(demo?.url()).toContain("/demo/acces");
  } finally {
    await contexte.close();
  }

  // Back-office : liste, export CSV, suppression.
  try {
    await connecterNavigateur(equipe, COMPTES.admin);
    await admin.goto("/admin/demandes");
    await admin.getByRole("link", { name: /Inscriptions à l’ouverture/ }).click();
    const ligne = admin.getByRole("listitem", { name: `Inscription de ${email}` });
    await expect(ligne).toContainText("Dr Essai F17 bis");
    await expect(ligne).toContainText("06 12 34 56 78");
    await expect(ligne).toContainText("Plutôt le matin.");
    await verifierAccessibilite(admin);

    const csv = await admin.request.get("/admin/demandes/ouverture/export");
    expect(csv.headers()["content-type"]).toContain("text/csv");
    expect(await csv.text()).toContain(`Dr Essai F17 bis;${email};06 12 34 56 78;"Rappelez-moi pour un Holter.`);

    await ligne.getByRole("button", { name: `Supprimer l’inscription de ${email}` }).click();
    await expect(admin.getByRole("status")).toContainText("Inscription supprimée");
    expect(await requete("site", `SELECT 1 FROM inscription_ouverture WHERE email = $1`, [email])).toHaveLength(0);
  } finally {
    await requete("site", `DELETE FROM inscription_ouverture WHERE email = $1`, [email]);
    await requete("site", `DELETE FROM consentement WHERE email = $1`, [email]);
  }
});
