import { execSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// T021 (complément) — « (hors imagerie) » retiré de la signature partout (F16, FR-030, SC-009) :
// pages, emails, PDF générés, textes des pages et charte.

describe("signature", () => {
  it("aucune occurrence de « hors imagerie » dans le code, les textes et la charte", () => {
    const sortie = execSync(`grep -rli "hors imagerie" app src contenus docs/brand || true`, { encoding: "utf8" }).trim();
    // La charte garde seulement la trace de la décision.
    const fichiers = sortie.split("\n").filter(Boolean).filter((f) => f !== "docs/brand/design-system.md");
    expect(fichiers).toEqual([]);
    const charte = execSync(`grep -i "hors imagerie" docs/brand/design-system.md || true`, { encoding: "utf8" });
    expect(charte.trim().split("\n").filter(Boolean).every((l) => l.includes("retiré le 2026-10-25"))).toBe(true);
  });
});
