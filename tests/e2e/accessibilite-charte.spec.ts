import { expect, test, type Page } from "@playwright/test";
import { COMPTES, connecterNavigateur } from "./session";

// T096 (principe VIII) : sur chaque page disponible, les éléments interactifs mesurent au moins
// 44 × 44 px, le focus est visible au clavier, et avec « animations réduites » aucune animation
// ne se joue. Chaque module ajoute ses pages à ces listes.

const PAGES_PUBLIQUES = [
  "/",
  "/connexion",
  "/demo/contact?moyen=appel",
  "/catalogue",
  "/holter-ecg",
  "/accessoires-consommables",
  "/services",
  "/qui-sommes-nous",
  "/recherche?q=oscar",
  "/cookies",
  "/inscription",
  "/mot-de-passe-oublie",
  "/holter-tensionnel/suntech-oscar-2",
  "/accessoires-consommables/electrodes-holter",
  "/holter-ecg/ecg-de-repos",
  "/services/installation-formation",
  "/panier",
];
const PAGES_MON_COMPTE = ["/mon-compte", "/mon-compte/informations", "/mon-compte/adresses", "/mon-compte/preferences", "/mon-compte/securite", "/mon-compte/donnees", "/mon-compte/commandes", "/mon-compte/factures", "/mon-compte/locations", "/mon-compte/financements", "/financement/demande?article=EC-DMS-3004L"];
const PAGES_BACK_OFFICE = [
  "/admin",
  "/admin/demonstration",
  "/admin/demonstration/parametres-commerciaux",
  "/admin/demonstration/pannes",
  "/admin/demonstration/paiements",
  "/admin/demonstration/acces",
  "/admin/demonstration/reinitialiser",
  "/admin/contenus",
  "/admin/contenus/bandeau",
  "/admin/contenus/coordonnees",
  "/admin/comptes",
  "/admin/comptes/demandes",
  "/admin/comptes/reglages",
  "/admin/comptes/rgpd",
  "/admin/catalogue",
  "/admin/catalogue/EC-SUN-OSCAR2",
  "/admin/catalogue/sous-categories",
  "/admin/catalogue/services",
  "/admin/commandes",
  "/admin/financements",
];

async function ciblesTropPetites(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const fautes: string[] = [];
    const selecteur = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"]';
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(selecteur))) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || el.closest("[aria-hidden=true]")) continue;
      if (el.classList.contains("sr-only")) continue;
      const cible = el.closest("label") ?? el;
      const r = cible.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      // Liens dans un paragraphe : exemption WCAG 2.5.8 pour les liens en ligne dans un texte.
      if (el.tagName === "A" && style.display === "inline" && el.closest("p, li") && !el.className.includes("ec-btn")) continue;
      if (r.height < 44 || r.width < 44) {
        fautes.push(`${el.tagName.toLowerCase()} « ${(el.textContent || el.getAttribute("aria-label") || el.getAttribute("name") || "").trim().slice(0, 40)} » ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
    }
    return fautes;
  });
}

async function focusVisible(page: Page): Promise<string[]> {
  const fautes: string[] = [];
  await page.locator("body").click({ position: { x: 1, y: 1 } });
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press("Tab");
    const etat = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      // L'outil de développement de Next.js (absent en production) est ignoré.
      if (!el || el === document.body || el.tagName === "NEXTJS-PORTAL") return null;
      const s = getComputedStyle(el);
      const visible = (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) >= 2) || s.boxShadow !== "none";
      return { visible, nom: `${el.tagName.toLowerCase()} ${(el.textContent || "").trim().slice(0, 30)}` };
    });
    if (etat && !etat.visible) fautes.push(etat.nom);
  }
  return fautes;
}

async function animationsActives(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      Array.from(document.querySelectorAll("*")).filter((el) => {
        const s = getComputedStyle(el);
        const duree = (v: string) => Math.max(...v.split(",").map((x) => parseFloat(x) || 0));
        return (s.animationName !== "none" && duree(s.animationDuration) > 0.01) || duree(s.transitionDuration) > 0.01;
      }).length,
  );
}

async function verifierPage(page: Page, chemin: string) {
  await page.goto(chemin);
  expect(await ciblesTropPetites(page), `${chemin} : cibles de moins de 44 px`).toEqual([]);
  expect(await focusVisible(page), `${chemin} : focus non visible`).toEqual([]);
  expect(await animationsActives(page), `${chemin} : animations malgré « animations réduites »`).toBe(0);
}

test.use({ colorScheme: "light", reducedMotion: "reduce" });

test("pages publiques : cibles, focus et animations", async ({ page }) => {
  for (const chemin of PAGES_PUBLIQUES) await verifierPage(page, chemin);
});

test("Mon compte : cibles, focus et animations", async ({ page, context }) => {
  test.setTimeout(120_000);
  await connecterNavigateur(context, COMPTES.clientSansDroits);
  for (const chemin of PAGES_MON_COMPTE) await verifierPage(page, chemin);
});

test("back-office : cibles, focus et animations", async ({ page, context }) => {
  test.setTimeout(120_000);
  await connecterNavigateur(context, COMPTES.admin);
  for (const chemin of PAGES_BACK_OFFICE) await verifierPage(page, chemin);
});
