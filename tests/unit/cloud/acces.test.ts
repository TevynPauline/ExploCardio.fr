import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { confirmerTache, fermerAcces, medecinDe, ouvrirAcces, prolongerAcces, retablirAcces, suspendreAcces } from "@/domaine/cloud/acces";
import { traiterEcheancesCloud } from "@/domaine/cloud/echeances";
import { dbDemo } from "@/lib/db/demo";
import { dbSite } from "@/lib/db/site";
import { CARDIOVISION, HOLTER_CLOUD, alertes, client, emails, journal, nettoyer, pca, sousMode, source } from "./outils";

// T008 — module des accès Cloud (F12) : chaque action → état, journal, un email (SC-004) ; même
// parcours dans les deux sous-modes (SC-006) ; échec puis reprise sans doublon (FR-005) ; aucune
// donnée hors de la liste fermée (FR-026, SC-005).

afterEach(() => vi.unstubAllEnvs());
afterAll(nettoyer);

const ADMIN = { id: null, libelle: "administrateur (test)" };

describe("accès Cloud", () => {
  it("sous-mode automatique : ouvrir, suspendre, rétablir, fermer → états, journal et un email chacun", async () => {
    sousMode("auto");
    const c = await client();
    let a = await ouvrirAcces({ compteId: c.compteId, logiciel: HOLTER_CLOUD, origine: "manuel", sourceRef: source("MAN"), debut: new Date(), finPrevue: null }, ADMIN);
    expect(a).toMatchObject({ etat: "actif", pcaRef: expect.any(String), libelle: expect.stringContaining("CardioScan") });
    expect(await journal(a.id, "ouverture")).toBe(1);
    expect(await emails(c.email, "est ouvert")).toBe(1);
    a = await suspendreAcces(a, "geste de test", ADMIN);
    expect(a.etat).toBe("suspendu");
    a = await retablirAcces(a, "fin du test", ADMIN);
    expect(a.etat).toBe("actif");
    a = await fermerAcces(a, "fin du test", ADMIN);
    expect(a.etat).toBe("ferme");
    expect(await journal(a.id, "fermeture")).toBe(1);
    expect(await emails(c.email, "est fermé")).toBe(1);
    expect(await emails(c.email, "est suspendu")).toBe(1);
    expect(await emails(c.email, "est rétabli")).toBe(1);
  });

  it("sous-mode manuel : tâche, client « en cours d'ouverture », email seulement à la confirmation, identique à l'automatique (SC-006)", async () => {
    sousMode("manual");
    const c = await client();
    const a = await ouvrirAcces({ compteId: c.compteId, logiciel: HOLTER_CLOUD, origine: "manuel", sourceRef: source("MAN"), debut: new Date(), finPrevue: null }, ADMIN);
    expect(a.etat).toBe("en_ouverture");
    expect(await emails(c.email, "est ouvert")).toBe(0);
    const tache = await dbSite().tacheAcces.findFirstOrThrow({ where: { accesId: a.id, etat: "a_faire" } });
    expect(tache.action).toBe("ouvrir");
    const ouvert = await confirmerTache(tache.id, ADMIN);
    expect(ouvert.etat).toBe("actif");
    const email = await dbSite().messageDemonstration.findFirstOrThrow({ where: { destinataire: c.email, objet: { contains: "est ouvert" } } });
    expect(email.rendu).toContain("invitation à créer votre mot de passe");

    const ferme = await fermerAcces(ouvert, "fin du test", ADMIN);
    expect(ferme.etat).toBe("actif"); // en attente de la tâche de fermeture
    const tacheFermeture = await dbSite().tacheAcces.findFirstOrThrow({ where: { accesId: a.id, action: "fermer", etat: "a_faire" } });
    expect((await confirmerTache(tacheFermeture.id, ADMIN)).etat).toBe("ferme");
    expect(await emails(c.email, "est fermé")).toBe(1);
  });

  it("deux logiciels pour le même médecin : un seul compte sur la plateforme (SC-003) ; le même logiciel d'une autre origine prolonge l'accès", async () => {
    sousMode("auto");
    const c = await client();
    const commun = { compteId: c.compteId, debut: new Date(), finPrevue: null };
    const [a, b] = await Promise.all([
      ouvrirAcces({ ...commun, logiciel: HOLTER_CLOUD, origine: "location", sourceRef: source("SUB") }),
      ouvrirAcces({ ...commun, logiciel: CARDIOVISION, origine: "abonnement", sourceRef: source("SUB") }),
    ]);
    expect(await dbDemo().compteCloud.count({ where: { partenaire: { ref: c.partenaireRef } } })).toBe(1);
    expect(a.pcaRef).not.toBe(b.pcaRef);
    const abonnement = source("SUB");
    const prolonge = await ouvrirAcces({ ...commun, logiciel: HOLTER_CLOUD, origine: "abonnement", sourceRef: abonnement });
    expect(prolonge.id).toBe(a.id);
    expect(prolonge).toMatchObject({ origine: "abonnement", sourceRef: abonnement, etat: "actif" });
    expect(await dbSite().accesLogiciel.count({ where: { partenaireRef: c.partenaireRef } })).toBe(2);
  });

  it("plateforme injoignable : accès « en cours d'ouverture », une alerte, puis repris sans doublon (FR-005)", async () => {
    sousMode("auto");
    const c = await client();
    const avant = await alertes("Accès Cloud non ouvert");
    await dbSite().panneSimulee.upsert({ where: { connecteur: "pca" }, create: { connecteur: "pca", active: true }, update: { active: true } });
    let a;
    try {
      const demande = { compteId: c.compteId, logiciel: HOLTER_CLOUD, origine: "manuel" as const, sourceRef: source("MAN"), debut: new Date(), finPrevue: null };
      a = await ouvrirAcces(demande);
      await ouvrirAcces(demande);
    } finally {
      await dbSite().panneSimulee.update({ where: { connecteur: "pca" }, data: { active: false } });
    }
    expect(a).toMatchObject({ etat: "en_ouverture", pcaRef: null });
    expect(await alertes("Accès Cloud non ouvert")).toBe(avant + 1);
    await traiterEcheancesCloud();
    await traiterEcheancesCloud();
    const repris = await dbSite().accesLogiciel.findUniqueOrThrow({ where: { id: a.id } });
    expect(repris.etat).toBe("actif");
    expect(await dbDemo().accesCloud.count({ where: { partenaire: { ref: c.partenaireRef } } })).toBe(1);
  });

  it("prolonger un accès en délai de grâce le rend actif, sans nouvel email d'ouverture", async () => {
    sousMode("auto");
    const c = await client();
    const a = await ouvrirAcces({ compteId: c.compteId, logiciel: HOLTER_CLOUD, origine: "periode_incluse", sourceRef: source("SO"), debut: new Date(), finPrevue: new Date(Date.now() - 1000) });
    await traiterEcheancesCloud();
    expect((await dbSite().accesLogiciel.findUniqueOrThrow({ where: { id: a.id } })).etat).toBe("grace");
    const p = await prolongerAcces(await dbSite().accesLogiciel.findUniqueOrThrow({ where: { id: a.id } }), { origine: "abonnement", sourceRef: source("SUB"), finPrevue: null });
    expect(p).toMatchObject({ etat: "actif", finPrevue: null, finGrace: null });
    expect((await pca().lireDroits(c.partenaireRef))[0]!.etat).toBe("actif");
    expect(await emails(c.email, "est ouvert")).toBe(1);
  });

  it("seules l'identité professionnelle, l'email, le RPPS ou SIRET et le cabinet sont transmis (FR-026) ; aucun mot de passe stocké (SC-005)", async () => {
    const c = await client();
    const compte = await dbSite().compteClient.findUniqueOrThrow({ where: { id: c.compteId }, include: { utilisateur: true } });
    expect(Object.keys(medecinDe(compte)).sort()).toEqual(["email", "nom", "partenaireRef", "rpps"]);
    const colonnes = await dbSite().$queryRaw<{ column_name: string }[]>`SELECT column_name FROM information_schema.columns WHERE table_name IN ('acces_logiciel', 'tache_acces')`;
    expect(colonnes.map((x) => x.column_name).join(" ")).not.toMatch(/passe|password|patient|identifiant/i);
  });
});
