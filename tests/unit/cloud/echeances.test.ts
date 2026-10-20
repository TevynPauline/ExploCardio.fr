import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { annulerFin, ouvrirAcces, programmerFin } from "@/domaine/cloud/acces";
import { traiterEcheancesCloud } from "@/domaine/cloud/echeances";
import { dbSite } from "@/lib/db/site";
import { CARDIOVISION, HOLTER_CLOUD, JOUR, alertes, client, emails, nettoyer, pca, sousMode, source } from "./outils";

// T013 — fins des droits (F12, US2) : délai de grâce puis fermeture (SC-002), rappels une fois
// (FR-008, FR-029), résiliation annulée (FR-010), autres logiciels conservés (FR-009), alerte
// si un accès reste ouvert (FR-011) ou si une tâche n'est pas faite à temps (FR-021, SC-007).

afterEach(() => vi.unstubAllEnvs());
afterAll(nettoyer);

const lire = (id: string) => dbSite().accesLogiciel.findUniqueOrThrow({ where: { id } });

describe("échéances des accès Cloud", () => {
  it("résiliation : rappel 7 jours avant, délai de grâce à la fin, fermé 30 jours après ; l'autre logiciel reste actif", async () => {
    sousMode("auto");
    const c = await client();
    const location = source("SUB");
    const a = await ouvrirAcces({ compteId: c.compteId, logiciel: HOLTER_CLOUD, origine: "location", sourceRef: location, debut: new Date(), finPrevue: null });
    const autre = await ouvrirAcces({ compteId: c.compteId, logiciel: CARDIOVISION, origine: "abonnement", sourceRef: source("SUB"), debut: new Date(), finPrevue: null });
    const fin = new Date(Date.now() + 20 * JOUR);
    await programmerFin(location, fin);

    await traiterEcheancesCloud(new Date(fin.getTime() - 10 * JOUR));
    expect(await emails(c.email, "se termine le")).toBe(0);
    await traiterEcheancesCloud(new Date(fin.getTime() - 6 * JOUR));
    await traiterEcheancesCloud(new Date(fin.getTime() - 5 * JOUR));
    expect(await emails(c.email, "se termine le")).toBe(1);

    await traiterEcheancesCloud(new Date(fin.getTime() + 3600_000));
    const grace = await lire(a.id);
    expect(grace.etat).toBe("grace");
    expect(grace.finGrace?.getTime()).toBe(fin.getTime() + 30 * JOUR);
    expect(await emails(c.email, "en délai de grâce")).toBe(1);

    await traiterEcheancesCloud(new Date(fin.getTime() + 31 * JOUR));
    expect((await lire(a.id)).etat).toBe("ferme");
    expect(await emails(c.email, "est fermé")).toBe(1);
    expect((await lire(autre.id)).etat).toBe("actif");
    const droits = await pca().lireDroits(c.partenaireRef);
    expect(droits.find((d) => d.ref === a.pcaRef)?.etat).toBe("ferme");
    expect(droits.find((d) => d.ref === autre.pcaRef)?.etat).toBe("actif");
  });

  it("période incluse : rappel 30 jours avant avec la proposition d'abonnement, une fois", async () => {
    sousMode("auto");
    const c = await client();
    const fin = new Date(Date.now() + 60 * JOUR);
    await ouvrirAcces({ compteId: c.compteId, logiciel: HOLTER_CLOUD, origine: "periode_incluse", sourceRef: source("SO"), debut: new Date(), finPrevue: fin });
    await traiterEcheancesCloud(new Date(fin.getTime() - 29 * JOUR));
    await traiterEcheancesCloud(new Date(fin.getTime() - 28 * JOUR));
    expect(await emails(c.email, "inclus avec votre appareil se termine bientôt")).toBe(1);
  });

  it("résiliation annulée avant la fin → fermeture annulée (FR-010)", async () => {
    sousMode("auto");
    const c = await client();
    const location = source("SUB");
    const a = await ouvrirAcces({ compteId: c.compteId, logiciel: HOLTER_CLOUD, origine: "location", sourceRef: location, debut: new Date(), finPrevue: null });
    const fin = new Date(Date.now() + 10 * JOUR);
    await programmerFin(location, fin);
    await annulerFin(location);
    await traiterEcheancesCloud(new Date(fin.getTime() + JOUR));
    expect(await lire(a.id)).toMatchObject({ etat: "actif", finPrevue: null });
  });

  it("plateforme injoignable à la fermeture → accès non fermé, alerte une fois par jour (FR-011)", async () => {
    sousMode("auto");
    const c = await client();
    const a = await ouvrirAcces({ compteId: c.compteId, logiciel: HOLTER_CLOUD, origine: "manuel", sourceRef: source("MAN"), debut: new Date(), finPrevue: new Date(Date.now() - 40 * JOUR) });
    const avant = await alertes("Accès Cloud non fermé à temps");
    await dbSite().panneSimulee.upsert({ where: { connecteur: "pca" }, create: { connecteur: "pca", active: true }, update: { active: true } });
    try {
      await traiterEcheancesCloud();
      await traiterEcheancesCloud();
    } finally {
      await dbSite().panneSimulee.update({ where: { connecteur: "pca" }, data: { active: false } });
    }
    expect((await lire(a.id)).etat).toBe("actif");
    expect(await alertes("Accès Cloud non fermé à temps")).toBe(avant + 1);
    // Plateforme revenue : la fin et le délai de grâce, déjà passés, sont rattrapés.
    await traiterEcheancesCloud();
    expect((await lire(a.id)).etat).toBe("ferme");
  });

  it("sous-mode manuel : tâche d'ouverture non confirmée à son échéance → une alerte (SC-007)", async () => {
    sousMode("manual");
    const c = await client();
    const a = await ouvrirAcces({ compteId: c.compteId, logiciel: HOLTER_CLOUD, origine: "location", sourceRef: source("SUB"), debut: new Date(), finPrevue: null, livraison: new Date(Date.now() + 2 * JOUR) });
    const tache = await dbSite().tacheAcces.findFirstOrThrow({ where: { accesId: a.id } });
    expect(tache.echeance.getTime()).toBeLessThan(Date.now() + 2 * JOUR);
    const avant = await alertes("Tâche d'accès Cloud en retard");
    await traiterEcheancesCloud(new Date(Date.now() + JOUR / 2));
    expect(await alertes("Tâche d'accès Cloud en retard")).toBe(avant);
    await traiterEcheancesCloud(new Date(Date.now() + 2 * JOUR));
    await traiterEcheancesCloud(new Date(Date.now() + 2 * JOUR + 3600_000));
    expect(await alertes("Tâche d'accès Cloud en retard")).toBe(avant + 1);
  });
});
