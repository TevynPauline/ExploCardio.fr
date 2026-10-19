import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import type { Location, ResumeFacture } from "@/connecteurs/odoo/interfaces";
import { dbSite } from "@/lib/db/site";
import { emailsLocations } from "@/emails/modeles-locations";
import { ajouterAuPanier } from "../catalogue/panier";
import { envoyer } from "../commande/notifications";
import { datesProposees, libelleJour } from "./calendrier";
import { lireReglesLivraison, premiereDatePour } from "./offre";
import { commandeDeLocation } from "./suivi";

// Gestion des locations par le client (F05, US3, US4, US7) : chaque location est présentée et
// gérée séparément ; les règles (fin au terme du mois payé, date limite de retour) sont celles
// d'Odoo. Chaque action est journalisée (FR-041).

export class ActionLocationRefusee extends Error {}

export type ActionsLocation = {
  resilier: boolean;
  prolonger: boolean;
  etiquette: boolean;
  annuler: boolean;
  reporter: boolean;
  acheter: boolean;
  financer: boolean;
};

export type LocationDuCompte = Location & { actions: ActionsLocation; factures: ResumeFacture[] };

/** Actions proposées selon l'état (FR-018, FR-019) ; « Prolonger » seulement avant la fin. */
export function actionsDe(l: Location, maintenant = new Date()): ActionsLocation {
  const avantFin = Boolean(l.fin && l.fin > maintenant);
  return {
    resilier: l.etat === "en_cours" || l.etat === "suspendue_impaye",
    prolonger: l.etat === "resiliation_prevue" && avantFin,
    etiquette: l.etat === "resiliation_prevue" || l.etat === "en_retard_retour",
    annuler: l.etat === "commandee" && !l.expedieLe,
    reporter: l.etat === "commandee" && l.attenteChoixClient,
    acheter: l.etat === "en_cours" || l.etat === "resiliation_prevue",
    financer: l.etat === "en_cours" || l.etat === "resiliation_prevue",
  };
}

async function journal(compteId: string, action: string, objet: string, detail: object) {
  await dbSite().journalAction.create({ data: { auteurId: null, auteur: `client (${compteId})`, action, objet, detail: JSON.parse(JSON.stringify(detail)) } });
}

async function compteDe(compteId: string) {
  const compte = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compteId }, include: { utilisateur: true, adresses: true } });
  return compte;
}

/** Locations du compte (en cours, commandées, historique) avec leurs factures et actions. */
export async function locationsDuCompte(compteId: string): Promise<{ actives: LocationDuCompte[]; historique: LocationDuCompte[]; indisponible: boolean }> {
  const compte = await compteDe(compteId);
  if (!compte.odooPartnerRef) return { actives: [], historique: [], indisponible: false };
  try {
    const [locations, factures] = await Promise.all([
      registre.odoo().location.listerLocations(compte.odooPartnerRef),
      registre.odoo().factures.listerFactures(compte.odooPartnerRef),
    ]);
    const toutes = locations
      .filter((l) => l.objet === "mise_a_disposition")
      .map((l) => ({ ...l, actions: actionsDe(l), factures: factures.filter((f) => f.references.includes(l.ref)) }));
    return {
      actives: toutes.filter((l) => l.etat !== "terminee" && l.etat !== "annulee"),
      historique: toutes.filter((l) => l.etat === "terminee" || l.etat === "annulee"),
      indisponible: false,
    };
  } catch (e) {
    if (!estErreurConnecteur(e)) throw e;
    return { actives: [], historique: [], indisponible: true };
  }
}

/** Location du compte (jamais celle d'un autre client). */
export async function locationDuCompte(compteId: string, ref: string): Promise<Location> {
  const compte = await compteDe(compteId);
  const l = compte.odooPartnerRef ? (await registre.odoo().location.listerLocations(compte.odooPartnerRef)).find((x) => x.ref === ref) : null;
  if (!l) throw new ActionLocationRefusee("Location introuvable.");
  return l;
}

/**
 * Résiliation (FR-021 à FR-023) : fin au terme du mois payé, prélèvements mensuels de cette
 * location arrêtés (autorisation conservée jusqu'au retour, FR-030), fermeture de l'accès
 * Cloud programmée à la date de fin, instructions et étiquette de retour.
 */
export async function resilier(compteId: string, ref: string, maintenant = new Date()) {
  const l = await locationDuCompte(compteId, ref);
  if (!actionsDe(l, maintenant).resilier) throw new ActionLocationRefusee("Cette location ne peut pas être résiliée.");
  const { fin, dateLimiteRetour } = await registre.odoo().location.resilier(ref, maintenant);
  const lien = await commandeDeLocation(ref);
  if (lien?.element) {
    await registre.stripe().retirerElementAbonnement(lien.commande.ref, lien.element, fin, `resiliation:${ref}:${fin.toISOString().slice(0, 10)}`);
  }
  const compte = await compteDe(compteId);
  await envoyer(compte.utilisateur.email, await emailsLocations.resiliee({ appareil: l.libelle, fin, dateLimiteRetour, logiciel: Boolean(l.logiciel) }), "location résiliée", `location-resiliee:${compteId}:${ref}:${fin.toISOString().slice(0, 10)}`);
  await journal(compteId, "location.resiliee", ref, { fin, dateLimiteRetour });
  return { fin, dateLimiteRetour };
}

