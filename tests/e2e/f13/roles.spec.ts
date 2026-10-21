import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { verifierAccessibilite } from "../axe";
import { requete } from "../bases";
import { COMPTES, connecterNavigateur } from "../session";

// T006 / T024 — droits par rôle (F13, D2) : chaque rôle ne voit que ses rubriques ; une page
// interdite renvoie au tableau de bord avec « réservée à un autre rôle » ; outils de
// démonstration réservés à l'administrateur.

test.describe.configure({ timeout: 300_000, mode: "serial" });

const PAGES = ["/admin", "/admin/clients", "/admin/demandes", "/admin/demandes/messages", "/admin/devis", "/admin/financements", "/admin/catalogue", "/admin/contenus", "/admin/emails", "/admin/logiciels-cloud", "/admin/commandes", "/admin/locations", "/admin/parametres", "/admin/parametres/bienvenue", "/admin/equipe", "/admin/journal", "/admin/demonstration"];

const AUTORISEES: Record<"admin" | "commercial" | "support", string[]> = {
  admin: PAGES,
  commercial: ["/admin", "/admin/clients", "/admin/demandes", "/admin/demandes/messages", "/admin/devis", "/admin/financements", "/admin/catalogue", "/admin/contenus", "/admin/logiciels-cloud", "/admin/commandes", "/admin/locations", "/admin/parametres", "/admin/parametres/bienvenue"],
  support: ["/admin", "/admin/clients", "/admin/logiciels-cloud", "/admin/commandes", "/admin/locations"],
};

const MENU: Record<"admin" | "commercial" | "support", string[]> = {
  admin: ["À traiter", "Clients", "Demandes", "Catalogue", "Contenus", "Emails", "Logiciels Cloud", "Commandes et locations", "Paramètres", "Équipe", "Journal", "Démonstration"],
  commercial: ["À traiter", "Clients", "Demandes", "Catalogue", "Contenus", "Logiciels Cloud", "Commandes et locations", "Paramètres"],
  support: ["À traiter", "Clients", "Logiciels Cloud", "Commandes et locations"],
};

async function verifier(page: Page, context: BrowserContext, role: keyof typeof AUTORISEES, email: string) {
  await connecterNavigateur(context, email);
  await page.goto("/admin");
  const menu = page.getByRole("navigation", { name: /back-office/i });
  for (const libelle of MENU[role]) await expect(menu.getByRole("link", { name: libelle, exact: true })).toBeVisible();
  await expect(menu.getByRole("link")).toHaveCount(MENU[role].length);
  for (const chemin of PAGES) {
    await page.goto(chemin);
    if (AUTORISEES[role].includes(chemin)) {
      await expect(page, `${role} ${chemin}`).not.toHaveURL(/acces=refuse|\/connexion/);
      await expect(page.locator("main h1")).toBeVisible();
    } else {
      await expect(page, `${role} ${chemin}`).toHaveURL(/\/admin\?acces=refuse/);
      await expect(page.locator("main").getByRole("alert")).toContainText("réservée à un autre rôle");
    }
  }
}

test("administrateur : toutes les rubriques", async ({ page, context }) => {
  await verifier(page, context, "admin", COMPTES.admin);
  await page.goto("/admin");
  await verifierAccessibilite(page);
});

test("support : lecture des clients, commandes, accès Cloud ; rien d'autre", async ({ page, context }) => {
  await verifier(page, context, "support", COMPTES.support);
});

test("commercial : clients, demandes, catalogue, contenus, offre de bienvenue", async ({ page, context }) => {
  await requete("site", `UPDATE utilisateur SET role = 'commercial' WHERE email = $1`, [COMPTES.support]);
  try {
    await verifier(page, context, "commercial", COMPTES.support);
  } finally {
    await requete("site", `UPDATE utilisateur SET role = 'support' WHERE email = $1`, [COMPTES.support]);
  }
});
