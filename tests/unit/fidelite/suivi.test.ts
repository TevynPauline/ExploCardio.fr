import { readFileSync } from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { creerRegistre } from "@/connecteurs/registre";
import * as administration from "@/connecteurs/odoo/demo/administration";
import { ajusterDroits } from "@/connecteurs/odoo/demo/fidelite-admin";
import { suivreCommandes } from "@/domaine/commande/suivi";
import { envoyerRappelsFidelite } from "@/domaine/fidelite/rappels";
import { suivreFidelite } from "@/domaine/fidelite/suivi";
import { dbDemo } from "@/lib/db/demo";
import { dbSite } from "@/lib/db/site";
import { CARTE_SD, COMMANDE_1200, ELECTRODES, commandePayee, commandeVirement, compteValide, dernierEmail, emails, nettoyer } from "./outils";

// T009, T013, T018 — suivi de la fidélité (F06, R7) : chaque mouvement de cagnotte et chaque
// changement de droits, calculés par Odoo, est relevé et le client prévenu une seule fois.

afterAll(nettoyer);
const fidelite = () => creerRegistre(process.env).odoo().fidelite;
const JOUR = 24 * 3600_000;

describe("suivi de la fidélité : crédit (US1)", () => {
  it("crédit relevé deux fois : un seul email avec le montant, la commande et la fin de validité (SC-005)", async () => {
    const compte = await compteValide();
    const { ref } = await commandePayee(compte.partenaireRef, COMMANDE_1200);
    await suivreFidelite();
    await suivreFidelite();
    expect(await emails(compte.email, "de bons d'achat crédités")).toBe(1);
    const message = await dernierEmail(compte.email, "de bons d'achat crédités");
    expect(message.objet).toContain("120,00");
    expect(message.rendu).toContain(ref);
    const { mouvements } = await fidelite().lireCagnotte(compte.partenaireRef);
    const fin = mouvements.find((m) => m.type === "credit")!.validiteFin!;
    expect(message.rendu).toContain(String(fin.getFullYear()));
  });

  it("le suivi est planifié toutes les 5 minutes (SC-006)", () => {
    const travailleurs = readFileSync("src/file-attente/travailleurs.ts", "utf8");
    expect(travailleurs).toContain('boss.schedule("suivi-fidelite", "*/5 * * * *")');
  });
});

describe("suivi de la fidélité : droits d'assistance (US2)", () => {
  it("ouverture puis prolongation : un email chacune, avec la date de fin", async () => {
    const compte = await compteValide();
    await commandePayee(compte.partenaireRef, [{ defaultCode: ELECTRODES, quantite: 5 }]);
    await suivreFidelite();
    await suivreFidelite();
    expect(await emails(compte.email, "Votre assistance est offerte")).toBe(1);
    const droits = await fidelite().lireDroitsAssistance(compte.partenaireRef);
    expect(droits.statut).toBe("actif");

    await commandePayee(compte.partenaireRef, [{ defaultCode: ELECTRODES, quantite: 5 }]);
    await suivreFidelite();
    expect(await emails(compte.email, "Votre assistance est offerte")).toBe(2);
    const prolonges = await fidelite().lireDroitsAssistance(compte.partenaireRef);
    expect(prolonges.fin!.getTime()).toBeGreaterThan(droits.fin!.getTime());
    expect(prolonges.historique.map((e) => e.type)).toEqual(expect.arrayContaining(["ouverture", "prolongation"]));
    const message = await dernierEmail(compte.email, "Votre assistance est offerte");
    expect(message.rendu).toContain(String(prolonges.fin!.getFullYear()));
  });

  it("rappel avant la fin des droits : une seule fois (D2) ; statut inactif après la fin", async () => {
    const compte = await compteValide();
    await commandePayee(compte.partenaireRef, [{ defaultCode: ELECTRODES, quantite: 5 }]);
    const { fin } = await fidelite().lireDroitsAssistance(compte.partenaireRef);
    const veille = new Date(fin!.getTime() - 3 * JOUR);
    await envoyerRappelsFidelite(veille);
    await envoyerRappelsFidelite(veille);
    expect(await emails(compte.email, "Votre assistance gratuite se termine bientôt")).toBe(1);

    await ajusterDroits(compte.partenaireRef, new Date(Date.now() - JOUR), "Fin de test", "tests");
    expect((await fidelite().lireDroitsAssistance(compte.partenaireRef)).statut).toBe("inactif");
  });
});

