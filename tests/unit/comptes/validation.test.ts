import { afterEach, describe, expect, it } from "vitest";
import { definirPanne } from "@/connecteurs/panne-simulee";
import { dbSite } from "@/lib/db/site";
import { inscrire } from "@/domaine/comptes/inscription";
import { peutCommander } from "@/domaine/comptes/statuts";
import { refuser, retablir, suspendre, valider } from "@/domaine/comptes/validation";
import { saisieDeTest, sirenDeTest } from "./outils";

// T021 (US2, FR-012 à FR-016).

const equipe = { id: "equipe-test", libelle: "Équipe de test" };

/**
 * Compte « en attente de validation » de l'ancienne règle (avant F16) : les décisions de l'équipe
 * (valider, refuser, suspendre, rétablir) restent possibles pour ces comptes.
 */
async function compteEnAttente(newsletter = false) {
  const s = saisieDeTest({ newsletter, numero: sirenDeTest() });
  await inscrire(s);
  const c = await dbSite().compteClient.findFirstOrThrow({ where: { utilisateur: { email: s.email } } });
  await dbSite().compteClient.update({ where: { id: c.id }, data: { statut: "en_attente" } });
  await dbSite().utilisateur.update({ where: { id: c.utilisateurId }, data: { emailVerified: true } });
  return { id: c.id, email: s.email, rpps: s.numero };
}

const statut = async (id: string) => (await dbSite().compteClient.findUniqueOrThrow({ where: { id } })).statut;

describe("validation des comptes", () => {
  afterEach(async () => {
    await definirPanne("odoo", false);
  });

  it("valider : statut, fiche client dans Odoo, décision, email, journal ; la commande est permise", async () => {
    const c = await compteEnAttente();
    expect(peutCommander({ statut: (await statut(c.id)) as "en_attente" }).autorise).toBe(false);
    await valider(c.id, equipe);
    const v = await dbSite().compteClient.findUniqueOrThrow({ where: { id: c.id } });
    expect(v.statut).toBe("valide");
    expect(v.odooPartnerRef).toMatch(/^FICT-P-/);
    expect(v.valideLe).toBeInstanceOf(Date);
    expect(await dbSite().decisionCompte.count({ where: { compteId: c.id, decision: "validation", auteurId: equipe.id } })).toBe(1);
    expect(await dbSite().journalAction.count({ where: { action: "comptes.valide", objet: c.id } })).toBe(1);
    expect(await dbSite().messageDemonstration.count({ where: { destinataire: c.email, objet: "Votre compte est validé" } })).toBe(1);
    expect(peutCommander({ statut: "valide" }).autorise).toBe(true);
  });

  it("Odoo indisponible : la validation est conservée, la fiche part dans la file d'attente", async () => {
    const c = await compteEnAttente();
    await definirPanne("odoo", true);
    await valider(c.id, equipe);
    const v = await dbSite().compteClient.findUniqueOrThrow({ where: { id: c.id } });
    expect(v.statut).toBe("valide");
    expect(v.odooPartnerRef).toBeNull();
  });

  it("refuser et suspendre exigent un motif ; emails envoyés ; rétablir", async () => {
    const a = await compteEnAttente();
    await expect(refuser(a.id, equipe, "")).rejects.toThrow(/motif/);
    await refuser(a.id, equipe, "Numéro RPPS introuvable dans l'annuaire");
    expect(await statut(a.id)).toBe("refuse");
    expect(await dbSite().messageDemonstration.count({ where: { destinataire: a.email, objet: "Votre demande de compte" } })).toBe(1);

    const b = await compteEnAttente();
    await valider(b.id, equipe);
    await expect(suspendre(b.id, equipe, "")).rejects.toThrow(/motif/);
    await suspendre(b.id, equipe, "Impayé");
    expect(await statut(b.id)).toBe("suspendu");
    expect(peutCommander({ statut: "suspendu" }).autorise).toBe(false);
    await retablir(b.id, equipe);
    expect(await statut(b.id)).toBe("valide");
  });

  it("transitions interdites refusées", async () => {
    const a = await compteEnAttente();
    await refuser(a.id, equipe, "Motif de test");
    await expect(valider(a.id, equipe)).rejects.toThrow(/impossible/);
    await expect(retablir(a.id, equipe)).rejects.toThrow(/suspendu/);
  });

  it("validation d'un compte abonné : le droit au cadeau s'ouvre", async () => {
    const c = await compteEnAttente(true);
    await valider(c.id, equipe);
    const a = await dbSite().attributionCadeau.findUnique({ where: { numero: c.rpps } });
    expect(a?.etat).toBe("droit_ouvert");
  });
});
