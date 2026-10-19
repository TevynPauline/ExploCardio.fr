import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { creerRegistre } from "@/connecteurs/registre";
import * as administration from "@/connecteurs/odoo/demo/administration";
import { enregistrerEffetsCommande } from "@/domaine/commande/effets";
import { lancerPaiement } from "@/domaine/commande/paiement";
import { suivreCommandes } from "@/domaine/commande/suivi";
import { choisirLivraison, choisirPaiement, enregistrerAdresses, ouvrirCommande } from "@/domaine/commande/tunnel";
import { traiterEvenementPaiement } from "@/domaine/paiements";
import { dbDemo } from "@/lib/db/demo";
import { dbSite } from "@/lib/db/site";
import { compteValide, evenement, nettoyer, remplirPanier } from "./outils";

// T032 — suivi des commandes et remboursements (F04, US7, FR-029 à FR-032).

enregistrerEffetsCommande();
afterAll(nettoyer);
const odoo = () => creerRegistre(process.env).odoo();
const adresses = { livraison: { ligne1: "2 rue Livraison", codePostal: "69003", ville: "Lyon" }, facturation: { ligne1: "2 rue Livraison", codePostal: "69003", ville: "Lyon" } };

async function emails(destinataire: string, debut: string) {
  return dbSite().messageDemonstration.count({ where: { destinataire, objet: { startsWith: debut } } });
}

/** Commande payée par carte (paiement de démonstration réel, remboursable par Stripe). */
async function commandePayee(options: { cadeau?: boolean; moyen?: "carte" | "virement" } = {}) {
  const compte = await compteValide();
  if (options.cadeau) {
    const c = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compte.compteId } });
    await dbSite().attributionCadeau.create({ data: { numero: c.rpps!, compteId: c.id, etat: "droit_ouvert" } });
  }
  await remplirPanier(compte.compteId, [{ defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 1 }]);
  let c = await enregistrerAdresses(await ouvrirCommande(compte.compteId), adresses);
  c = await choisirLivraison(c, "standard");
  c = await choisirPaiement(c, options.moyen ?? "carte", null);
  await lancerPaiement(c, true);
  c = await dbSite().commandeSite.findUniqueOrThrow({ where: { id: c.id } });
  if ((options.moyen ?? "carte") === "carte") {
    const paiementRef = `FICT-pi-${randomUUID()}`;
    await dbDemo().sessionPaiementDemo.update({ where: { id: c.sessionAchat! }, data: { etat: "payee", paiementRef } });
    await traiterEvenementPaiement(evenement("paiement_reussi", { commandeRef: c.ref, sessionId: c.sessionAchat, paiementRef }));
    c = await dbSite().commandeSite.findUniqueOrThrow({ where: { id: c.id } });
  }
  return { compte, commande: c, ref: c.odooCommandeRef! };
}

describe("suivi des commandes", () => {
  it("expédition : un seul email avec le suivi, même relevée deux fois ; livraison sans email", async () => {
    const { compte, ref } = await commandePayee();
    await suivreCommandes();
    await administration.marquerExpediee(ref, "Colissimo", "FICT-COLIS-1");
    await suivreCommandes();
    await suivreCommandes();
    expect(await emails(compte.email, `Votre commande ${ref} est expédiée`)).toBe(1);
    const message = await dbSite().messageDemonstration.findFirstOrThrow({ where: { destinataire: compte.email, objet: { startsWith: `Votre commande ${ref} est expédiée` } } });
    expect(message.rendu).toContain("FICT-COLIS-1");
    const avant = await dbSite().messageDemonstration.count({ where: { destinataire: compte.email } });
    await administration.marquerLivree(ref);
    await suivreCommandes();
    expect(await dbSite().messageDemonstration.count({ where: { destinataire: compte.email } })).toBe(avant);
  });

  it("remboursement décidé dans Odoo : exécuté par Stripe une fois, avoir émis, email ; partiel puis total", async () => {
    const debut = new Date();
    const { compte, ref } = await commandePayee();
    const total = (await odoo().commandes.lireCommande(ref)).montantTtc;
    await administration.deciderRemboursement(ref, 500, "Geste commercial");
    await suivreCommandes();
    await suivreCommandes();
    expect(await dbDemo().remboursementDemo.count({ where: { cle: { startsWith: "remboursement:" }, montantTtcCentimes: 500, paiementRef: (await odoo().commandes.lireCommande(ref)).referencePaiement! } })).toBe(1);
    expect((await odoo().commandes.lireCommande(ref)).statut).toBe("remboursee_partiellement");
    expect(await emails(compte.email, `Remboursement de la commande ${ref}`)).toBe(1);
    await administration.deciderRemboursement(ref, total - 500, "Retour accepté");
    await suivreCommandes();
    expect((await odoo().commandes.lireCommande(ref)).statut).toBe("remboursee");
    expect(await emails(compte.email, `Remboursement de la commande ${ref}`)).toBe(2);
    const avoirs = (await odoo().factures.listerFactures(compte.partenaireRef)).filter((f) => f.type === "avoir");
    expect(avoirs).toHaveLength(2);
    expect(await dbSite().journalAction.count({ where: { action: "commande.remboursement", objet: ref, date: { gte: debut } } })).toBe(2);
  });

  it("remboursement fait dans Stripe : enregistré dans Odoo une seule fois, client prévenu", async () => {
    const { compte, commande, ref } = await commandePayee();
    const evt = evenement("remboursement", { commandeRef: commande.ref, paiementRef: commande.paiementRef, montantTtc: 300 });
    await traiterEvenementPaiement(evt);
    await traiterEvenementPaiement(evt);
    await suivreCommandes();
    expect((await odoo().factures.listerFactures(compte.partenaireRef)).filter((f) => f.type === "avoir")).toHaveLength(1);
    expect(await emails(compte.email, `Remboursement de la commande ${ref}`)).toBe(1);
  });

  it("commande payée par virement : remboursement enregistré sans passer par Stripe", async () => {
    const { ref } = await commandePayee({ moyen: "virement" });
    const lue = await odoo().commandes.lireCommande(ref);
    await administration.virementRecu(ref, lue.montantTtc);
    const avant = await dbDemo().remboursementDemo.count();
    await administration.deciderRemboursement(ref, 200, "Erreur de quantité");
    await suivreCommandes();
    expect(await dbDemo().remboursementDemo.count()).toBe(avant);
    expect((await odoo().commandes.lireCommande(ref)).statut).toBe("remboursee_partiellement");
  });

  it("annulation avant expédition : cadeau de bienvenue rétabli, email d'annulation", async () => {
    const { compte, commande, ref } = await commandePayee({ moyen: "virement", cadeau: true });
    await suivreCommandes();
    await odoo().commandes.annulerCommandeEnAttente(ref, "Annulée à la demande du client");
    await suivreCommandes();
    const c = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compte.compteId } });
    expect((await dbSite().attributionCadeau.findUniqueOrThrow({ where: { numero: c.rpps! } })).etat).toBe("droit_ouvert");
    expect(await emails(compte.email, `Commande ${ref} annulée`)).toBe(1);
    expect(commande.etatAchat).toBe("en_attente_virement");
  });
});