describe("suivi de la fidélité : retrait et restitution (US4)", () => {
  it("commande remboursée : retrait des bons restants, un email ; bons déjà dépensés déduits du remboursement, équipe alertée (D4)", async () => {
    const compte = await compteValide();
    const credit = await commandePayee(compte.partenaireRef, COMMANDE_1200);
    // 50 des 120 € crédités sont dépensés sur une autre commande.
    await commandePayee(compte.partenaireRef, [{ defaultCode: CARTE_SD, quantite: 4 }], 5_000);
    expect((await fidelite().lireCagnotte(compte.partenaireRef)).soldeHt).toBe(7_000);

    const alertesAvant = await dbSite().messageDemonstration.count({ where: { objet: "Remboursement réduit : bons d'achat déjà dépensés" } });
    await administration.deciderRemboursement(credit.ref, credit.montantTtc, "Retour complet");
    const [decision] = await dbDemo().remboursement.findMany({ where: { commande: { ref: credit.ref } } });
    expect(decision!.bonsDeduitsHtCentimes).toBe(5_000);
    expect(decision!.montantTtcCentimes).toBe(credit.montantTtc - decision!.deductionTtcCentimes);
    await suivreCommandes();
    expect(await dbSite().messageDemonstration.count({ where: { objet: "Remboursement réduit : bons d'achat déjà dépensés" } })).toBe(alertesAvant + 1);

    await suivreFidelite();
    await suivreFidelite();
    expect(await emails(compte.email, "Bons d'achat retirés")).toBe(1);
    expect((await dernierEmail(compte.email, "Bons d'achat retirés")).rendu).toContain("70,00");
    expect((await fidelite().lireCagnotte(compte.partenaireRef)).soldeHt).toBe(0); // jamais négatif
    expect((await fidelite().lireDroitsAssistance(compte.partenaireRef)).statut).toBe("inactif");
  });

  it("commande payée en bons, remboursée : bons rendus avec leur validité d'origine, un email", async () => {
    const compte = await compteValide();
    await commandePayee(compte.partenaireRef, COMMANDE_1200);
    const origine = (await fidelite().lireCagnotte(compte.partenaireRef)).lots[0]!.validiteFin;
    const payeeEnBons = await commandePayee(compte.partenaireRef, [{ defaultCode: CARTE_SD, quantite: 4 }], 5_000);
    expect((await fidelite().lireCagnotte(compte.partenaireRef)).soldeHt).toBe(7_000);

    await administration.deciderRemboursement(payeeEnBons.ref, payeeEnBons.montantTtc, "Erreur de commande");
    await suivreCommandes();
    const cagnotte = await fidelite().lireCagnotte(compte.partenaireRef);
    expect(cagnotte.soldeHt).toBe(12_000);
    const restitution = cagnotte.mouvements.find((m) => m.type === "restitution")!;
    expect(restitution.validiteFin!.getTime()).toBe(origine.getTime());
    await suivreFidelite();
    await suivreFidelite();
    expect(await emails(compte.email, "Bons d'achat rendus")).toBe(1);
  });

  it("virement annulé faute de paiement : ni crédit ni retrait, aucun email", async () => {
    const compte = await compteValide();
    const { ref } = await commandeVirement(compte.partenaireRef, COMMANDE_1200);
    await creerRegistre(process.env).odoo().commandes.annulerCommandeEnAttente(ref, "Virement non reçu à l'échéance");
    await suivreFidelite();
    const cagnotte = await fidelite().lireCagnotte(compte.partenaireRef);
    expect(cagnotte.mouvements).toEqual([]);
    expect(await dbSite().messageDemonstration.count({ where: { destinataire: compte.email, objet: { contains: "ons d'achat" } } })).toBe(0);
  });
});
