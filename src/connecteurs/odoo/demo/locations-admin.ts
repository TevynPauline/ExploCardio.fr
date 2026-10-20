import type { StatutParc } from "@generated/demo/client";
import { NotFound } from "../../erreurs";
import { ValeurRefusee } from "./administration";
import { lireReglesLocation, noterHistorique } from "./location";
import { ajouterJours, ajouterMois, db, prochainNumeroFacture, type Tx } from "./outils";

// Cycle des locations en démonstration (F05, T006) : ce que l'équipe fera dans Odoo
// (préparer et expédier, livrer, enregistrer un retour, un kit, un impayé) et les actions
// planifiées d'Odoo (échéances, nouvelles tentatives, suspension, retard, facturations).
// Ces opérations n'existent pas en mode réel.

async function lire(tx: Tx, ref: string) {
  const a = await tx.abonnement.findUnique({ where: { ref }, include: { variante: { include: { offreMad: true, modele: true } }, partenaire: true } });
  if (!a) throw new NotFound("Abonnement", ref);
  return a;
}

/** Facture émise après la fin (retard, dégradation, remplacement), à prélever sur l'autorisation (FR-030). */
async function factureAPrelever(tx: Tx, a: Awaited<ReturnType<typeof lire>>, montantHt: number, libelle: string, cle: string) {
  const deja = await tx.facture.findUnique({ where: { cle } });
  if (deja) return deja.numero;
  const taux = Number(a.variante.tauxTva);
  const ttc = Math.round((montantHt * (100 + taux)) / 100);
  const f = await tx.facture.create({
    data: {
      numero: await prochainNumeroFacture(tx, new Date()),
      type: "facture",
      cle,
      partenaireId: a.partenaireId,
      montantHtCentimes: montantHt,
      tvaCentimes: ttc - montantHt,
      montantTtcCentimes: ttc,
      etatPaiement: "a_prelever",
      lignes: [{ libelle, reference: a.ref, quantite: 1, prixUnitaireHtCentimes: montantHt, remiseCentimes: 0, totalHtCentimes: montantHt }],
    },
  });
  await tx.abonnement.update({ where: { id: a.id }, data: { modifieLe: new Date() } });
  return f.numero;
}

export async function listerLocationsRecentes(limite = 40) {
  return db().abonnement.findMany({
    where: { objet: "mise_a_disposition" },
    include: { variante: { include: { modele: true } }, numeroSerie: true, partenaire: true },
    orderBy: { modifieLe: "desc" },
    take: limite,
  });
}

export async function appareilsDisponibles(defaultCode: string) {
  return db().numeroSerie.findMany({ where: { variante: { defaultCode }, statut: "disponible" }, orderBy: { numero: "asc" } });
}

export async function preparerExpedition(ref: string, transporteur: string, suivi: string, numeroSerie?: string) {
  if (!transporteur.trim() || !suivi.trim()) throw new ValeurRefusee("Indiquez le transporteur et le numéro de suivi.");
  await db().$transaction(async (tx) => {
    const a = await lire(tx, ref);
    if (a.etat !== "commandee") throw new ValeurRefusee("Seule une location commandée peut être expédiée.");
    if (a.expeditionBloquee) throw new ValeurRefusee("Expédition bloquée : le compte du client n'est pas encore validé.");
    let lotId = a.numeroSerieId;
    const voulu = numeroSerie ? await tx.numeroSerie.findUnique({ where: { numero: numeroSerie } }) : null;
    if (numeroSerie && !voulu) throw new NotFound("Appareil", numeroSerie);
    if (voulu && voulu.id !== lotId) {
      const pris = await tx.numeroSerie.updateMany({ where: { id: voulu.id, statut: "disponible", varianteId: a.varianteId }, data: { statut: "loue" } });
      if (pris.count !== 1) throw new ValeurRefusee("Cet appareil n'est pas disponible pour cette location.");
      if (lotId) await tx.numeroSerie.update({ where: { id: lotId }, data: { statut: "disponible" } });
      lotId = voulu.id;
    }
    if (!lotId) {
      const libre = await tx.numeroSerie.findFirst({ where: { varianteId: a.varianteId, statut: "disponible" }, orderBy: { numero: "asc" } });
      if (!libre) throw new ValeurRefusee("Aucun appareil disponible pour cette location.");
      await tx.numeroSerie.update({ where: { id: libre.id }, data: { statut: "loue" } });
      lotId = libre.id;
    }
    await tx.abonnement.update({
      where: { ref },
      data: { numeroSerieId: lotId, transporteur: transporteur.trim(), suivi: suivi.trim(), expedieLe: new Date(), colisNonLivre: false, attenteChoixClient: false },
    });
    await noterHistorique(tx, lotId, { evenement: "expedie", abonnement: ref, suivi });
  });
}

