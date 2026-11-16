import { describe, expect, it } from "vitest";
import { connecteur, ENV_PRODUCTION, fauxBrevo } from "./faux-brevo";

// T022 (F25, US2) : lecture du suivi par message.

describe("suivi réel", () => {
  it("lit les événements du message et les traduit", async () => {
    const b = fauxBrevo({ evenements: [
      { event: "requests", date: "2026-11-16T10:00:00Z", messageId: "<x@brevo>" },
      { event: "delivered", date: "2026-11-16T10:00:05Z", messageId: "<x@brevo>" },
      { event: "opened", date: "2026-11-16T11:00:00Z", messageId: "<x@brevo>" },
    ] });
    const s = await connecteur(ENV_PRODUCTION, b.fetch).lireSuivi("<x@brevo>");
    expect(s).toMatchObject({ etat: "remis", plainte: false });
    expect(s.ouvertLe?.toISOString()).toBe("2026-11-16T11:00:00.000Z");
    expect(b.appels[0]!.params.get("messageId")).toBe("<x@brevo>");
    expect(b.appels[0]!.params.get("days")).toBe("7");
  });

  it("message inconnu : NotFound ; tout juste envoyé par ce processus : envoyé", async () => {
    const b = fauxBrevo();
    const c = connecteur(ENV_PRODUCTION, b.fetch);
    await expect(c.lireSuivi("<inconnu@brevo>")).rejects.toMatchObject({ code: "NOT_FOUND" });
    const { envoiId } = await c.envoyerEmail({ modele: "essai", famille: "transactionnel", destinataire: "a@b.fr", objet: "o", rendu: "<p>r</p>", texte: "r", declencheur: "t" }, "cle-suivi");
    await expect(c.lireSuivi(envoiId)).resolves.toMatchObject({ etat: "envoye" });
  });
});
