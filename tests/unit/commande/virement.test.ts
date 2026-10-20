import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { creerRegistre } from "@/connecteurs/registre";
import * as administration from "@/connecteurs/odoo/demo/administration";
import { lancerPaiement } from "@/domaine/commande/paiement";
import { choisirLivraison, choisirPaiement, enregistrerAdresses, ouvrirCommande } from "@/domaine/commande/tunnel";
import { programmerImpayes } from "@/domaine/emailing/scenarios/impayes";
import { traiterVirements } from "@/domaine/commande/virement";
import { dbSite } from "@/lib/db/site";
import { compteValide, nettoyer, remplirPanier } from "./outils";

// T023 — virement : commande en attente, rappel unique, annulation à l'échéance, réception (F04, US4).

afterAll(nettoyer);
// Les commandes en attente laissées par d'autres tests sont annulées d'abord (le traitement les parcourt toutes).
beforeEach(async () => {
  await traiterVirements(new Date(Date.now() + 365 * 24 * 3600_000));
});
const odoo = () => creerRegistre(process.env).odoo();
const adresses = { livraison: { ligne1: "2 rue Livraison", codePostal: "69003", ville: "Lyon" }, facturation: { ligne1: "2 rue Livraison", codePostal: "69003", ville: "Lyon" } };

async function commandeVirement() {
  const compte = await compteValide();
  await remplirPanier(compte.compteId, [{ defaultCode: "EC-ELEC-HOLTER-50", formule: "achat", quantite: 1 }]);
  let c = await enregistrerAdresses(await ouvrirCommande(compte.compteId), adresses);
  c = await choisirLivraison(c, "standard");
  c = await choisirPaiement(c, "virement", null);
  const r = await lancerPaiement(c, true);
  expect(r).toMatchObject({ type: "redirection", url: `/commande/confirmation/${c.ref}` });
  return { compte, commande: await dbSite().commandeSite.findUniqueOrThrow({ where: { id: c.id } }) };
}

describe("virement", () => {
  it("commande en attente dans Odoo, stock réservé, email avec RIB et référence", async () => {
    const { compte, commande } = await commandeVirement();
    expect(commande).toMatchObject({ etatAchat: "en_attente_virement", etape: "terminee" });
    expect((await odoo().commandes.lireCommande(commande.odooCommandeRef!)).statut).toBe("en_attente_paiement");
    const email = await dbSite().messageDemonstration.findFirstOrThrow({ where: { destinataire: compte.email, objet: { startsWith: "Votre commande" } } });
    expect(email.rendu).toContain("IBAN");
    expect(email.rendu).toContain(commande.odooCommandeRef!);
  });

  it("relance unique par niveau avant l'échéance (F10, D4) ; annulation à l'échéance (stock rendu, email)", async () => {
    const { compte, commande } = await commandeVirement();
    const echeance = commande.echeanceVirement!;
    const avantRappel = new Date(echeance.getTime() - 1.5 * 24 * 3600_000);
    await traiterVirements(avantRappel);
    await programmerImpayes(avantRappel, { compteIds: [compte.compteId] });
    await programmerImpayes(avantRappel, { compteIds: [compte.compteId] });
    expect(await dbSite().envoi.findMany({ where: { compteId: compte.compteId, modele: "relance_impaye" }, select: { famille: true } })).toEqual([{ famille: "transactionnel" }]);
    const stockAvant = (await odoo().stock.lireDisponibilite(["EC-ELEC-HOLTER-50"]))[0]!.quantiteDisponible!;
    await traiterVirements(new Date(echeance.getTime() + 60_000));
    expect((await odoo().commandes.lireCommande(commande.odooCommandeRef!)).statut).toBe("annulee");
    expect((await odoo().stock.lireDisponibilite(["EC-ELEC-HOLTER-50"]))[0]!.quantiteDisponible).toBe(stockAvant + 1);
    expect(await dbSite().messageDemonstration.count({ where: { destinataire: compte.email, objet: { startsWith: "Commande" } } })).toBe(1);
    expect((await dbSite().commandeSite.findUniqueOrThrow({ where: { id: commande.id } })).etatAchat).toBe("refusee");
  });

  it("virement reçu (montant exact) : payée, facturée, client prévenu ; montant différent : reste en attente", async () => {
    const { compte, commande } = await commandeVirement();
    const lue = await odoo().commandes.lireCommande(commande.odooCommandeRef!);
    expect(await administration.virementRecu(lue.ref, lue.montantTtc - 100)).toEqual({ ecart: -100 });
    expect((await odoo().commandes.lireCommande(lue.ref)).statut).toBe("en_attente_paiement");
    expect(await administration.virementRecu(lue.ref, lue.montantTtc)).toEqual({ ecart: 0 });
    await traiterVirements();
    expect((await dbSite().commandeSite.findUniqueOrThrow({ where: { id: commande.id } })).etatAchat).toBe("payee");
    expect(await dbSite().messageDemonstration.count({ where: { destinataire: compte.email, objet: { startsWith: "Paiement reçu" } } })).toBe(1);
    expect((await odoo().factures.listerFactures(compte.partenaireRef)).filter((f) => f.type === "facture")).toHaveLength(1);
  });
});
