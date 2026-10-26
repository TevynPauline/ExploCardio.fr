import { describe, expect, it } from "vitest";
import { dbSite } from "@/lib/db/site";
import { ecrireParametre } from "@/lib/parametres";
import { MESSAGE_INSCRIPTION_IMPOSSIBLE, confirmerEmail, inscrire, purgerNonConfirmes } from "@/domaine/comptes/inscription";
import { saisieDeTest } from "./outils";

// T014 (US1, FR-001 à FR-009, SC-003, SC-012) ; F16 : sans RPPS, SIRET ou SIREN facultatif.

async function compteDe(email: string) {
  return dbSite().compteClient.findFirstOrThrow({ where: { utilisateur: { email } }, include: { adresses: true, utilisateur: true } });
}

describe("inscription", () => {
  it("crée utilisateur, compte « email à confirmer », trois adresses et les consentements", async () => {
    const s = saisieDeTest();
    expect(await inscrire(s)).toEqual({ ok: true, email: s.email });
    const c = await compteDe(s.email);
    expect(c.statut).toBe("email_a_confirmer");
    expect(c.rpps).toBeNull();
    expect(c.siret).toBeNull();
    expect(c.numeroVerification).toBeNull();
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

  it("SC-012 : email déjà utilisé → message neutre", async () => {
    const s = saisieDeTest();
    await inscrire(s);
    const memeEmail = await inscrire({ ...saisieDeTest(), email: s.email });
    expect(memeEmail).toEqual({ ok: false, erreurs: {}, message: MESSAGE_INSCRIPTION_IMPOSSIBLE });
  });

  it("SIRET ou SIREN facultatif, vérifié dans sa forme, partageable entre deux comptes, « à vérifier »", async () => {
    const invalide = await inscrire(saisieDeTest({ numero: "10003456789" }));
    expect(invalide.ok).toBe(false);
    const siret = "73282932000074";
    const a = saisieDeTest({ numero: siret });
    const b = saisieDeTest({ numero: "732 829 320 00074" });
    expect((await inscrire(a)).ok && (await inscrire(b)).ok).toBe(true);
    expect((await compteDe(a.email)).numeroVerification).toBe("a_verifier");
    expect((await compteDe(b.email)).siret).toBe(siret);
    await dbSite().utilisateur.deleteMany({ where: { email: { in: [a.email, b.email] } } });
  });

  it("paramètre « dès l'inscription » : le numéro devient obligatoire", async () => {
    await ecrireParametre("comptes.numero_exige", "inscription", null);
    try {
      const r = await inscrire(saisieDeTest());
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.erreurs.numero).toMatch(/SIRET ou le SIREN/);
    } finally {
      await ecrireParametre("comptes.numero_exige", "premiere_commande", null);
    }
  });

  it("confirmation de l'email : compte validé aussitôt, fiche Odoo créée, sans email « compte validé »", async () => {
    const s = saisieDeTest();
    await inscrire(s);
    const c = await compteDe(s.email);
    await confirmerEmail(c.utilisateurId);
    const valide = await compteDe(s.email);
    expect(valide.statut).toBe("valide");
    expect(valide.odooPartnerRef).toMatch(/^FICT-P-/);
    expect(await dbSite().messageDemonstration.count({ where: { destinataire: s.email, objet: "Votre compte est validé" } })).toBe(0);
  });

  it("purge les comptes non confirmés depuis 30 jours", async () => {
    const s = saisieDeTest();
    await inscrire(s);
    await dbSite().compteClient.updateMany({ where: { utilisateur: { email: s.email } }, data: { creeLe: new Date(Date.now() - 31 * 86_400_000) } });
    expect(await purgerNonConfirmes()).toBeGreaterThanOrEqual(1);
    expect(await dbSite().compteClient.count({ where: { utilisateur: { email: s.email } } })).toBe(0);
  });
});
