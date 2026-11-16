import { describe, expect, it } from "vitest";
import { connecteur, ENV_PRODUCTION, fauxBrevo } from "./faux-brevo";

// T029 (F25, FR-013, R9) : reflet des consentements, jamais de liste de blocage.

describe("contacts réels", () => {
  it("attributs booléens en majuscules, mise à jour autorisée, aucune liste de blocage", async () => {
    const b = fauxBrevo();
    await connecteur(ENV_PRODUCTION, b.fetch).mettreAJourContact({ email: "a@b.fr", consentements: { newsletter: true, promotions: false } });
    expect(b.appels[0]!.chemin).toBe("/contacts");
    expect(b.appels[0]!.corps).toEqual({ email: "a@b.fr", attributes: { NEWSLETTER: true, PROMOTIONS: false }, updateEnabled: true });
    expect(JSON.stringify(b.appels[0]!.corps)).not.toContain("Blacklisted");
  });
});
