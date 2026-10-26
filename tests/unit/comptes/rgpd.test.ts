import { describe, expect, it } from "vitest";
import { dbDemo } from "@/lib/db/demo";
import { dbSite } from "@/lib/db/site";
import { confirmerEmail, inscrire } from "@/domaine/comptes/inscription";
import { exporter, supprimer, verifierMotDePasse } from "@/domaine/comptes/rgpd";
import { saisieDeTest, sirenDeTest } from "./outils";

// T038 (US6, FR-039 à FR-041).

async function compteValide() {
  // F16 : validé à la confirmation de l'email ; numéro d'entreprise saisi (cadeau de bienvenue).
  const s = saisieDeTest({ numero: sirenDeTest() });
  await inscrire(s);
  const c = await dbSite().compteClient.findFirstOrThrow({ where: { utilisateur: { email: s.email } } });
  await confirmerEmail(c.utilisateurId);
  return { ...(await dbSite().compteClient.findUniqueOrThrow({ where: { id: c.id } })), email: s.email, motDePasse: s.motDePasse };
}

describe("droits sur les données", () => {
  it("vérifie le mot de passe avant une opération sensible", async () => {
    const c = await compteValide();
    expect(await verifierMotDePasse(c.utilisateurId, c.motDePasse)).toBe(true);
    expect(await verifierMotDePasse(c.utilisateurId, "mauvais")).toBe(false);
  });

  it("export complet, sans donnée d'un autre compte ; demande journalisée", async () => {
    const c = await compteValide();
    const autre = await compteValide();
    const donnees = JSON.stringify(await exporter(c.id));
    expect(donnees).toContain(c.email);
    expect(donnees).toContain(c.rpps!);
    expect(donnees).toContain("consentements");
    expect(donnees).toContain("historiqueDeSécurité");
    expect(donnees).not.toContain(autre.email);
    expect(await dbSite().demandeRgpd.count({ where: { compteId: c.id, type: "export", etat: "traitee" } })).toBe(1);
  });

  it("suppression : connexion impossible, données anonymisées, partenaire archivé, numéro du cadeau conservé", async () => {
    const c = await compteValide();
    expect(await supprimer(c.id)).toEqual({ supprime: true });
    const u = await dbSite().utilisateur.findUniqueOrThrow({ where: { id: c.utilisateurId } });
    expect(u.email).toMatch(/@supprime\.invalid$/);
    expect(u.nom).toBeNull();
    expect(await dbSite().compteConnexion.count({ where: { userId: u.id } })).toBe(0);
    expect(await dbSite().session.count({ where: { userId: u.id } })).toBe(0);
    const compte = await dbSite().compteClient.findUniqueOrThrow({ where: { id: c.id } });
    expect(compte.statut).toBe("supprime");
    expect(compte.rpps).toBeNull();
    expect(await dbSite().adresse.count({ where: { compteId: c.id } })).toBe(0);
    expect(await dbSite().consentement.count({ where: { compteId: c.id, email: { not: null } } })).toBe(0);
    expect((await dbDemo().partenaire.findUniqueOrThrow({ where: { ref: c.odooPartnerRef! } })).archive).toBe(true);
    expect(await dbSite().messageDemonstration.count({ where: { destinataire: c.email, objet: "Votre compte a été supprimé" } })).toBe(1);
    expect(await dbSite().demandeRgpd.count({ where: { compteId: c.id, type: "suppression", etat: "traitee" } })).toBe(1);
  });

  it("refus si une location est en cours (compte de démonstration « client avec droits »)", async () => {
    const demo = await dbSite().compteClient.findFirstOrThrow({ where: { rpps: "99000000101" } });
    const r = await supprimer(demo.id);
    expect(r.supprime).toBe(false);
    if (!r.supprime) expect(r.raisons.join(" ")).toContain("location");
    expect((await dbSite().compteClient.findUniqueOrThrow({ where: { id: demo.id } })).statut).toBe("valide");
  });
});
