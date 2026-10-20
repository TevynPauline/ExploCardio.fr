import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { apresRemboursementTotal, ouvrirPeriodesIncluses } from "@/domaine/cloud/declencheurs";
import { dbDemo } from "@/lib/db/demo";
import { dbSite } from "@/lib/db/site";
import { HOLTER_CLOUD, alertes, client, emails, nettoyer, odoo, sousMode } from "./outils";

// T009 — déclencheurs (F12, US1, D2) : achat payé d'une configuration « + logiciel Cloud » →
// accès ouvert pour la période incluse ; logiciel refusé → alerte et état « en cours
// d'ouverture » ; remboursement avant la livraison → fermé sans délai de grâce. Les locations
// sont couvertes par tests/unit/location/suivi.test.ts.

afterEach(() => vi.unstubAllEnvs());
afterAll(nettoyer);

const CONFIG_CLOUD = "EC-DMS-3004L-CLOUD";

async function achat(partenaireRef: string, defaultCode = CONFIG_CLOUD) {
  await dbDemo().stock.updateMany({ where: { variante: { defaultCode }, quantite: { lt: 50 } }, data: { quantite: 50 } });
  const { ref } = await odoo().commandes.creerCommandePayee(
    { partenaireRef, lignes: [{ defaultCode, quantite: 1 }], livraison: { adresse: "1 rue du Test", codePostal: "69003", ville: "Lyon", fraisPortHt: 0 }, paiement: { mode: "carte", reference: `FICT-pi-${randomUUID()}` } },
    `test-f12:${randomUUID()}`,
  );
  return ref;
}

describe("déclencheurs des achats", () => {
  it("configuration « + logiciel Cloud » payée → accès actif pour 12 mois, un seul email ; rejoué → rien de plus", async () => {
    sousMode("auto");
    const c = await client();
    const ref = await achat(c.partenaireRef);
    const maintenant = new Date();
    expect(await ouvrirPeriodesIncluses(ref, maintenant)).toBe(1);
    expect(await ouvrirPeriodesIncluses(ref, maintenant)).toBe(0);
    const a = await dbSite().accesLogiciel.findFirstOrThrow({ where: { sourceRef: ref } });
    expect(a).toMatchObject({ etat: "actif", origine: "periode_incluse", logiciel: HOLTER_CLOUD });
    const attendu = new Date(maintenant);
    attendu.setMonth(attendu.getMonth() + 12);
    expect(a.finPrevue?.getTime()).toBe(attendu.getTime());
    expect(await emails(c.email, "est ouvert")).toBe(1);
  });

  it("appareil sans logiciel inclus → aucun accès", async () => {
    const c = await client();
    const ref = await achat(c.partenaireRef, "EC-DMS-3004L");
    expect(await ouvrirPeriodesIncluses(ref)).toBe(0);
  });

  it("remboursement intégral avant la livraison → fermé sans délai de grâce ; après la livraison → délai de grâce", async () => {
    sousMode("auto");
    const c = await client();
    const avant = await achat(c.partenaireRef);
    await ouvrirPeriodesIncluses(avant);
    await apresRemboursementTotal(avant, false);
    expect((await dbSite().accesLogiciel.findFirstOrThrow({ where: { sourceRef: avant } })).etat).toBe("ferme");

    const c2 = await client();
    const apres = await achat(c2.partenaireRef);
    await ouvrirPeriodesIncluses(apres);
    const maintenant = new Date();
    await apresRemboursementTotal(apres, true, maintenant);
    const a = await dbSite().accesLogiciel.findFirstOrThrow({ where: { sourceRef: apres } });
    expect(a.etat).toBe("actif");
    expect(a.finPrevue?.getTime()).toBe(maintenant.getTime());
  });

  it("logiciel refusé par la plateforme → alerte, « en cours d'ouverture »", async () => {
    sousMode("auto");
    const c = await client();
    const { ouvrirAcces } = await import("@/domaine/cloud/acces");
    const avant = await alertes("Accès Cloud non ouvert");
    const a = await ouvrirAcces({ compteId: c.compteId, logiciel: "DEMO-ACCES-REFUSE", origine: "manuel", sourceRef: null, debut: new Date(), finPrevue: null });
    expect(a).toMatchObject({ etat: "en_ouverture", pcaRef: null });
    expect(await alertes("Accès Cloud non ouvert")).toBe(avant + 1);
  });
});
