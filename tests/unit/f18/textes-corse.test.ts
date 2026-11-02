import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// T005 — F18 (FR-004, SC-002) : plus aucun texte du site n'annonce la livraison « Corse comprise »
// (pages, composants, emails, contenus éditoriaux et légaux, contenus initiaux).

const DOSSIERS = ["src", "app", "contenus", "prisma/site/seed"];

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin);
    return /\.(tsx?|md|json)$/.test(nom) ? [chemin] : [];
  });
}

describe("textes du site", () => {
  it("ne mentionnent plus « Corse comprise »", () => {
    const fautifs = DOSSIERS.flatMap(fichiers).filter((f) => /corse\s+comprise/i.test(readFileSync(f, "utf8")));
    expect(fautifs).toEqual([]);
  });
});
