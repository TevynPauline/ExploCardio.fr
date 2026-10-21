import { describe, expect, it } from "vitest";
import { derniereActivite, estInactive, valeurActivite } from "@/lib/inactivite";

// T025 — inactivité de l'équipe (F13, D5) : cookie signé lié à la session, délai réglable.

describe("inactivité", () => {
  it("relit l'heure d'activité de la même session ; refuse une autre session ou un cookie altéré", () => {
    const v = valeurActivite("jeton-session-a", 1_700_000_000_000);
    expect(derniereActivite(v, "jeton-session-a")).toBe(1_700_000_000_000);
    expect(derniereActivite(v, "jeton-session-b")).toBeNull();
    expect(derniereActivite(v.replace("1700000000000", "1800000000000"), "jeton-session-a")).toBeNull();
    expect(derniereActivite(undefined, "jeton-session-a")).toBeNull();
  });

  it("inactive au-delà du délai seulement ; sans activité connue, la session continue", () => {
    const t = 1_700_000_000_000;
    expect(estInactive(t, t + 30 * 60_000, 30)).toBe(false);
    expect(estInactive(t, t + 30 * 60_000 + 1, 30)).toBe(true);
    expect(estInactive(t, t + 61_000, 1)).toBe(true);
    expect(estInactive(null, t, 1)).toBe(false);
  });
});
