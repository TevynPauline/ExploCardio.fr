import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import * as admin from "@/connecteurs/odoo/demo/locations-admin";
import { enregistrerEffetsCommande } from "@/domaine/commande/effets";
import { lancerPaiement } from "@/domaine/commande/paiement";
import { choisirLivraison, choisirPaiement, enregistrerAdresses, ouvrirCommande } from "@/domaine/commande/tunnel";
import { ActionLocationRefusee, annuler, datesDeReport, locationsDuCompte, prolonger, reporter, resilier } from "@/domaine/location/gestion";
import { premiereDatePour } from "@/domaine/location/offre";
import { suivreLocations } from "@/domaine/location/suivi";
import { traiterEvenementPaiement } from "@/domaine/paiements";
import { dbDemo } from "@/lib/db/demo";
import { dbSite } from "@/lib/db/site";
import { MAD, adresses, compteValide, evenement, nettoyer, remplirPanier, rendreParcDesTests } from "./outils";

// T024 — résiliation, prolongation, annulation, retour (F05, US4, FR-019 à FR-024, FR-030, SC-002).

enregistrerEffetsCommande();
afterAll(async () => {
  await rendreParcDesTests();
  await nettoyer();
});
beforeEach(rendreParcDesTests);

async function louer(quantite = 1, code = MAD) {
  const compte = await compteValide();
  await remplirPanier(compte.compteId, [{ defaultCode: code, formule: "mise_a_disposition", quantite }]);
  let c = await enregistrerAdresses(await ouvrirCommande(compte.compteId), adresses);
  c = await choisirLivraison(c, null, { [code]: await premiereDatePour(code, "69003") });
  c = await choisirPaiement(c, null, "sepa");
  await lancerPaiement(c, true);
  c = await dbSite().commandeSite.findUniqueOrThrow({ where: { id: c.id } });
  const pi = `FICT-pi-${randomUUID()}`;
  await dbDemo().sessionPaiementDemo.update({ where: { id: c.sessionAbonnement! }, data: { etat: "payee", paiementRef: pi } });
  await traiterEvenementPaiement(evenement("paiement_reussi", { abonnementRef: c.ref, sessionId: c.sessionAbonnement, paiementRef: pi, montantTtc: 5_880 * quantite, moyen: "sepa" }));
  c = await dbSite().commandeSite.findUniqueOrThrow({ where: { id: c.id } });
  return { compte, commande: c, refs: c.odooAbonnementRefs };
}

async function livrer(ref: string) {
  await admin.preparerExpedition(ref, "Colissimo", `FICT-${ref}`);
  await admin.marquerLivree(ref);
}

const elements = async (sessionId: string) =>
  (await dbDemo().sessionPaiementDemo.findUniqueOrThrow({ where: { id: sessionId } })).elements as { element: string; finLe: string | null }[];

