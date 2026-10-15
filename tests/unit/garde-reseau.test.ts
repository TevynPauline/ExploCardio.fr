import { afterEach, describe, expect, it, vi } from "vitest";
import {
  activerGardeReseau,
  desactiverGardeReseau,
  motifDeBlocage,
  RequeteSortanteBloquee,
} from "@/connecteurs/garde-reseau";

// T047 : en mode démonstration, une requête vers un domaine de service réel est refusée et
// journalisée comme erreur (SC-003) ; Google Fonts est toujours refusé (SC-014).

const demo = { CONNECTOR_ODOO: "demo", CONNECTOR_STRIPE: "demo", CONNECTOR_PCA: "demo", CONNECTOR_EMAILING: "demo" };

describe("garde réseau", () => {
  afterEach(() => desactiverGardeReseau());

  it.each([
    "https://api.stripe.com/v1/checkout/sessions",
    "https://explocardio.odoo.com/json/2/res.partner",
    "https://api.brevo.com/v3/smtp/email",
    "https://fonts.googleapis.com/css2?family=Inter",
    "https://fonts.gstatic.com/s/inter/v1.woff2",
  ])("bloque %s quand les connecteurs sont en démonstration", (url) => {
    expect(motifDeBlocage(url, demo)).not.toBeNull();
  });

  it("bloque l'adresse Odoo configurée, même sur un domaine propre", () => {
    expect(motifDeBlocage("https://erp.explocardio.fr/json/2", { ...demo, ODOO_URL: "https://erp.explocardio.fr" })).not.toBeNull();
  });

  it("laisse passer un service en mode réel, mais jamais Google Fonts", () => {
    const reel = { ...demo, CONNECTOR_STRIPE: "real" };
    expect(motifDeBlocage("https://api.stripe.com/v1/charges", reel)).toBeNull();
    expect(motifDeBlocage("https://fonts.googleapis.com/css2", reel)).not.toBeNull();
  });

  it("laisse passer les adresses sans rapport", () => {
    expect(motifDeBlocage("http://localhost:3000/api/auth/session", demo)).toBeNull();
  });

  it("refuse l'appel fetch et le journalise comme erreur", async () => {
    const journal = vi.spyOn(console, "error").mockImplementation(() => {});
    activerGardeReseau(demo);
    await expect(fetch("https://api.stripe.com/v1/charges")).rejects.toBeInstanceOf(RequeteSortanteBloquee);
    expect(journal).toHaveBeenCalledWith(expect.stringContaining("api.stripe.com bloqué"));
    journal.mockRestore();
  });
});
