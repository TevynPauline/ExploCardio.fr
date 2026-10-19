import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { creerRegistre } from "@/connecteurs/registre";
import { enregistrerEffetsCommande, rattraperCommandes } from "@/domaine/commande/effets";
import { lancerPaiement, reservationsDe } from "@/domaine/commande/paiement";
import { SaisieInvalide, choisirLivraison, datesMiseADisposition } from "@/domaine/commande/tunnel";
import { traiterEvenementPaiement } from "@/domaine/paiements";
import { dbDemo } from "@/lib/db/demo";
import { dbSite } from "@/lib/db/site";
import { MAD, commandeMad, evenement, nettoyer, rendreParcDesTests } from "./outils";

// T011 — commande d'une mise à disposition (F05, US1, FR-007, FR-010, R4, SC-005).

enregistrerEffetsCommande();
afterAll(async () => {
  await rendreParcDesTests();
  await nettoyer();
});
beforeEach(rendreParcDesTests);
const odoo = () => creerRegistre(process.env).odoo();

async function payer(commandeId: string) {
  const c = await dbSite().commandeSite.findUniqueOrThrow({ where: { id: commandeId } });
  const paiementRef = `FICT-pi-${randomUUID()}`;
  await dbDemo().sessionPaiementDemo.update({ where: { id: c.sessionAbonnement! }, data: { etat: "payee", paiementRef } });
  await traiterEvenementPaiement(evenement("paiement_reussi", { abonnementRef: c.ref, sessionId: c.sessionAbonnement, paiementRef, montantTtc: 5_880, moyen: "sepa" }));
  return dbSite().commandeSite.findUniqueOrThrow({ where: { id: commandeId } });
}

describe("commande d'une mise à disposition", () => {
  it("date choisie enregistrée ; date non proposée refusée", async () => {
    const { commande, date } = await commandeMad();
    expect(commande.datesLivraisonMad).toEqual({ [MAD]: date });
    const [d] = await datesMiseADisposition(commande);
    expect(d!.dates[0]!.valeur).toBe(date);
    await expect(choisirLivraison(commande, null, { [MAD]: "2020-01-01" })).rejects.toBeInstanceOf(SaisieInvalide);
  });

  it("appareil réservé avant le paiement ; paiement réussi → location « commandée » à la date choisie, réservation consommée", async () => {
    const { compte, commande, date } = await commandeMad();
    const lancement = await lancerPaiement(commande, true);
    expect(lancement.type).toBe("paiement");
    const avant = await dbSite().commandeSite.findUniqueOrThrow({ where: { id: commande.id } });
    const [reservation] = reservationsDe(avant);
    expect(reservation).toMatchObject({ defaultCode: MAD, n: 1 });
    expect((await dbDemo().reservationAppareil.findUniqueOrThrow({ where: { cle: reservation!.cle } })).etat).toBe("active");
    // Un élément de prélèvement par location.
    const session = await dbDemo().sessionPaiementDemo.findUniqueOrThrow({ where: { id: avant.sessionAbonnement! } });
    expect(session.elements).toEqual([expect.objectContaining({ element: `${MAD}:1` })]);

    const apres = await payer(commande.id);
    expect(apres.etatAbonnement).toBe("payee");
    expect(apres.elementsAbonnement).toEqual({ [`${MAD}:1`]: apres.odooAbonnementRefs[0] });
    expect((await dbDemo().reservationAppareil.findUniqueOrThrow({ where: { cle: reservation!.cle } })).etat).toBe("consommee");
    const [location] = await odoo().location.listerLocations(compte.partenaireRef);
    expect(location).toMatchObject({ etat: "commandee", expeditionBloquee: false, numeroSerie: null });
    expect(location!.dateLivraison!.toISOString().slice(0, 10)).toBe(date);
    const echeance = new Date(`${date}T12:00:00Z`);
    echeance.setUTCMonth(echeance.getUTCMonth() + 1);
    expect(location!.prochaineEcheance!.toISOString().slice(0, 10)).toBe(echeance.toISOString().slice(0, 10));
  });

  it("dernier appareil pris entre-temps : rien n'est débité, retour au choix de la date", async () => {
    const { commande } = await commandeMad();
    const pris: string[] = [];
    for (let i = 0; i < 20; i++) {
      const cle = `test-autre-${randomUUID()}`;
      try {
        await odoo().stock.reserverAppareil(MAD, new Date(), cle);
        pris.push(cle);
      } catch {
        break;
      }
    }
    const lancement = await lancerPaiement(commande, true);
    expect(lancement).toMatchObject({ type: "redirection", url: `/commande/livraison?ref=${commande.ref}` });
    if (lancement.type === "redirection") expect(lancement.message).toMatch(/Rien n'a été débité|n'est plus possible/);
    const c = await dbSite().commandeSite.findUniqueOrThrow({ where: { id: commande.id } });
    expect(c.sessionAbonnement).toBeNull();
    for (const cle of pris) await odoo().stock.libererAppareil(cle);
  });

  it("paiement refusé ou abandonné : appareil rendu au parc", async () => {
    const { commande } = await commandeMad();
    await lancerPaiement(commande, true);
    let c = await dbSite().commandeSite.findUniqueOrThrow({ where: { id: commande.id } });
    const cle = reservationsDe(c)[0]!.cle;
    await traiterEvenementPaiement(evenement("paiement_refuse", { abonnementRef: c.ref, sessionId: c.sessionAbonnement, paiementRef: null }));
    expect((await dbDemo().reservationAppareil.findUniqueOrThrow({ where: { cle } })).etat).toBe("liberee");

    // Nouvelle tentative abandonnée 30 minutes : rattrapage.
    c = await dbSite().commandeSite.findUniqueOrThrow({ where: { id: commande.id } });
    await lancerPaiement(c, true);
    c = await dbSite().commandeSite.findUniqueOrThrow({ where: { id: commande.id } });
    const cle2 = reservationsDe(c)[0]!.cle;
    expect(cle2).not.toBe(cle);
    await rattraperCommandes(new Date(Date.now() + 31 * 60_000));
    expect((await dbDemo().reservationAppareil.findUniqueOrThrow({ where: { cle: cle2 } })).etat).toBe("liberee");
    expect((await dbSite().commandeSite.findUniqueOrThrow({ where: { id: commande.id } })).etatAbonnement).toBe("a_payer");
  });

  it("conditions de location obligatoires", async () => {
    const { commande } = await commandeMad();
    await expect(lancerPaiement(commande, true, false)).rejects.toMatchObject({ erreurs: { conditions: expect.any(String) } });
  });
});