describe("résiliation et retour", () => {
  it("résilier : fin au terme du mois payé, prélèvements de la location arrêtés, email ; prolonger annule", async () => {
    const debut = new Date();
    const { compte, commande, refs } = await louer();
    await livrer(refs[0]!);
    const r = await resilier(compte.compteId, refs[0]!);
    const [l] = (await locationsDuCompte(compte.compteId)).actives;
    expect(l).toMatchObject({ etat: "resiliation_prevue" });
    expect(r.fin.getTime()).toBe(l!.fin!.getTime());
    expect(r.dateLimiteRetour!.getTime()).toBeGreaterThan(r.fin.getTime());
    expect((await elements(commande.sessionAbonnement!))[0]!.finLe).toBe(r.fin.toISOString());
    expect(await dbSite().messageDemonstration.count({ where: { destinataire: compte.email, objet: "Votre résiliation est enregistrée" } })).toBe(1);
    expect(await dbSite().journalAction.count({ where: { action: "location.resiliee", objet: refs[0], date: { gte: debut } } })).toBe(1);
    // Autorisation conservée jusqu'au retour (FR-030).
    expect((await dbDemo().sessionPaiementDemo.findUniqueOrThrow({ where: { id: commande.sessionAbonnement! } })).autorisationLiberee).toBe(false);

    await prolonger(compte.compteId, refs[0]!);
    expect((await locationsDuCompte(compte.compteId)).actives[0]).toMatchObject({ etat: "en_cours", fin: null });
    expect((await elements(commande.sessionAbonnement!))[0]!.finLe).toBeNull();
  });

  it("« Prolonger » refusé une fois la fin atteinte", async () => {
    const { compte, refs } = await louer();
    await livrer(refs[0]!);
    await resilier(compte.compteId, refs[0]!);
    await dbDemo().abonnement.update({ where: { ref: refs[0]! }, data: { fin: new Date(Date.now() - 86_400_000) } });
    await expect(prolonger(compte.compteId, refs[0]!)).rejects.toBeInstanceOf(ActionLocationRefusee);
  });

  it("deux locations sur un même prélèvement : seule la résiliée s'arrête", async () => {
    const { compte, commande, refs } = await louer(2, "EC-SUN-OSCAR2");
    expect(refs).toHaveLength(2);
    for (const r of refs) await livrer(r);
    await resilier(compte.compteId, refs[1]!);
    const els = await elements(commande.sessionAbonnement!);
    expect(els.filter((e) => e.finLe)).toHaveLength(1);
    const etats = (await locationsDuCompte(compte.compteId)).actives.map((l) => l.etat).sort();
    expect(etats).toEqual(["en_cours", "resiliation_prevue"]);
  });

  it("annulation avant expédition : remboursement intégral du premier mois, appareil rendu au parc", async () => {
    const { compte, refs } = await louer();
    const lot = (await dbDemo().abonnement.findUniqueOrThrow({ where: { ref: refs[0]! } })).numeroSerieId!;
    const { montantTtc } = await annuler(compte.compteId, refs[0]!);
    expect(montantTtc).toBeGreaterThan(0);
    expect(await dbDemo().remboursementDemo.count({ where: { cle: `annulation:${refs[0]}` } })).toBe(1);
    expect((await dbDemo().numeroSerie.findUniqueOrThrow({ where: { id: lot } })).statut).toBe("disponible");
    expect((await locationsDuCompte(compte.compteId)).historique[0]!.etat).toBe("annulee");
  });

  it("appareil défectueux : le client reporte la livraison à une nouvelle date", async () => {
    const { compte, refs } = await louer(1, "EC-DMS-ABP-KIT");
    const libres = await dbDemo().numeroSerie.findMany({ where: { variante: { defaultCode: "EC-DMS-ABP-KIT" }, statut: "disponible" } });
    await dbDemo().numeroSerie.updateMany({ where: { id: { in: libres.map((x) => x.id) } }, data: { statut: "en_maintenance", retourPrevu: new Date(Date.now() + 5 * 86_400_000) } });
    try {
      await admin.signalerAppareilDefectueux(refs[0]!);
      const dates = await datesDeReport(compte.compteId, refs[0]!);
      await reporter(compte.compteId, refs[0]!, dates[1]!.valeur);
      const [l] = (await locationsDuCompte(compte.compteId)).actives;
      expect(l!.attenteChoixClient).toBe(false);
      expect(l!.dateLivraison!.toISOString().slice(0, 10)).toBe(dates[1]!.valeur);
    } finally {
      await dbDemo().numeroSerie.updateMany({ where: { id: { in: libres.map((x) => x.id) } }, data: { statut: "disponible", retourPrevu: null } });
    }
  });

  it("retour avec dégradation : location terminée, dégradation facturée et prélevée une seule fois, email", async () => {
    const { compte, commande, refs } = await louer();
    await livrer(refs[0]!);
    await resilier(compte.compteId, refs[0]!);
    await suivreLocations();
    await admin.enregistrerRetour(refs[0]!, "degrade", "en_maintenance", 8_000);
    await suivreLocations();
    await suivreLocations();
    expect((await locationsDuCompte(compte.compteId)).historique[0]).toMatchObject({ etat: "terminee", montantDegradationHt: 8_000 });
    const email = await dbSite().messageDemonstration.findFirstOrThrow({ where: { destinataire: compte.email, objet: "Nous avons reçu votre appareil" } });
    expect(email.rendu).toContain("80,00");
    expect(await dbDemo().sessionPaiementDemo.count({ where: { abonnementRef: commande.ref, nature: "ponctuel" } })).toBe(1);
    expect(await dbSite().messageDemonstration.count({ where: { destinataire: compte.email, objet: "Prélèvement lié à votre location" } })).toBe(1);
  });
});
