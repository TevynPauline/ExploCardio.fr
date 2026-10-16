import { describe, expect, it } from "vitest";
import { dbSite } from "@/lib/db/site";
import { ecrireParametre } from "@/lib/parametres";
import { MESSAGE_INSCRIPTION_IMPOSSIBLE, confirmerEmail, inscrire, purgerNonConfirmes } from "@/domaine/comptes/inscription";
import { refuser } from "@/domaine/comptes/validation";
import { rppsDeTest, saisieDeTest } from "./outils";

// T014 (US1, FR-001 à FR-009, SC-003, SC-012).

async function compteDe(email: string) {
  return dbSite().compteClient.findFirstOrThrow({ where: { utilisateur: { email } }, include: { adresses: true, utilisateur: true } });
}

describe("inscription", () => {
  it("crée utilisateur, compte « email à confirmer », trois adresses et les consentements", async () => {
    const s = saisieDeTest();
    expect(await inscrire(s)).toEqual({ ok: true, email: s.email });
    const c = await compteDe(s.email);
    expect(c.statut).toBe("email_a_confirmer");
    expect(c.rpps).toBe(s.numero);
    expect(c.adresses.map((a) => a.type).sort()).toEqual(["cabinet", "facturation", "livraison"]);
    expect(c.utilisateur.emailVerified).toBe(false);
    const consentements = await dbSite().consentement.findMany({ where: { compteId: c.id } });
    expect(consentements.map((x) => x.objet).sort()).toEqual(["cgu_cgv", "newsletter"]);
    for (const x of consentements) {
      expect(x.origine).toBe("inscription");
      expect(x.textePresente.length).toBeGreaterThan(20);
    }
    const email = await dbSite().messageDemonstration.findFirst({ where: { destinataire: s.email } });
    expect(email?.objet).toContain("Confirmez");
  });

  it("refuse les saisies invalides champ par champ, sans rien créer", async () => {
    const s = saisieDeTest({
      numero: "123",
      motDePasse: "court",
      adresseLivraison: { ligne1: "1 rue de la Réunion", codePostal: "97400", ville: "Saint-Denis" },
      cguCgv: false,
    });
    const r = await inscrire(s);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(Object.keys(r.erreurs)).toEqual(expect.arrayContaining(["numero", "motDePasse", "adresseLivraison.codePostal", "cguCgv"]));
    }
    expect(await dbSite().utilisateur.findUnique({ where: { email: s.email } })).toBeNull();
  });

  it("SC-012 : email ou RPPS déjà utilisés → le même message neutre", async () => {
    const s = saisieDeTest();
    await inscrire(s);
    const memeEmail = await inscrire({ ...saisieDeTest(), email: s.email });
    const memeRpps = await inscrire({ ...saisieDeTest(), numero: s.numero });
    expect(memeEmail).toEqual({ ok: false, erreurs: {}, message: MESSAGE_INSCRIPTION_IMPOSSIBLE });
    expect(memeRpps).toEqual(memeEmail);
  });

  it("deux inscriptions simultanées avec le même RPPS : une seule aboutit", async () => {
    const rpps = rppsDeTest();
    const resultats = await Promise.all([1, 2].map((i) => inscrire(saisieDeTest({ numero: rpps, email: `simultane-${i}-${rpps}@demo.explocardio.test` }))));
    expect(resultats.filter((r) => r.ok)).toHaveLength(1);
    expect(await dbSite().compteClient.count({ where: { rpps } })).toBe(1);
  });

  it("un SIRET peut être partagé par deux structures", async () => {
    const siret = "73282932000074";
    const a = await inscrire(saisieDeTest({ type: "structure", numero: siret }));
    const b = await inscrire(saisieDeTest({ type: "structure", numero: siret }));
    expect(a.ok && b.ok).toBe(true);
    await dbSite().utilisateur.deleteMany({ where: { compteClient: { siret } } });
  });

  it("la réinscription d'un RPPS refusé est signalée à l'équipe", async () => {
    const s = saisieDeTest();
    await inscrire(s);
    const c = await compteDe(s.email);
    await confirmerEmail(c.utilisateurId);
    await refuser(c.id, { id: "test", libelle: "test" }, "Numéro non vérifiable");
    const avant = await dbSite().messageDemonstration.count({ where: { objet: "Réinscription d'un compte refusé" } });
    await inscrire({ ...saisieDeTest(), numero: s.numero });
    expect(await dbSite().messageDemonstration.count({ where: { objet: "Réinscription d'un compte refusé" } })).toBe(avant + 1);
  });

  it("confirmation de l'email : « en attente », équipe prévenue ; en validation automatique : validé", async () => {
    const s = saisieDeTest();
    await inscrire(s);
    const c = await compteDe(s.email);
    await confirmerEmail(c.utilisateurId);
    expect((await compteDe(s.email)).statut).toBe("en_attente");

    await ecrireParametre("comptes.validation_auto", "true", null);
    try {
      const auto = saisieDeTest();
      await inscrire(auto);
      const ca = await compteDe(auto.email);
      await confirmerEmail(ca.utilisateurId);
      const valide = await compteDe(auto.email);
      expect(valide.statut).toBe("valide");
      expect(valide.odooPartnerRef).toMatch(/^FICT-P-/);
    } finally {
      await ecrireParametre("comptes.validation_auto", "false", null);
    }
  });

  it("purge les comptes non confirmés depuis 30 jours ; le RPPS redevient libre", async () => {
    const s = saisieDeTest();
    await inscrire(s);
    await dbSite().compteClient.updateMany({ where: { rpps: s.numero }, data: { creeLe: new Date(Date.now() - 31 * 86_400_000) } });
    expect(await purgerNonConfirmes()).toBeGreaterThanOrEqual(1);
    expect(await dbSite().compteClient.count({ where: { rpps: s.numero } })).toBe(0);
  });
});
