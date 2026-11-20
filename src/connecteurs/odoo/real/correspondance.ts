import { normaliser } from "./normaliser";

// Correspondance des catégories d'Odoo avec les rubriques du site (F14, R3). Paramètre de
// fonctionnement `catalogue.correspondance_categories` : { "chemin complet Odoo": "code" }.
// Une catégorie inclut ses sous-catégories ; la plus précise l'emporte.

export const RUBRIQUES = [
  { code: "holter-ecg", nom: "Holter ECG", ordre: 1 },
  { code: "mapa", nom: "Holter tensionnel / MAPA", ordre: 2 },
  { code: "effort", nom: "Épreuve / écho d'effort", ordre: 3 },
  { code: "ecg-repos", nom: "ECG de repos", ordre: 4 },
  { code: "accessoires", nom: "Accessoires & consommables", ordre: 5 },
] as const;

export type CodeRubrique = (typeof RUBRIQUES)[number]["code"];
export type Correspondance = Record<string, string>;

export const CORRESPONDANCE_PAR_DEFAUT: Correspondance = {
  "Holter ECG": "holter-ecg",
  MAPA: "mapa",
  ERGOS: "effort",
  Consommables: "accessoires",
};

const CODES = new Set<string>(RUBRIQUES.map((r) => r.code));
const RACINES = new Set(["all", "tous", "toutes"]);

/** Lit la valeur du paramètre ; une valeur illisible donne la correspondance par défaut. */
export function lireCorrespondance(json: string | null | undefined): Correspondance {
  if (!json) return CORRESPONDANCE_PAR_DEFAUT;
  try {
    const brut = JSON.parse(json) as unknown;
    if (!brut || typeof brut !== "object" || Array.isArray(brut)) return CORRESPONDANCE_PAR_DEFAUT;
    return Object.fromEntries(Object.entries(brut).filter(([, v]) => typeof v === "string" && CODES.has(v))) as Correspondance;
  } catch {
    return CORRESPONDANCE_PAR_DEFAUT;
  }
}

const segments = (chemin: string) => chemin.split("/").map(normaliser).filter(Boolean);

/**
 * Rubrique d'une catégorie Odoo et profondeur de la catégorie reliée dans son chemin (F27 : les
 * segments suivants forment ses sous-catégories).
 */
export function rattachementDe(cheminComplet: string, correspondance: Correspondance): { code: CodeRubrique; profondeur: number } | null {
  const chemin = segments(cheminComplet);
  // Catégorie racine d'Odoo (« All », « Tous ») : facultative dans la correspondance, pour que
  // « MAPA » et « All / MAPA » désignent la même catégorie.
  const racine = chemin.length > 1 && RACINES.has(chemin[0]!) ? 1 : 0;
  let meilleure: { profondeur: number; code: string } | null = null;
  for (const [cle, code] of Object.entries(correspondance)) {
    const k = segments(cle);
    const decalage = k.length && RACINES.has(k[0]!) ? 0 : racine;
    const prefixe = k.length > 0 && k.length + decalage <= chemin.length && k.every((s, i) => s === chemin[i + decalage]);
    if (prefixe && (!meilleure || k.length + decalage > meilleure.profondeur)) meilleure = { profondeur: k.length + decalage, code };
  }
  return meilleure && CODES.has(meilleure.code) ? { code: meilleure.code as CodeRubrique, profondeur: meilleure.profondeur } : null;
}

/** Rubrique d'une catégorie Odoo, d'après son chemin complet (« MAPA / Accessoires MAPA »). */
export function rubriqueDe(cheminComplet: string, correspondance: Correspondance): CodeRubrique | null {
  return rattachementDe(cheminComplet, correspondance)?.code ?? null;
}
