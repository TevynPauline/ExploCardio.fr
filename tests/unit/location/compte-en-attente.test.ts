import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { creerRegistre } from "@/connecteurs/registre";
import { enregistrerEffetsCommande } from "@/domaine/commande/effets";
import { lancerPaiement } from "@/domaine/commande/paiement";
import { refuser, valider } from "@/domaine/comptes/validation";
import { traiterEvenementPaiement } from "@/domaine/paiements";
import { dbDemo } from "@/lib/db/demo";
import { dbSite } from "@/lib/db/site";
import { commandeMad, evenement, nettoyer, rendreParcDesTests } from "./outils";

// T018 — location payée par un compte en attente de validation (F05, US2, FR-009, FR-044, FR-045).

enregistrerEffetsCommande();
afterAll(async () => {
  await rendreParcDesTests();
  await nettoyer();
});
beforeEach(rendreParcDesTests);
const odoo = () => creerRegistre(process.env).odoo();
const equipe = { id: "test", libelle: "équipe de test" };

async function payerEnAttente() {
  const { compte, commande, date } = await commandeMad({ statut: "en_attente", achats: [{ defaultCode: "EC-KIT-HOLTER-MAD", quantite: 1 }], code: "EC-DMS-3004L-CLOUD" });
  // Achat du kit (carte), puis autorisation de prélèvement.
  const achat = await lancerPaiement(commande, true);
  expect(achat.type, JSON.stringify(achat)).toBe("paiement");
  let c = await dbSite().commandeSite.findUniqueOrThrow({ where: { id: commande.id } });
  const piAchat = `FICT-pi-${randomUUID()}`;
  await dbDemo().sessionPaiementDemo.update({ where: { id: c.sessionAchat! }, data: { etat: "payee", paiementRef: piAchat } });
  await traiterEvenementPaiement(evenement("paiement_reussi", { commandeRef: c.ref, sessionId: c.sessionAchat, paiementRef: piAchat }));
  c = await dbSite().commandeSite.findUniqueOrThrow({ where: { id: commande.id } });
  const lancement = await lancerPaiement(c, true);
  expect(lancement.type, JSON.stringify(lancement)).toBe("paiement");
  c = await dbSite().commandeSite.findUniqueOrThrow({ where: { id: commande.id } });
  const piAbo = `FICT-pi-${randomUUID()}`;
  await dbDemo().sessionPaiementDemo.update({ where: { id: c.sessionAbonnement! }, data: { etat: "payee", paiementRef: piAbo } });
  await traiterEvenementPaiement(evenement("paiement_reussi", { abonnementRef: c.ref, sessionId: c.sessionAbonnement, paiementRef: piAbo, montantTtc: 7_080, moyen: "sepa" }));
  c = await dbSite().commandeSite.findUniqueOrThrow({ where: { id: commande.id } });
  const partenaireRef = (await dbSite().compteClient.findUniqueOrThrow({ where: { id: compte.compteId } })).odooPartnerRef!;
  return { compte, commande: c, date, partenaireRef };
}

describe("compte en attente de validation", () => {
  it("location payée : expédition bloquée, alerte de validation prioritaire", async () => {
    const { commande, partenaireRef } = await payerEnAttente();
    expect(commande.etatAbonnement).toBe("payee");
    const [l] = await odoo().location.listerLocations(partenaireRef);
    expect(l).toMatchObject({ etat: "commandee", expeditionBloquee: true });
    expect(await dbSite().messageDemonstration.count({ where: { objet: { startsWith: "Validation prioritaire" }, rendu: { contains: commande.ref } } })).toBe(1);
  });

  it("validation : expédition débloquée ; date recalculée et client prévenu si elle n'est plus tenable", async () => {
    const { compte, partenaireRef } = await payerEnAttente();
    // La date annoncée est passée (validation tardive).
    const [l] = await odoo().location.listerLocations(partenaireRef);
    await dbDemo().abonnement.update({ where: { ref: l!.ref }, data: { dateLivraison: new Date("2020-01-02T12:00:00Z") } });
    await valider(compte.compteId, equipe);
    const [apres] = await odoo().location.listerLocations(partenaireRef);
    expect(apres!.expeditionBloquee).toBe(false);
    expect(apres!.dateLivraison!.getTime()).toBeGreaterThan(Date.now());
    expect(await dbSite().messageDemonstration.count({ where: { destinataire: compte.email, objet: "Votre date de livraison a changé" } })).toBe(1);
  });

  it("refus : location annulée, premier mois et kit intégralement remboursés, appareil rendu, client prévenu", async () => {
    const { compte, commande, partenaireRef } = await payerEnAttente();
    const [l] = await odoo().location.listerLocations(partenaireRef);
    const lot = (await dbDemo().abonnement.findUniqueOrThrow({ where: { ref: l!.ref } })).numeroSerieId!;
    await refuser(compte.compteId, equipe, "Numéro RPPS introuvable");
    expect((await odoo().location.listerLocations(partenaireRef))[0]!.etat).toBe("annulee");
    expect((await dbDemo().numeroSerie.findUniqueOrThrow({ where: { id: lot } })).statut).toBe("disponible");
    const remboursements = await dbDemo().remboursementDemo.findMany({ where: { cle: { in: [`refus:${l!.ref}`, `refus-kit:${commande.ref}`] } } });
    expect(remboursements).toHaveLength(2);
    expect((await odoo().commandes.lireCommande(commande.odooCommandeRef!)).statut).toBe("remboursee");
    const email = await dbSite().messageDemonstration.findFirstOrThrow({ where: { destinataire: compte.email, objet: "Votre mise à disposition est annulée" } });
    expect(email.rendu).toMatch(/intégralement remboursé/);
  });
});
