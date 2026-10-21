import { lireFermeturesJson, lireHorairesJson } from "@/domaine/contact/horaires";
import type { DefinitionParametre } from "./catalogue";

// Validation des paramètres (F13, US4, R3) : la saisie du formulaire devient la valeur
// enregistrée, ou elle est refusée avec l'explication. Fonctions pures.

export class ParametreRefuse extends Error {}

export const JOURS_SEMAINE = [["1", "lundi"], ["2", "mardi"], ["3", "mercredi"], ["4", "jeudi"], ["5", "vendredi"], ["6", "samedi"], ["7", "dimanche"]] as const;

const HEURE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const EMAIL = /^[^\s@,]+@[^\s@,]+\.[^\s@,]{2,}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Lecture d'un champ du formulaire (`valeur` pour un champ simple, `valeur-<jour>` pour les horaires). */
export type Saisie = (nom: string) => string;

function dateValide(x: string): boolean {
  if (!DATE.test(x)) return false;
  const d = new Date(`${x}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === x;
}

function lignes(texte: string): string[] {
  return texte.split("\n").map((l) => l.trim()).filter(Boolean);
}

function listeJson(valeur: string): string[] {
  try {
    const l = JSON.parse(valeur || "[]") as unknown;
    return Array.isArray(l) ? l.map(String) : [];
  } catch {
    return [];
  }
}

/** Saisie du formulaire → valeur enregistrée ; `ParametreRefuse` si elle est incohérente. */
export function valider(p: DefinitionParametre, saisie: Saisie): string {
  const brut = saisie("valeur");
  const v = brut.trim();
  const refuser = (raison: string): never => {
    throw new ParametreRefuse(`${p.libelle} : ${raison}`);
  };
  switch (p.type) {
    case "heure":
      if (!HEURE.test(v)) refuser(`« ${v} » n'est pas une heure valide (format HH:MM, par exemple 14:00).`);
      return v;
    case "entier": {
      const n = Number(v);
      if (!/^-?\d+$/.test(v) || n < (p.min ?? 0) || n > (p.max ?? Number.MAX_SAFE_INTEGER)) refuser(`nombre entier entre ${p.min ?? 0} et ${p.max} attendu.`);
      return String(n);
    }
    case "booleen":
      return v === "oui" || v === "true" ? "true" : "false";
    case "texte":
      if (v.length > (p.max ?? 1000)) refuser(`${p.max ?? 1000} caractères au plus (actuellement ${v.length}).`);
      return v;
    case "telephone":
      if (v && !/^\+[1-9][0-9 ().-]{6,20}$/.test(v)) refuser("numéro au format international attendu, par exemple +33 6 12 34 56 78.");
      return v;
    case "email":
      if (v && !EMAIL.test(v)) refuser("adresse email invalide.");
      return v;
    case "emails": {
      const liste = v.split(",").map((x) => x.trim()).filter(Boolean);
      const invalide = liste.find((x) => !EMAIL.test(x));
      if (invalide) refuser(`« ${invalide} » n'est pas une adresse email valide.`);
      return liste.join(", ");
    }
    case "url":
      if (!/^(https:\/\/[^\s]+|\/[A-Za-z0-9/_-]*)$/.test(v)) refuser("adresse https://… ou chemin du site commençant par / attendu.");
      return v;
    case "iban": {
      const iban = v.replace(/\s+/g, "").toUpperCase();
      if (iban && !/^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(iban)) refuser("format invalide.");
      return iban;
    }
    case "bic": {
      const bic = v.toUpperCase();
      if (bic && !/^[A-Z0-9]{8}([A-Z0-9]{3})?$/.test(bic)) refuser("format invalide (8 ou 11 caractères).");
      return bic;
    }
    case "dates": {
      const jours = brut.split(/\s+/).map((x) => x.trim()).filter(Boolean);
      const invalide = jours.find((x) => !dateValide(x));
      if (invalide) refuser(`« ${invalide} » n'est pas une date AAAA-MM-JJ.`);
      return JSON.stringify([...new Set(jours)].sort());
    }
    case "zones": {
      const zones = v.split(",").map((x) => x.trim()).filter(Boolean);
      const invalide = zones.find((z) => !/^\d{2,5}$/.test(z));
      if (invalide) refuser(`« ${invalide} » n'est pas un début de code postal (par exemple 20).`);
      return JSON.stringify([...new Set(zones)]);
    }
    case "liste": {
      const elements = lignes(brut);
      if (!elements.length) refuser("indiquez au moins une ligne.");
      const vus = new Set<string>();
      for (const e of elements) {
        if (vus.has(e.toLowerCase())) refuser(`« ${e} » figure deux fois.`);
        vus.add(e.toLowerCase());
      }
      return JSON.stringify(elements);
    }
    case "horaires": {
      const horaires: Record<string, [string, string][]> = {};
      for (const [j, nom] of JOURS_SEMAINE) {
        horaires[j] = [];
        const jour = saisie(`valeur-${j}`).trim();
        for (const plage of jour ? jour.split(/[,;]\s*/) : []) {
          const m = /^([01]\d|2[0-3]):([0-5]\d)\s*-\s*([01]\d|2[0-3]):([0-5]\d)$/.exec(plage.trim());
          if (!m || `${m[1]}:${m[2]}` >= `${m[3]}:${m[4]}`) refuser(`${nom} : « ${plage} » n'est pas une plage valide (par exemple 09:00-18:00).`);
          horaires[j].push([`${m![1]}:${m![2]}`, `${m![3]}:${m![4]}`]);
        }
      }
      return JSON.stringify(horaires);
    }
    case "fermetures":
      return JSON.stringify(
        lignes(brut).map((l) => {
          const m = /^(\d{4}-\d{2}-\d{2})\s+(\d{4}-\d{2}-\d{2})\s*(.*)$/.exec(l);
          if (!m || !dateValide(m[1]!) || !dateValide(m[2]!) || m[1]! > m[2]!) refuser(`« ${l} » attendu sous la forme AAAA-MM-JJ AAAA-MM-JJ motif.`);
          return { du: m![1]!, au: m![2]!, ...(m![3] ? { motif: m![3].slice(0, 80) } : {}) };
        }),
      );
  }
}