/** « Prolonger » (FR-019) : la résiliation programmée est annulée tant que la fin n'est pas atteinte. */
export async function prolonger(compteId: string, ref: string, maintenant = new Date()) {
  const l = await locationDuCompte(compteId, ref);
  if (!actionsDe(l, maintenant).prolonger) throw new ActionLocationRefusee("La location est arrivée à son terme : une nouvelle location est nécessaire.");
  await registre.odoo().location.annulerResiliation(ref);
  const lien = await commandeDeLocation(ref);
  if (lien?.element) await registre.stripe().retablirElementAbonnement(lien.commande.ref, lien.element);
  const compte = await compteDe(compteId);
  await envoyer(compte.utilisateur.email, await emailsLocations.prolongee({ appareil: l.libelle }), "location prolongée", `location-prolongee:${compteId}:${ref}:${maintenant.toISOString()}`);
  await journal(compteId, "location.prolongee", ref, {});
}

export async function etiquette(compteId: string, ref: string): Promise<Uint8Array> {
  const l = await locationDuCompte(compteId, ref);
  if (!actionsDe(l).etiquette) throw new ActionLocationRefusee("L'étiquette de retour est disponible après la résiliation.");
  const pdf = await registre.odoo().location.etiquetteRetour(ref);
  await journal(compteId, "location.etiquette", ref, {});
  return pdf;
}

/** Annulation avant expédition (hypothèse confirmée) : gratuite, premier mois remboursé intégralement. */
export async function annuler(compteId: string, ref: string) {
  const l = await locationDuCompte(compteId, ref);
  if (!actionsDe(l).annuler) throw new ActionLocationRefusee("L'appareil est déjà parti : la location se résilie.");
  const { montantTtc } = await registre.odoo().location.annulerCommande(ref, "Annulation par le client avant expédition", `annulation:${ref}`);
  const lien = await commandeDeLocation(ref);
  if (lien) {
    if (montantTtc && lien.commande.paiementAbonnementRef) {
      await registre.stripe().rembourser({ paiementRef: lien.commande.paiementAbonnementRef, montantTtc, motif: "Annulation avant expédition" }, `annulation:${ref}`);
    }
    if (lien.element) await registre.stripe().retirerElementAbonnement(lien.commande.ref, lien.element, new Date(), `annulation:${ref}`);
  }
  const compte = await compteDe(compteId);
  await envoyer(compte.utilisateur.email, await emailsLocations.annuleeRemboursee({ appareil: l.libelle, montantTtc, motif: "à votre demande, avant l'expédition" }), "location annulée", `location-annulee:${compteId}:${ref}`);
  await journal(compteId, "location.annulee", ref, { rembourseTtc: montantTtc });
  return { montantTtc };
}

/** Dates proposées pour reporter une livraison (appareil défectueux à la préparation). */
export async function datesDeReport(compteId: string, ref: string) {
  const l = await locationDuCompte(compteId, ref);
  const compte = await compteDe(compteId);
  const cp = (compte.adresses.find((a) => a.type === "livraison") ?? compte.adresses.find((a) => a.type === "cabinet"))?.codePostal ?? null;
  const premiere = await premiereDatePour(l.defaultCode, cp);
  return datesProposees(premiere, await lireReglesLivraison()).map((d) => ({ valeur: d, libelle: libelleJour(d) }));
}

export async function reporter(compteId: string, ref: string, date: string) {
  const l = await locationDuCompte(compteId, ref);
  if (!actionsDe(l).reporter) throw new ActionLocationRefusee("La date de livraison ne peut plus être changée.");
  if (!(await datesDeReport(compteId, ref)).some((d) => d.valeur === date)) throw new ActionLocationRefusee("Choisissez une date parmi celles proposées.");
  await registre.odoo().location.reporterLivraison(ref, new Date(`${date}T12:00:00Z`));
  await journal(compteId, "location.reportee", ref, { date });
}

/** « Passer à l'achat » (FR-031) : appareil neuf au panier, au prix du catalogue ; la location continue. */
export async function passerAlAchat(compteId: string, ref: string) {
  const l = await locationDuCompte(compteId, ref);
  if (!actionsDe(l).acheter) throw new ActionLocationRefusee("Cette location ne permet pas de passer à l'achat.");
  const r = await ajouterAuPanier({ compteId }, { defaultCode: l.defaultCode, formule: "achat", quantite: 1 });
  if (!r.ok) throw new ActionLocationRefusee(r.message);
  await journal(compteId, "location.passer_achat", ref, { defaultCode: l.defaultCode });
}
