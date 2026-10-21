import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { peut } from "@/lib/droits";

// T002 — matrice des droits (F13, D2, contracts/droits.md, SC-003, SC-008) et contrôle statique :
// toute action serveur du back-office vérifie un droit avant tout effet.

const ROLES = ["admin", "commercial", "support"] as const;
type Ligne = [string, string, string, string];
// rubrique, admin, commercial, support ("" = aucun accès, "V" = voir, "VM" = voir et modifier)
const ATTENDU: Ligne[] = [
  ["clients", "VM", "VM", "V"],
  ["comptes.valider", "VM", "VM", ""],
  ["comptes.suspendre", "VM", "", ""],
  ["comptes.rgpd", "VM", "", ""],
  ["demandes", "VM", "VM", ""],
  ["catalogue", "VM", "VM", ""],
  ["contenus", "VM", "VM", ""],
  ["commandes", "V", "V", "V"],
  ["cloud", "VM", "V", "VM"],
  ["cloud.agir", "VM", "", "VM"],
  ["emails", "VM", "", ""],
  ["parametres.bienvenue", "VM", "VM", ""],
  ["parametres", "VM", "V", ""],
  ["equipe", "VM", "", ""],
  ["journal", "V", "", ""],
  ["demonstration", "VM", "", ""],
];

describe("matrice des droits", () => {
  it.each(ATTENDU)("%s", (droit, ...attendus) => {
    ROLES.forEach((role, i) => {
      const a = attendus[i]!;
      expect(peut(role, droit as never, "voir"), `${role} voir ${droit}`).toBe(a.includes("V"));
      expect(peut(role, droit as never, "modifier"), `${role} modifier ${droit}`).toBe(a.includes("M"));
    });
  });

  it("un client ou un visiteur n'a aucun droit", () => {
    for (const [droit] of ATTENDU) {
      expect(peut("client", droit as never, "voir")).toBe(false);
      expect(peut(null, droit as never, "voir")).toBe(false);
    }
  });
});

/** Fichiers « use server » du back-office. */
function fichiersActions(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiersActions(chemin);
    return /\.tsx?$/.test(nom) && readFileSync(chemin, "utf8").includes('"use server"') ? [chemin] : [];
  });
}

const GARDE = /exigerDroit\(|auteurAvecDroit\(|exigerAdministrateur\(/;

describe("toute action du back-office vérifie un droit", () => {
  const fichiers = fichiersActions(join("app", "(back-office)", "admin"));
  it("des fichiers d'actions existent", () => expect(fichiers.length).toBeGreaterThan(5));

  it.each(fichiers)("%s", (fichier) => {
    const source = readFileSync(fichier, "utf8");
    // Fonctions locales qui vérifient un droit, directement ou par une autre (ex. « executer » → « auteur »).
    const fonctions = [...source.matchAll(/(?:async )?function (\w+)\([^)]*\)[^{]*\{([\s\S]*?)\n\}/g)].map((m) => ({ nom: m[1]!, corps: m[2]! }));
    const assistants = new Set<string>();
    for (let change = true; change; ) {
      change = false;
      for (const f of fonctions) {
        if (assistants.has(f.nom)) continue;
        const appel = [...assistants].some((n) => new RegExp(`\\b${n}\\(`).test(f.corps));
        if (GARDE.test(f.corps) || appel) {
          assistants.add(f.nom);
          change = true;
        }
      }
    }
    const garde = new RegExp(`${GARDE.source}|\\b(${[...assistants].join("|") || "§"})\\(`);
    const sansGarde = [...source.matchAll(/export async function (\w+)\([^)]*\)[^{]*\{([\s\S]*?)\n\}/g)]
      .filter((m) => !garde.test(m[2]!))
      .map((m) => m[1]);
    expect(sansGarde).toEqual([]);
  });
});
