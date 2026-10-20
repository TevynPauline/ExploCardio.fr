import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { ouvrirAcces, suspendreAcces } from "@/domaine/cloud/acces";
import { surCompteRetabli, surCompteSupprime, surCompteSuspendu, surMedecinModifie } from "@/domaine/cloud/comptes";
import { traiterEcheancesCloud } from "@/domaine/cloud/echeances";
import { dbDemo } from "@/lib/db/demo";
import { dbSite } from "@/lib/db/site";
import { CARDIOVISION, HOLTER_CLOUD, client, nettoyer, sousMode, source } from "./outils";

// T022 — comptes (F12, FR-017) : compte suspendu → accès suspendus ; rétabli → seuls ceux
// suspendus pour ce motif reviennent ; supprimé → délai de grâce ; médecin modifié → plateforme
// mise à jour.

afterEach(() => vi.unstubAllEnvs());
afterAll(nettoyer);
const EQUIPE = { id: null, libelle: "administrateur (test)" };
const etat = async (id: string) => (await dbSite().accesLogiciel.findUniqueOrThrow({ where: { id } })).etat;

describe("accès Cloud et compte du site", () => {
  it("suspension puis rétablissement du compte ; un accès suspendu pour impayé le reste", async () => {
    sousMode("auto");
    const c = await client();
    const a = await ouvrirAcces({ compteId: c.compteId, logiciel: HOLTER_CLOUD, origine: "location", sourceRef: source("SUB"), debut: new Date(), finPrevue: null });
    const b = await ouvrirAcces({ compteId: c.compteId, logiciel: CARDIOVISION, origine: "abonnement", sourceRef: source("SUB"), debut: new Date(), finPrevue: null });
    await suspendreAcces(b, "abonnement impayé");
    await surCompteSuspendu(c.compteId, EQUIPE);
    expect(await etat(a.id)).toBe("suspendu");
    await surCompteRetabli(c.compteId, EQUIPE);
    expect(await etat(a.id)).toBe("actif");
    expect(await etat(b.id)).toBe("suspendu");
  });

  it("compte supprimé : fin aujourd'hui, puis délai de grâce", async () => {
    sousMode("auto");
    const c = await client();
    const a = await ouvrirAcces({ compteId: c.compteId, logiciel: HOLTER_CLOUD, origine: "abonnement", sourceRef: source("SUB"), debut: new Date(), finPrevue: null });
    await surCompteSupprime(c.compteId);
    await traiterEcheancesCloud(new Date(Date.now() + 3600_000));
    expect(await etat(a.id)).toBe("grace");
  });

  it("email ou cabinet modifiés : la plateforme est mise à jour, le compte reste le même", async () => {
    sousMode("auto");
    const c = await client();
    await ouvrirAcces({ compteId: c.compteId, logiciel: HOLTER_CLOUD, origine: "manuel", sourceRef: source("MAN"), debut: new Date(), finPrevue: null });
    const avant = await dbDemo().compteCloud.findFirstOrThrow({ where: { partenaire: { ref: c.partenaireRef } } });
    await dbSite().compteClient.update({ where: { id: c.compteId }, data: { nomCabinet: "Cabinet du Parc" } });
    await surMedecinModifie(c.compteId);
    const apres = await dbDemo().compteCloud.findFirstOrThrow({ where: { partenaire: { ref: c.partenaireRef } } });
    expect(apres).toMatchObject({ id: avant.id, ref: avant.ref, cabinet: "Cabinet du Parc" });
  });
});
