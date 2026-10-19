import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { creerRegistre } from "@/connecteurs/registre";
import * as admin from "@/connecteurs/odoo/demo/locations-admin";
import { enregistrerEffetsCommande } from "@/domaine/commande/effets";
import { lancerPaiement } from "@/domaine/commande/paiement";
import { resilier } from "@/domaine/location/gestion";
import { envoyerRappelsLocations } from "@/domaine/location/rappels";
import { suivreLocations } from "@/domaine/location/suivi";
import { traiterEvenementPaiement } from "@/domaine/paiements";
import { dbDemo } from "@/lib/db/demo";
import { dbSite } from "@/lib/db/site";
import { commandeMad, evenement, nettoyer, rendreParcDesTests } from "./outils";

// T030 — échéances, impayés, retards de retour (F05, US6, FR-025 à FR-030, SC-009, SC-010).

enregistrerEffetsCommande();
afterAll(async () => {
  await rendreParcDesTests();
  await nettoyer();
});
beforeEach(rendreParcDesTests);
const odoo = () => creerRegistre(process.env).odoo();
const JOUR = 86_400_000;

async function locationEnCours(code?: string) {
  const { compte, commande } = await commandeMad({ code });
  await lancerPaiement(commande, true);
  let c = await dbSite().commandeSite.findUniqueOrThrow({ where: { id: commande.id } });
  const pi = `FICT-pi-${randomUUID()}`;
  await dbDemo().sessionPaiementDemo.update({ where: { id: c.sessionAbonnement! }, data: { etat: "payee", paiementRef: pi } });
  await traiterEvenementPaiement(evenement("paiement_reussi", { abonnementRef: c.ref, sessionId: c.sessionAbonnement, paiementRef: pi, montantTtc: 5_880, moyen: "sepa" }));
  c = await dbSite().commandeSite.findUniqueOrThrow({ where: { id: commande.id } });
  const ref = c.odooAbonnementRefs[0]!;
  await admin.preparerExpedition(ref, "Colissimo", `FICT-${ref}`);
  await admin.marquerLivree(ref);
  await suivreLocations();
  const l = (await odoo().location.listerLocations(compte.partenaireRef)).find((x) => x.ref === ref)!;
  return { compte, commande: c, ref, l };
}

const emails = (destinataire: string, objet: string) => dbSite().messageDemonstration.count({ where: { destinataire, objet: { startsWith: objet } } });

