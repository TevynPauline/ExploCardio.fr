import { describe, expect, it } from "vitest";
import { messageVisible } from "@/domaine/contenus";

// T032 (FR-002) : un message est visible s'il est publié et dans sa période.
describe("visibilité des messages du bandeau", () => {
  const maintenant = new Date("2026-10-15T12:00:00Z");
  const jour = 86_400_000;

  it.each([
    ["publié sans dates", { etat: "publie", debut: null, fin: null }, true],
    ["retiré", { etat: "retire", debut: null, fin: null }, false],
    ["pas encore commencé", { etat: "publie", debut: new Date(maintenant.getTime() + jour), fin: null }, false],
    ["terminé", { etat: "publie", debut: null, fin: new Date(maintenant.getTime() - jour) }, false],
    ["dans sa période", { etat: "publie", debut: new Date(maintenant.getTime() - jour), fin: new Date(maintenant.getTime() + jour) }, true],
  ])("%s", (_cas, message, attendu) => {
    expect(messageVisible(message, maintenant)).toBe(attendu);
  });
});
