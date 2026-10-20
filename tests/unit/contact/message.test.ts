import { afterEach, describe, expect, it, vi } from "vitest";
import { composerLiens, messagePrerempli } from "@/lib/contact-whatsapp";

// T002 — message pré-rempli et liens (F09, FR-005, SC-005, SC-007, D2, D7).

afterEach(() => vi.unstubAllEnvs());

describe("message pré-rempli", () => {
  it("client connecté : Dr, nom, cabinet ; sans cabinet ; professeur ; compte de cabinet", () => {
    expect(messagePrerempli({ nom: "Camille Martin", cabinet: "Cabinet du Parc" })).toBe("Bonjour, je suis le Dr Camille Martin, cabinet Cabinet du Parc.");
    expect(messagePrerempli({ nom: "Camille Martin", cabinet: null })).toBe("Bonjour, je suis le Dr Camille Martin.");
    expect(messagePrerempli({ nom: "Jean Roux", cabinet: null, civilite: "Pr" })).toBe("Bonjour, je suis le Pr Jean Roux.");
    expect(messagePrerempli({ nom: "Jean Roux", cabinet: "Centre Cardio Sud", type: "cabinet" })).toBe("Bonjour, cabinet Centre Cardio Sud.");
  });

  it("visiteur : modèle à compléter", () => {
    expect(messagePrerempli(null)).toBe("Bonjour, je suis le Dr …, cabinet …");
  });

  it("caractères spéciaux et contrôles nettoyés ; rien d'autre que le nom et le cabinet", () => {
    const m = messagePrerempli({ nom: "  Zoé  d’Arc\n", cabinet: "Cardio & Co\t" });
    expect(m).toBe("Bonjour, je suis le Dr Zoé d’Arc, cabinet Cardio & Co.");
    expect(m).not.toMatch(/@|RPPS|\d{6,}/);
  });
});

describe("liens", () => {
  it("mode réel : tel: et wa.me avec le message encodé", () => {
    const l = composerLiens("+33 6 12 34 56 78", "Bonjour, je suis le Dr Zoé d’Arc, cabinet Cardio & Co.", false)!;
    expect(l.appeler).toBe("tel:+33612345678");
    expect(l.ecrire).toBe(`https://wa.me/33612345678?text=${encodeURIComponent("Bonjour, je suis le Dr Zoé d’Arc, cabinet Cardio & Co.")}`);
  });

  it("démonstration : page de démonstration, jamais de vrai numéro (SC-007) ; numéro absent → aucun lien (D7)", () => {
    const l = composerLiens("+33 6 00 00 00 00", "Bonjour", true)!;
    expect(l.appeler).toBe("/demo/contact?moyen=appel");
    expect(l.ecrire).toBe("/demo/contact?moyen=whatsapp");
    expect(composerLiens("", "Bonjour", false)).toBeNull();
    expect(composerLiens("   ", "Bonjour", true)).toBeNull();
  });
});