/** Appareil trouvé défectueux à la préparation : autre appareil, ou choix du client (reporter ou annuler). */
export async function signalerAppareilDefectueux(ref: string): Promise<{ remplace: boolean }> {
  return db().$transaction(async (tx) => {
    const a = await lire(tx, ref);
    if (a.etat !== "commandee" || a.expedieLe) throw new ValeurRefusee("Seul un appareil pas encore expédié peut être signalé défectueux.");
    if (a.numeroSerieId) {
      await tx.numeroSerie.update({ where: { id: a.numeroSerieId }, data: { statut: "en_maintenance" } });
      await noterHistorique(tx, a.numeroSerieId, { evenement: "defectueux", abonnement: ref });
    }
    const autre = await tx.numeroSerie.findFirst({ where: { varianteId: a.varianteId, statut: "disponible" }, orderBy: { numero: "asc" } });
    if (autre) {
      await tx.numeroSerie.update({ where: { id: autre.id }, data: { statut: "loue" } });
      await tx.abonnement.update({ where: { ref }, data: { numeroSerieId: autre.id } });
      await noterHistorique(tx, autre.id, { evenement: "affecte", abonnement: ref });
      return { remplace: true };
    }
    await tx.abonnement.update({ where: { ref }, data: { numeroSerieId: null, attenteChoixClient: true } });
    return { remplace: false };
  });
}

export async function colisNonLivre(ref: string) {
  const a = await lire(db(), ref);
  if (a.etat !== "commandee" || !a.expedieLe) throw new ValeurRefusee("Seul un colis expédié et pas encore livré peut être signalé.");
  await db().abonnement.update({ where: { ref }, data: { colisNonLivre: true } });
}

export async function marquerLivree(ref: string, date = new Date()) {
  await db().$transaction(async (tx) => {
    const a = await lire(tx, ref);
    if (a.etat !== "commandee" || !a.expedieLe) throw new ValeurRefusee("La location doit être expédiée avant d'être livrée.");
    // La location commence à la livraison ; les échéances suivantes tombent le même jour (hypothèse confirmée).
    await tx.abonnement.update({ where: { ref }, data: { etat: "en_cours", debut: date, prochaineEcheance: ajouterMois(date, 1), colisNonLivre: false } });
  });
}