describe("échéances et rappels", () => {
  it("rappel unique 3 jours avant l'échéance ; échéance payée → facture et email, échéance suivante avancée", async () => {
    const { compte, commande, ref, l } = await locationEnCours();
    const veille = new Date(l.prochaineEcheance!.getTime() - 2 * JOUR);
    await envoyerRappelsLocations(veille);
    await envoyerRappelsLocations(veille);
    expect(await emails(compte.email, "Prochaine échéance de votre location")).toBe(1);
    const factures = async () => (await odoo().factures.listerFactures(compte.partenaireRef)).filter((f) => f.references.includes(ref));
    const avant = (await factures()).length;
    await traiterEvenementPaiement(evenement("echeance_payee", { abonnementRef: ref, paiementRef: `FICT-pi-${randomUUID()}`, montantTtc: 11_880, moyen: "sepa" }));
    expect((await factures()).length).toBe(avant + 1); // SC-009
    expect(await emails(compte.email, "Votre échéance mensuelle")).toBe(1);
    const apres = (await odoo().location.listerLocations(compte.partenaireRef)).find((x) => x.ref === ref)!;
    expect(apres.prochaineEcheance!.getTime()).toBeGreaterThan(l.prochaineEcheance!.getTime());
    void commande;
  });

  it("prélèvement refusé : client prévenu ; au terme du délai, accès suspendu, équipe alertée ; régularisation → accès rétabli", async () => {
    const { compte, ref, l } = await locationEnCours("EC-DMS-3004L-CLOUD");
    await traiterEvenementPaiement(evenement("echeance_refusee", { abonnementRef: ref, paiementRef: null, montantTtc: 11_880, moyen: "sepa" }));
    await suivreLocations();
    expect(await emails(compte.email, "Le prélèvement de votre location n'a pas abouti")).toBe(1);
    const regles = await odoo().location.lireRegles();
    await admin.executerActionsPlanifiees(new Date(Date.now() + (regles.delaiRegularisationJours + 1) * JOUR));
    await suivreLocations();
    expect((await odoo().location.listerLocations(compte.partenaireRef)).find((x) => x.ref === ref)!.etat).toBe("suspendue_impaye");
    expect(await emails(compte.email, "Votre location est suspendue")).toBe(1);
    const suivi = await dbSite().suiviLocation.findUniqueOrThrow({ where: { abonnementRef: ref } });
    expect(suivi.droitCloudEtat).toBe("suspendu");
    await admin.regulariser(ref);
    await suivreLocations();
    expect((await dbSite().suiviLocation.findUniqueOrThrow({ where: { abonnementRef: ref } })).droitCloudEtat).toBe("actif");
    void l;
  });

  it("retour en retard : rappels avant toute facturation, puis mois suivant facturé et prélevé ; accès fermé à la fin", async () => {
    const { compte, commande, ref } = await locationEnCours("EC-DMS-3004L-CLOUD");
    const { fin, dateLimiteRetour } = await resilier(compte.compteId, ref);
    // Fin atteinte sans retour : retard ; accès Cloud fermé à la date de fin.
    await admin.executerActionsPlanifiees(new Date(fin.getTime() + JOUR));
    await suivreLocations();
    const apresLimite = new Date(dateLimiteRetour!.getTime() + JOUR);
    await envoyerRappelsLocations(apresLimite);
    expect((await dbSite().suiviLocation.findUniqueOrThrow({ where: { abonnementRef: ref } })).droitCloudEtat).toBe("ferme");
    expect(await emails(compte.email, "Retour de votre appareil attendu")).toBe(1); // SC-010 : rappel avant facturation
    await envoyerRappelsLocations(new Date(apresLimite.getTime() + 2 * 3600_000));
    expect(await emails(compte.email, "Retour de votre appareil attendu")).toBe(1); // pas deux fois le même jour
    expect(await dbDemo().sessionPaiementDemo.count({ where: { abonnementRef: commande.ref, nature: "ponctuel" } })).toBe(0);

    const regles = await odoo().location.lireRegles();
    await admin.executerActionsPlanifiees(new Date(dateLimiteRetour!.getTime() + (regles.toleranceRetardJours + 1) * JOUR));
    await suivreLocations();
    await suivreLocations();
    expect(await dbDemo().sessionPaiementDemo.count({ where: { abonnementRef: commande.ref, nature: "ponctuel" } })).toBe(1);
    expect(await emails(compte.email, "Prélèvement lié à votre location")).toBe(1);

    // Retour enregistré : location terminée ; autorisation libérée une fois tout réglé.
    await admin.enregistrerRetour(ref, "complet", "disponible");
    await suivreLocations();
    await envoyerRappelsLocations();
    expect((await dbDemo().sessionPaiementDemo.findUniqueOrThrow({ where: { id: commande.sessionAbonnement! } })).autorisationLiberee).toBe(true);
  });

  it("relocation après retour : tarif du premier mois de nouveau", async () => {
    const { compte, ref } = await locationEnCours();
    await admin.enregistrerRetour(ref, "complet", "disponible");
    const { commande } = await commandeMad();
    const devis = await odoo().commandes.calculerDevis({ partenaireRef: compte.partenaireRef, lignes: [{ defaultCode: "EC-SUN-OSCAR2", formule: "mise_a_disposition", quantite: 1 }] });
    expect(devis.abonnement!.premierMoisHt).toBeLessThan(devis.abonnement!.moisSuivantsHt);
    void commande;
  });
});
