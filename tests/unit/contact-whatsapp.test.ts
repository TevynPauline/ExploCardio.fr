import { afterEach, describe, expect, it, vi } from "vitest";
import { liensContact, PAGE_CONTACT_DEMO } from "@/lib/contact-whatsapp";

// FR-033 : en démonstration, les boutons « Appeler » et « Écrire sur WhatsApp » ne contactent personne.
describe("liens de contact WhatsApp", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("renvoie vers la page de démonstration, avec le numéro fictif affiché", async () => {
    const liens = (await liensContact())!;
    expect(liens.demonstration).toBe(true);
    expect(liens.appeler.startsWith(PAGE_CONTACT_DEMO)).toBe(true);
    expect(liens.ecrire.startsWith(PAGE_CONTACT_DEMO)).toBe(true);
    expect(liens.numeroAffiche).toBe("+33 6 99 00 00 00");
  });

  it("en production, fabrique les liens d'appel et WhatsApp avec le message pré-rempli", async () => {
    vi.stubEnv("SITE_MODE", "prod");
    const liens = (await liensContact("Bonjour"))!;
    expect(liens.appeler).toBe("tel:+33699000000");
    expect(liens.ecrire).toBe("https://wa.me/33699000000?text=Bonjour");
  });
});
