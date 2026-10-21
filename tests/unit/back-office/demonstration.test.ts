import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { outilsDemonstrationDisponibles } from "@/connecteurs/demonstration";
import { peut, rubriquesVisibles } from "@/lib/droits";

// T024 — outils de démonstration (F13, US8, FR-027) : administrateur seul, absents en mode réel.

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((n) => {
    const p = join(dossier, n);
    return statSync(p).isDirectory() ? fichiers(p) : /\.tsx?$/.test(n) ? [p] : [];
  });
}

afterEach(() => vi.unstubAllEnvs());

describe("outils de démonstration", () => {
  it("réservés à l'administrateur", () => {
    expect(peut("admin", "demonstration", "modifier")).toBe(true);
    for (const role of ["commercial", "support", "client"]) expect(peut(role, "demonstration", "voir")).toBe(false);
  });

  it("absents du menu et indisponibles en mode réel", () => {
    expect(rubriquesVisibles("admin").some((m) => m.rubrique === "demonstration")).toBe(true);
    vi.stubEnv("CONNECTOR_ODOO", "real");
    expect(outilsDemonstrationDisponibles()).toBe(false);
    expect(rubriquesVisibles("admin").some((m) => m.rubrique === "demonstration")).toBe(false);
    vi.unstubAllEnvs();
    vi.stubEnv("SITE_MODE", "prod");
    expect(outilsDemonstrationDisponibles()).toBe(false);
  });

  it("chaque action serveur des outils passe par la garde de la démonstration (mode réel compris)", () => {
    const sans = fichiers("app/(back-office)/admin/demonstration")
      .filter((f) => readFileSync(f, "utf8").includes('"use server"'))
      .filter((f) => {
        const s = readFileSync(f, "utf8");
        const actions = s.split('"use server"').length - 1;
        const gardes = (s.match(/exigerDroit\("demonstration"/g) ?? []).length;
        // Fichier « use server » : une garde dans un auteur commun suffit ; actions en ligne : une par action.
        return s.trimStart().startsWith('"use server"') ? gardes === 0 : gardes < actions;
      });
    expect(sans).toEqual([]);
  });
});
