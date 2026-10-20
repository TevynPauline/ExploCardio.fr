import { describe, expect, it } from "vitest";
import { CATALOGUE, type EntreeCatalogue } from "@/domaine/emailing/catalogue";
import { contactEmail } from "@/emails/contact";
import { EXEMPLES } from "@/emails/exemples";

// T010 — tous les modèles du catalogue, rendus avec leurs exemples (F10, SC-006, SC-011, FR-006,
// FR-025 à FR-030, FR-041) : charte, version texte, mentions, aucune donnée interdite.

/** Campagnes : texte propre à chacune (vérifiées dans les tests des campagnes). */
const RENDUS_DIFFERES = new Set(["campagne"]);
const entrees = Object.entries(CATALOGUE as Record<string, EntreeCatalogue>).filter(([code]) => !RENDUS_DIFFERES.has(code));

/** Suite de 13 à 19 chiffres valide selon Luhn, hors suites de zéros (IBAN fictifs). */
function contientNumeroDeCarte(texte: string): boolean {
  for (const m of texte.matchAll(/\b\d(?:[ -]?\d){12,18}\b/g)) {
    const chiffres = m[0].replace(/\D/g, "");
    if (/^0+$/.test(chiffres)) continue;
    let somme = 0;
    for (let i = 0; i < chiffres.length; i++) {
      let d = Number(chiffres[chiffres.length - 1 - i]);
      if (i % 2 === 1) d = d * 2 > 9 ? d * 2 - 9 : d * 2;
      somme += d;
    }
    if (somme % 10 === 0) return true;
  }
  return false;
}

describe("catalogue des modèles", () => {
  it("chaque modèle a un exemple, et chaque exemple est au catalogue", () => {
    expect(entrees.map(([code]) => code).filter((c) => !EXEMPLES[c])).toEqual([]);
    expect(Object.keys(EXEMPLES).filter((c) => !(c in CATALOGUE))).toEqual([]);
  });
});

describe.each(entrees)("modèle %s", (code, entree) => {
  it("respecte la charte et ne contient aucune donnée interdite", async () => {
    const email = await EXEMPLES[code]!();
    expect(email.modele).toBe(code);
    const { rendu, texte, objet } = email;
    expect(objet.length).toBeGreaterThan(0);
    expect(objet.length).toBeLessThanOrEqual(120);
    expect(rendu).toContain('alt="ExploCardio.fr"');
    expect(rendu).toContain('lang="fr"');
    expect(texte.trim().length).toBeGreaterThan(50);
    expect(rendu + texte).not.toMatch(/\{\{|\}\}|undefined|NaN|\[object Object\]/);
    // Expéditeur et mentions légales (FR-027)
    expect(texte).toMatch(/ExploCardio\.fr — Le spécialiste/);
    expect(texte).toMatch(/Mentions légales/);
    // Contact F09 (si un numéro est renseigné)
    if (await contactEmail()) expect(texte).toMatch(/Écrire sur WhatsApp/);
    // Données interdites (FR-030, SC-011)
    expect(contientNumeroDeCarte(texte)).toBe(false);
    expect(texte).not.toMatch(/mot de passe\s*:\s*\S/i);
    expect(texte.replace(/Ne transmettez aucune donnée patient\.?/g, "")).not.toMatch(/patient/i);
    // Montants en euros toujours qualifiés HT ou TTC (FR-029)
    expect(texte).not.toMatch(/\d\s?€(?!\s*(HT|TTC))/);
    if (entree.famille === "transactionnel") {
      // Aucune promotion dans un transactionnel (FR-006), pas de pied de préférences
      expect(texte).not.toMatch(/promotion|vente flash|offre spéciale|-\s?\d+\s?%/i);
      expect(texte).not.toMatch(/Gérer mes préférences/);
    } else {
      // Emails de service : pourquoi on le reçoit et comment le désactiver (FR-041)
      expect(texte).toMatch(/Vous recevez cet email parce que/);
      expect(texte).toMatch(/Gérer mes préférences/);
    }
  });
});
