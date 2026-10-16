import { afterAll, describe, expect, it } from "vitest";
import { dbSite } from "@/lib/db/site";
import { confirmerInscription, demanderInscription, desinscrire } from "@/domaine/newsletter";

// T053 (FR-028, R7) : double consentement, expiration à 7 jours, désinscription historisée.

function jetonDepuisBoite(rendu: string): string {
  const m = rendu.match(/confirmation\?jeton=([A-Za-z0-9_-]+)/);
  if (!m) throw new Error("lien de confirmation introuvable");
  return m[1]!;
}

async function dernierJeton(email: string): Promise<string> {
  const msg = await dbSite().messageDemonstration.findFirst({ where: { destinataire: email }, orderBy: { date: "desc" } });
  return jetonDepuisBoite(msg!.rendu);
}

describe("newsletter à double consentement", () => {
  const email = `newsletter-${Date.now()}@demo.explocardio.test`;
  afterAll(async () => {
    await dbSite().inscriptionNewsletter.deleteMany({ where: { email } });
    await dbSite().consentement.deleteMany({ where: { email } });
  });

  it("n'inscrit qu'après confirmation, puis historise consentement et désinscription", async () => {
    await demanderInscription(email);
    expect((await dbSite().inscriptionNewsletter.findUnique({ where: { email } }))?.etat).toBe("en_attente");
    const jeton = await dernierJeton(email);
    expect(await confirmerInscription(jeton)).toBe("confirmee");
    expect((await dbSite().inscriptionNewsletter.findUnique({ where: { email } }))?.etat).toBe("confirmee");
    expect(await dbSite().consentement.count({ where: { email, objet: "newsletter", etat: true } })).toBe(1);

    // Une nouvelle demande pour une adresse confirmée n'envoie rien de plus.
    const avant = await dbSite().messageDemonstration.count({ where: { destinataire: email } });
    await demanderInscription(email);
    expect(await dbSite().messageDemonstration.count({ where: { destinataire: email } })).toBe(avant);

    expect(await desinscrire(jeton)).toBe(true);
    expect((await dbSite().inscriptionNewsletter.findUnique({ where: { email } }))?.etat).toBe("desinscrite");
    expect(await dbSite().consentement.count({ where: { email, objet: "newsletter", etat: false } })).toBe(1);
  });

  it("un lien de plus de 7 jours a expiré ; un renvoi est limité à un toutes les 10 minutes", async () => {
    const autre = `expire-${email}`;
    const t0 = new Date();
    await demanderInscription(autre, t0);
    const jeton = await dernierJeton(autre);
    await demanderInscription(autre, new Date(t0.getTime() + 60_000));
    expect(await dbSite().messageDemonstration.count({ where: { destinataire: autre } })).toBe(1);
    expect(await confirmerInscription(jeton, new Date(t0.getTime() + 8 * 86_400_000))).toBe("expiree");
    await dbSite().inscriptionNewsletter.deleteMany({ where: { email: autre } });
  });
});