export async function enregistrerRetour(ref: string, etatRetour: "complet" | "degrade" | "perdu", statutAppareil: Extract<StatutParc, "disponible" | "en_maintenance">, montantDegradationHt = 0) {
  if (etatRetour === "degrade") {
    if (!Number.isInteger(montantDegradationHt) || montantDegradationHt <= 0) throw new ValeurRefusee("Indiquez le montant HT de la dégradation constatée.");
  }
  await db().$transaction(async (tx) => {
    const a = await lire(tx, ref);
    if (!["resiliation_prevue", "en_retard_retour", "suspendue_impaye", "en_cours"].includes(a.etat)) throw new ValeurRefusee("Aucune location en cours pour ce retour.");
    await tx.abonnement.update({
      where: { ref },
      data: {
        etat: "terminee",
        fin: a.fin ?? new Date(),
        etatRetour,
        montantDegradationCentimes: etatRetour === "degrade" ? montantDegradationHt : null,
        impayeDepuis: null,
      },
    });
    if (a.numeroSerieId && etatRetour !== "perdu") {
      await noterHistorique(tx, a.numeroSerieId, { evenement: "en_retour", abonnement: ref });
      await tx.numeroSerie.update({ where: { id: a.numeroSerieId }, data: { statut: statutAppareil, retourPrevu: null } });
      await noterHistorique(tx, a.numeroSerieId, { evenement: statutAppareil, etatRetour });
    }
    if (etatRetour === "degrade") await factureAPrelever(tx, a, montantDegradationHt, "Dégradation constatée au retour de l'appareil", `degradation:${ref}`);
    if (etatRetour === "perdu" && a.variante.offreMad) {
      await factureAPrelever(tx, a, a.variante.offreMad.valeurRemplacementCentimes, "Valeur de remplacement de l'appareil non restitué", `remplacement:${ref}`);
    }
  });
}

export async function enregistrerKit(partenaireRef: string, kit: string, auteur: string) {
  const p = await db().partenaire.findUnique({ where: { ref: partenaireRef } });
  if (!p) throw new NotFound("Partenaire", partenaireRef);
  const offre = await db().offreMiseADisposition.findFirst({ where: { kitRequis: kit } });
  if (!offre) throw new ValeurRefusee("Ce code n'est le kit d'aucune offre de mise à disposition.");
  await db().kitPossede.upsert({
    where: { partenaireId_kitDefaultCode: { partenaireId: p.id, kitDefaultCode: kit } },
    create: { partenaireId: p.id, kitDefaultCode: kit, origine: "enregistrement", auteur },
    update: {},
  });
}

export async function echouerPrelevement(ref: string, date = new Date()) {
  const a = await lire(db(), ref);
  if (!["en_cours", "resiliation_prevue"].includes(a.etat)) throw new ValeurRefusee("Seule une location en cours peut avoir un prélèvement échoué.");
  if (!a.impayeDepuis) await db().abonnement.update({ where: { ref }, data: { impayeDepuis: date, tentativesPrelevement: 0 } });
}

export async function regulariser(ref: string) {
  const a = await lire(db(), ref);
  if (!a.impayeDepuis) throw new ValeurRefusee("Aucun impayé à régulariser.");
  await db().abonnement.update({
    where: { ref },
    data: { impayeDepuis: null, tentativesPrelevement: 0, ...(a.etat === "suspendue_impaye" ? { etat: "en_cours" as const } : {}) },
  });
}

/**
 * Actions planifiées d'Odoo à une date (démonstration) : fins atteintes, nouvelles tentatives
 * et suspension des impayés, facturation des retards et de la valeur de remplacement. Renvoie
 * les locations dont l'échéance est due, que la démonstration fait prélever par Stripe.
 */
