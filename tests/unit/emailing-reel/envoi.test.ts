import { describe, expect, it } from "vitest";
import { etiquetteCle } from "@/connecteurs/emailing/real/correspondance";
import type { EmailClient } from "@/connecteurs/emailing/interfaces";
import { connecteur, ENV_PRODUCTION, ENV_RECETTE, fauxBrevo } from "./faux-brevo";

// T019, T025 (F25, US1, US3) : corps d'envoi, données minimales, idempotence, désinscription.

const email = (famille: EmailClient["famille"] = "transactionnel", extra: Partial<EmailClient> = {}): EmailClient => ({
  modele: "commande_confirmee",
  famille,
  destinataire: "docteur@cabinet.fr",
  objet: "Votre commande C202611-0001",
  rendu: "<p>Merci</p>",
  texte: "Merci",
  declencheur: "commande payée",
  ...extra,
});

describe("envoi réel", () => {
  it("transmet uniquement l'expéditeur, le destinataire, l'objet, le rendu, le texte et les étiquettes", async () => {
    const b = fauxBrevo();
    const { envoiId } = await connecteur(ENV_PRODUCTION, b.fetch).envoyerEmail(email(), "cle-1");
    expect(envoiId).toBe("<m1@brevo>");
    expect(b.envois()[0]!.corps).toEqual({
      sender: { name: "ExploCardio.fr", email: "contact@explocardio.fr" },
      replyTo: { name: "ExploCardio.fr", email: "contact@explocardio.fr" },
      to: [{ email: "docteur@cabinet.fr" }],
      subject: "Votre commande C202611-0001",
      htmlContent: "<p>Merci</p>",
      textContent: "Merci",
      tags: [etiquetteCle("cle-1"), "famille:transactionnel", "modele:commande_confirmee"],
    });
  });

  it("même clé rejouée dans le processus : un seul envoi, même identifiant", async () => {
    const b = fauxBrevo();
    const c = connecteur(ENV_PRODUCTION, b.fetch);
    const a = await c.envoyerEmail(email(), "cle-2");
    const r = await c.envoyerEmail(email(), "cle-2");
    expect(r.envoiId).toBe(a.envoiId);
    expect(b.envois()).toHaveLength(1);
  });

  it("déjà parti (étiquette connue de Brevo, autre processus) : aucun nouvel envoi", async () => {
    const b = fauxBrevo({ evenements: [{ event: "requests", date: "2026-11-16T10:00:00Z", messageId: "<ancien@brevo>", tag: etiquetteCle("cle-3") }] });
    const { envoiId } = await connecteur(ENV_PRODUCTION, b.fetch).envoyerEmail(email(), "cle-3");
    expect(envoiId).toBe("<ancien@brevo>");
    expect(b.envois()).toHaveLength(0);
  });

  it("recette : destinataire hors liste refusé sans aucun appel", async () => {
    const b = fauxBrevo();
    await expect(connecteur(ENV_RECETTE, b.fetch).envoyerEmail(email(), "cle-4")).rejects.toMatchObject({ code: "OPERATION_REFUSED" });
    expect(b.appels).toHaveLength(0);
    await expect(connecteur(ENV_RECETTE, b.fetch).envoyerEmail(email("transactionnel", { destinataire: "equipe@explocardio.fr" }), "cle-5")).resolves.toBeTruthy();
  });

  it("service et commercial : désinscription en un clic ; transactionnel : aucune", async () => {
    const b = fauxBrevo();
    const c = connecteur(ENV_PRODUCTION, b.fetch);
    const url = "https://www.explocardio.fr/api/emails/desinscription?j=abc";
    await c.envoyerEmail(email("service", { desinscription: url }), "cle-6");
    await c.envoyerEmail(email("commercial", { desinscription: url }), "cle-7");
    await c.envoyerEmail(email("transactionnel", { desinscription: url }), "cle-8");
    const [service, commercial, transac] = b.envois();
    for (const e of [service, commercial]) {
      expect(e!.corps!.headers).toEqual({ "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" });
    }
    expect(transac!.corps!.headers).toBeUndefined();
  });
});
