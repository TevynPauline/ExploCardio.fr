import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { creerRegistre } from "@/connecteurs/registre";
import * as admin from "@/connecteurs/odoo/demo/locations-admin";
import { enregistrerEffetsCommande } from "@/domaine/commande/effets";
import { lancerPaiement } from "@/domaine/commande/paiement";
import { suivreLocations } from "@/domaine/location/suivi";
import { traiterEvenementPaiement } from "@/domaine/paiements";
import { dbDemo } from "@/lib/db/demo";
import { dbSite } from "@/lib/db/site";
import { traiterEcheancesCloud } from "@/domaine/cloud/echeances";
import { commandeMad, evenement, nettoyer, rendreParcDesTests } from "./outils";

// T015 — suivi des locations : expédition, accès Cloud, formation, livraison, colis non livré,
// appareil défectueux (F05, US1, FR-012, R9).

enregistrerEffetsCommande();
afterAll(async () => {
  await rendreParcDesTests();
  await nettoyer();
});
beforeEach(rendreParcDesTests);
const odoo = () => creerRegistre(process.env).odoo();

async function locationPayee(code?: string) {
  const { compte, commande } = await commandeMad({ code });
  await lancerPaiement(commande, true);
  const c = await dbSite().commandeSite.findUniqueOrThrow({ where: { id: commande.id } });
  const paiementRef = `FICT-pi-${randomUUID()}`;
  await dbDemo().sessionPaiementDemo.update({ where: { id: c.sessionAbonnement! }, data: { etat: "payee", paiementRef } });
  await traiterEvenementPaiement(evenement("paiement_reussi", { abonnementRef: c.ref, sessionId: c.sessionAbonnement, paiementRef, montantTtc: 5_880, moyen: "sepa" }));
  const apres = await dbSite().commandeSite.findUniqueOrThrow({ where: { id: commande.id } });
  return { compte, ref: apres.odooAbonnementRefs[0]! };
}

const emails = (destinataire: string, debut: string) => dbSite().messageDemonstration.count({ where: { destinataire, objet: { startsWith: debut } } });
const alertes = (objet: string) => dbSite().messageDemonstration.count({ where: { objet: { contains: objet } } });

describe("suivi des locations", () => {
  it("expédition : un seul email avec suivi et contact, accès Cloud ouvert, alerte formation ; livraison → en cours", async () => {
    const { compte, ref } = await locationPayee("EC-DMS-3004L-CLOUD");
    const formationAvant = await alertes("Formation à organiser");
    await admin.preparerExpedition(ref, "Colissimo", "FICT-COLIS-T15");
    await suivreLocations();
    await suivreLocations();
    expect(await emails(compte.email, "Votre ")).toBeGreaterThanOrEqual(1);
    const message = await dbSite().messageDemonstration.findFirstOrThrow({ where: { destinataire: compte.email, objet: { contains: "est en route" } } });
    expect(message.rendu).toContain("FICT-COLIS-T15");
    expect(message.rendu).toContain("WhatsApp");
    expect(await dbSite().messageDemonstration.count({ where: { destinataire: compte.email, objet: { contains: "est en route" } } })).toBe(1);
    expect(await alertes("Formation à organiser")).toBe(formationAvant + 1);
    // F12 : un accès dans le registre, ouvert une seule fois sur la plateforme.
    const acces = await dbSite().accesLogiciel.findFirstOrThrow({ where: { sourceRef: ref } });
    expect(acces).toMatchObject({ etat: "actif", origine: "location", logiciel: "EC-DMS-CS-HOLTER-CLOUD" });
    expect(await dbDemo().accesCloud.count({ where: { cle: `acces:${acces.id}` } })).toBe(1);
    const [l] = await odoo().location.listerLocations(compte.partenaireRef);
    expect(l!.numeroSerie).toBeTruthy(); // communiqué à l'expédition (D5)

    await admin.marquerLivree(ref);
    expect((await odoo().location.listerLocations(compte.partenaireRef))[0]!.etat).toBe("en_cours");
  });

  it("plateforme Cloud injoignable : expédition non bloquée, alerte, accès rattrapé ensuite", async () => {
    const { ref } = await locationPayee("EC-DMS-3004L-CLOUD");
    await admin.preparerExpedition(ref, "Colissimo", "FICT-COLIS-PCA");
    await dbSite().panneSimulee.upsert({ where: { connecteur: "pca" }, create: { connecteur: "pca", active: true }, update: { active: true } });
    try {
      await suivreLocations();
    } finally {
      await dbSite().panneSimulee.update({ where: { connecteur: "pca" }, data: { active: false } });
    }
    const suivi = await dbSite().suiviLocation.findUniqueOrThrow({ where: { abonnementRef: ref } });
    expect(suivi.expedieNotifie).toBe(true);
    const acces = () => dbSite().accesLogiciel.findFirstOrThrow({ where: { sourceRef: ref } });
    expect(await acces()).toMatchObject({ etat: "en_ouverture", pcaRef: null });
    expect(await alertes("Accès Cloud non ouvert")).toBeGreaterThan(0);
    // F12 : la tâche horaire des accès reprend l'ouverture, sans compte en double.
    await traiterEcheancesCloud();
    expect(await acces()).toMatchObject({ etat: "actif", pcaRef: expect.any(String) });
  });

  it("colis non livré : alerte une fois ; appareil défectueux sans remplaçant : le client choisit", async () => {
    const { ref } = await locationPayee();
    await admin.preparerExpedition(ref, "Colissimo", "FICT-COLIS-NL");
    await suivreLocations();
    const avant = await alertes("Colis non livré");
    await admin.colisNonLivre(ref);
    await suivreLocations();
    await suivreLocations();
    expect(await alertes("Colis non livré")).toBe(avant + 1);

    const autre = await locationPayee("EC-DMS-ABP-KIT");
    const lot = (await dbDemo().abonnement.findUniqueOrThrow({ where: { ref: autre.ref } })).numeroSerieId!;
    // Plus aucun autre appareil de ce modèle disponible.
    const libres = await dbDemo().numeroSerie.findMany({ where: { variante: { defaultCode: "EC-DMS-ABP-KIT" }, statut: "disponible" } });
    await dbDemo().numeroSerie.updateMany({ where: { id: { in: libres.map((x) => x.id) } }, data: { statut: "en_maintenance" } });
    try {
      expect(await admin.signalerAppareilDefectueux(autre.ref)).toEqual({ remplace: false });
      await suivreLocations();
      expect(await emails(autre.compte.email, "Votre mise à disposition : choisissez la suite")).toBe(1);
      expect((await odoo().location.listerLocations(autre.compte.partenaireRef))[0]!.attenteChoixClient).toBe(true);
    } finally {
      await dbDemo().numeroSerie.updateMany({ where: { id: { in: [...libres.map((x) => x.id), lot] } }, data: { statut: "disponible" } });
    }
  });
});
