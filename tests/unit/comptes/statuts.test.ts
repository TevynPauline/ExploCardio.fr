import { describe, expect, it } from "vitest";
import { peutCommander, transitionAutorisee } from "@/domaine/comptes/statuts";

// T009 (FR-010, FR-011, SC-001).
describe("statuts des comptes", () => {
  it.each([
    ["email_a_confirmer", "en_attente", true],
    ["en_attente", "valide", true],
    ["en_attente", "refuse", true],
    ["valide", "suspendu", true],
    ["suspendu", "valide", true],
    ["refuse", "supprime", true],
    ["email_a_confirmer", "valide", true],
    ["refuse", "valide", false],
    ["valide", "en_attente", false],
    ["supprime", "valide", false],
    ["suspendu", "refuse", false],
  ] as const)("%s → %s : %s", (de, vers, attendu) => {
    expect(transitionAutorisee(de, vers)).toBe(attendu);
  });

  it("SC-001 : seul un compte validé peut commander", () => {
    expect(peutCommander({ statut: "valide" }).autorise).toBe(true);
    for (const statut of ["email_a_confirmer", "en_attente", "refuse", "suspendu", "supprime"] as const) {
      const r = peutCommander({ statut });
      expect(r.autorise, statut).toBe(false);
      if (!r.autorise) expect(r.message.length).toBeGreaterThan(10);
    }
  });

  it("exception : mise à disposition express pour un compte en attente (FR-011)", () => {
    expect(peutCommander({ statut: "en_attente" }, { miseADispositionExpress: true }).autorise).toBe(true);
    expect(peutCommander({ statut: "refuse" }, { miseADispositionExpress: true }).autorise).toBe(false);
    expect(peutCommander({ statut: "email_a_confirmer" }, { miseADispositionExpress: true }).autorise).toBe(false);
  });

  it("le message d'un compte en attente parle de vérification en cours", () => {
    const r = peutCommander({ statut: "en_attente" });
    expect(!r.autorise && r.message).toContain("vérification");
  });
});