export async function executerActionsPlanifiees(date: Date): Promise<{ echeancesDues: { ref: string; montantMensuelHt: number; tauxTva: number }[] }> {
  const regles = await lireReglesLocation();
  const echeancesDues: { ref: string; montantMensuelHt: number; tauxTva: number }[] = [];
  const locations = await db().abonnement.findMany({
    // F12 : les abonnements logiciels suivent les mêmes échéances et impayés, sans appareil à rendre.
    where: { objet: { in: ["mise_a_disposition", "logiciel"] }, etat: { in: ["en_cours", "resiliation_prevue", "en_retard_retour", "suspendue_impaye"] } },
    include: { variante: { include: { offreMad: true, modele: true } }, partenaire: true },
  });
  for (const a of locations) {
    await db().$transaction(async (tx) => {
      // Fin atteinte sans retour enregistré : retard de retour (abonnement logiciel : terminé).
      if (a.etat === "resiliation_prevue" && a.fin && a.fin <= date) {
        await tx.abonnement.update({ where: { id: a.id }, data: { etat: a.objet === "logiciel" ? "terminee" : "en_retard_retour" } });
        return;
      }
      // Impayé : nouvelles tentatives espacées, puis suspension au terme du délai de régularisation.
      if (a.impayeDepuis && a.etat !== "en_retard_retour") {
        const tentativesDues = Math.min(regles.tentativesPrelevement, Math.floor((date.getTime() - a.impayeDepuis.getTime()) / (regles.espacementTentativesJours * 86_400_000)));
        const terme = ajouterJours(a.impayeDepuis, regles.delaiRegularisationJours);
        const data: { tentativesPrelevement?: number; etat?: "suspendue_impaye" } = {};
        if (tentativesDues > a.tentativesPrelevement) data.tentativesPrelevement = tentativesDues;
        if (terme <= date && a.etat !== "suspendue_impaye") data.etat = "suspendue_impaye";
        if (Object.keys(data).length) await tx.abonnement.update({ where: { id: a.id }, data });
        return;
      }
      // Retard de retour : mois suivant facturé au-delà de la tolérance, puis valeur de remplacement.
      if (a.etat === "en_retard_retour" && a.dateLimiteRetour) {
        const debutFacturation = ajouterJours(a.dateLimiteRetour, regles.toleranceRetardJours);
        if (date > debutFacturation) {
          const mois = Math.floor((date.getTime() - debutFacturation.getTime()) / (30 * 86_400_000)) + 1;
          for (let i = 1; i <= mois; i++) {
            await factureAPrelever(tx, a, a.montantMensuelCentimes, `Location prolongée faute de retour de l'appareil (mois ${i})`, `retard:${a.ref}:${i}`);
          }
        }
        if (a.variante.offreMad && date > ajouterJours(a.dateLimiteRetour, regles.delaiNonRetourJours)) {
          await factureAPrelever(tx, a, a.variante.offreMad.valeurRemplacementCentimes, "Valeur de remplacement de l'appareil non restitué", `remplacement:${a.ref}`);
        }
        return;
      }
      // Échéance mensuelle atteinte (location non résiliée avant cette date).
      if (a.prochaineEcheance && a.prochaineEcheance <= date && (a.etat === "en_cours" || (a.etat === "resiliation_prevue" && a.fin && a.fin > a.prochaineEcheance))) {
        echeancesDues.push({ ref: a.ref, montantMensuelHt: a.montantMensuelCentimes, tauxTva: Number(a.variante.tauxTva) });
      }
    });
  }
  return { echeancesDues };
}

export async function modifierReglesLocation(r: import("../interfaces").ReglesLocation) {
  const champs: [keyof typeof r, string, number][] = [
    ["tentativesPrelevement", "Nouvelles tentatives de prélèvement", 0],
    ["espacementTentativesJours", "Espacement des tentatives (jours)", 1],
    ["delaiRegularisationJours", "Délai de régularisation (jours)", 1],
    ["delaiRetourJoursOuvres", "Délai de retour (jours ouvrés)", 1],
    ["toleranceRetardJours", "Tolérance avant facturation du mois suivant (jours)", 0],
    ["delaiNonRetourJours", "Délai avant facturation de la valeur de remplacement (jours)", 1],
  ];
  for (const [cle, libelle, min] of champs) {
    const v = r[cle];
    if (!Number.isInteger(v) || v < min || v > 365) throw new ValeurRefusee(`${libelle} : nombre entier entre ${min} et 365 attendu.`);
  }
  if (r.delaiNonRetourJours <= r.toleranceRetardJours) {
    throw new ValeurRefusee("Le délai avant facturation de la valeur de remplacement doit dépasser la tolérance de retard.");
  }
  const avant = await lireReglesLocation();
  const existant = await db().reglesLocation.findFirst({ orderBy: { id: "desc" } });
  if (existant) await db().reglesLocation.update({ where: { id: existant.id }, data: r });
  else await db().reglesLocation.create({ data: r });
  return { avant, apres: r };
}
