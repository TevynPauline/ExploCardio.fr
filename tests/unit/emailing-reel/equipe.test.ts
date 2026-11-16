import { afterEach, describe, expect, it, vi } from "vitest";
import { etiquetteCle } from "@/connecteurs/emailing/real/correspondance";
import { connecteur, ENV_PRODUCTION, fauxBrevo } from "./faux-brevo";

// T030 (F25, US5, FR-015) : notifications d'équipe par email ; SMS replié vers l'email.

afterEach(() => vi.restoreAllMocks());

describe("notifications d'équipe réelles", () => {
  it("un email par destinataire, texte échappé, identifiant du premier", async () => {
    const b = fauxBrevo();
    const { envoiId } = await connecteur(ENV_PRODUCTION, b.fetch).envoyerNotificationEquipe(
      { canal: "email", destinataires: ["a@explocardio.fr", "B@explocardio.fr"], objet: "Nouvelle demande", texte: "Dr <X>\nà rappeler", declencheur: "financement" },
      "notif-1",
    );
    expect(envoiId).toBe("<m1@brevo>");
    const [a, bb] = b.envois();
    expect(a!.corps).toMatchObject({ to: [{ email: "a@explocardio.fr" }], subject: "Nouvelle demande", htmlContent: "<p>Dr &lt;X&gt;<br>à rappeler</p>", textContent: "Dr <X>\nà rappeler" });
    expect((a!.corps!.tags as string[])[0]).toBe(etiquetteCle("notif-1:a@explocardio.fr"));
    expect((bb!.corps!.tags as string[])[0]).toBe(etiquetteCle("notif-1:b@explocardio.fr"));
  });

  it("SMS demandé : envoyé par email, objet préfixé, écart signalé", async () => {
    const avertir = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const b = fauxBrevo();
    await connecteur(ENV_PRODUCTION, b.fetch).envoyerNotificationEquipe({ canal: "sms", destinataires: ["a@explocardio.fr"], texte: "Impayé", declencheur: "impayé" }, "notif-2");
    expect(b.envois()[0]!.corps).toMatchObject({ subject: "[SMS] Notification" });
    expect(avertir).toHaveBeenCalled();
  });
});