/** Valeur enregistrée → contenu des champs du formulaire. */
export function versSaisie(p: DefinitionParametre, valeur: string): Record<string, string> {
  switch (p.type) {
    case "dates":
    case "liste":
      return { valeur: listeJson(valeur).join("\n") };
    case "zones":
      return { valeur: listeJson(valeur).join(", ") };
    case "horaires": {
      const h = lireHorairesJson(valeur || null);
      return Object.fromEntries(JOURS_SEMAINE.map(([j]) => [`valeur-${j}`, h[j].map(([d, f]) => `${d}-${f}`).join(", ")]));
    }
    case "fermetures":
      return { valeur: lireFermeturesJson(valeur || "[]").map((f) => `${f.du} ${f.au}${f.motif ? ` ${f.motif}` : ""}`).join("\n") };
    default:
      return { valeur };
  }
}

/** Valeur lisible dans l'historique. */
export function afficher(p: DefinitionParametre, valeur: string | null): string {
  if (valeur === null || valeur === "") return "(vide)";
  if (p.type === "booleen") return valeur === "true" ? "Oui" : "Non";
  if (p.type === "horaires") {
    const s = versSaisie(p, valeur);
    return JOURS_SEMAINE.map(([j, nom]) => `${nom} ${s[`valeur-${j}`] || "fermé"}`).join(" ; ");
  }
  const s = versSaisie(p, valeur).valeur ?? valeur;
  return s.replace(/\n/g, " ; ") || "(vide)";
}
