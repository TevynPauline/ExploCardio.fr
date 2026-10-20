import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { emailsCloud } from "@/emails/modeles-cloud";
import { dbSite } from "@/lib/db/site";
import { lireParametreEntier } from "@/lib/parametres";
import type { AccesLogiciel } from "@generated/site/client";
import { alerterEquipe, envoyer } from "../commande/notifications";
import { fermerAcces, passerEnGrace, reprendreOuvertures } from "./acces";

// Échéances des accès Cloud (F12, R5), toutes les heures : délai de grâce à la fin prévue,
// fermeture au terme du délai, rappels avant la fin, alertes si un accès reste ouvert au-delà
// de sa date (FR-011) ou si une tâche de l'équipe n'est pas faite à temps (FR-021).

const JOUR = 24 * 3600_000;

async function emailDe(acces: AccesLogiciel) {
  const c = await dbSite().compteClient.findUnique({ where: { id: acces.compteId }, include: { utilisateur: true } });
  return c && c.statut !== "supprime" ? c.utilisateur.email : null;
}

export type BilanEcheances = { graces: number; fermetures: number; rappels: number; alertes: number; reprises: number };

export async function traiterEcheancesCloud(maintenant = new Date()): Promise<BilanEcheances> {
  const bilan: BilanEcheances = { graces: 0, fermetures: 0, rappels: 0, alertes: 0, reprises: 0 };
  const [rappelFin, rappelPeriode, delaiGrace] = await Promise.all([
    lireParametreEntier("cloud.rappel_fin_jours", 7),
    lireParametreEntier("cloud.rappel_periode_jours", 30),
    lireParametreEntier("cloud.delai_grace_jours", 30),
  ]);

  // Ouvertures en échec reprises à chaque passage ; la reprise des droits ouverts hors du site
  // (relecture de toute la plateforme) ne se fait qu'à la réinitialisation de la démonstration.
  bilan.reprises = await reprendreOuvertures(maintenant);

  // Rappels avant la fin (FR-008, FR-029) : une fois par fin prévue.
  for (const a of await dbSite().accesLogiciel.findMany({ where: { etat: "actif", finPrevue: { gt: maintenant } } })) {
    const fin = a.finPrevue!;
    const email = await emailDe(a);
    if (!email) continue;
    if (a.origine === "periode_incluse" && fin.getTime() - maintenant.getTime() <= rappelPeriode * JOUR && a.rappelPeriodePour?.getTime() !== fin.getTime()) {
      await envoyer(email, await emailsCloud.rappelPeriode({ logiciel: a.libelle, fin }), "accès Cloud : fin de période incluse", `cloud:${a.partenaireRef}:${a.id}:periode:${fin.toISOString()}`);
      await dbSite().accesLogiciel.update({ where: { id: a.id }, data: { rappelPeriodePour: fin } });
      bilan.rappels++;
    }
    if (fin.getTime() - maintenant.getTime() <= rappelFin * JOUR && a.rappelFinPour?.getTime() !== fin.getTime()) {
      await envoyer(email, await emailsCloud.rappelFin({ logiciel: a.libelle, fin, delaiGraceJours: a.sansGrace ? 0 : delaiGrace }), "accès Cloud : fin proche", `cloud:${a.partenaireRef}:${a.id}:fin:${fin.toISOString()}`);
      await dbSite().accesLogiciel.update({ where: { id: a.id }, data: { rappelFinPour: fin } });
      bilan.rappels++;
    }
  }

  // Fin prévue atteinte : délai de grâce (ou fermeture directe sans délai de grâce).
  for (const a of await dbSite().accesLogiciel.findMany({ where: { etat: { in: ["actif", "suspendu"] }, finPrevue: { lte: maintenant } } })) {
    try {
      const apres = await passerEnGrace(a, maintenant);
      if (apres.etat === "grace") bilan.graces++;
      else if (apres.etat === "ferme") bilan.fermetures++;
    } catch (e) {
      if (!estErreurConnecteur(e)) throw e;
    }
  }

  // Délai de grâce écoulé : fermeture.
  for (const a of await dbSite().accesLogiciel.findMany({ where: { etat: "grace", finGrace: { lte: maintenant } } })) {
    try {
      if ((await fermerAcces(a, "fin du délai de grâce", undefined, maintenant)).etat === "ferme") bilan.fermetures++;
    } catch (e) {
      if (!estErreurConnecteur(e)) throw e;
    }
  }

  // FR-011 : un accès encore ouvert un jour après sa date de fermeture déclenche une alerte.
  const enRetard = await dbSite().accesLogiciel.findMany({
    where: {
      OR: [
        { etat: "grace", finGrace: { lte: new Date(maintenant.getTime() - JOUR) } },
        { etat: { in: ["actif", "suspendu"] }, finPrevue: { lte: new Date(maintenant.getTime() - JOUR) } },
      ],
    },
  });
  for (const a of enRetard) {
    if (a.alerteLe && maintenant.getTime() - a.alerteLe.getTime() < JOUR) continue;
    await alerterEquipe(
      "Accès Cloud non fermé à temps",
      `L'accès au logiciel ${a.libelle} (client ${a.partenaireRef}) devait être fermé et ne l'est pas encore. Vérifiez la plateforme et Back-office → Logiciels Cloud.`,
      `cloud-retard:${a.id}:${maintenant.toISOString().slice(0, 10)}`,
    );
    await dbSite().accesLogiciel.update({ where: { id: a.id }, data: { alerteLe: maintenant } });
    bilan.alertes++;
  }

  // FR-021 : tâches de l'équipe non confirmées à leur échéance : une alerte chacune.
  const taches = await dbSite().tacheAcces.findMany({ where: { etat: "a_faire", alerteLe: null, echeance: { lte: maintenant } }, include: { acces: true } });
  for (const t of taches) {
    await alerterEquipe(
      "Tâche d'accès Cloud en retard",
      `${t.action === "ouvrir" ? "Ouvrir" : "Fermer"} l'accès au logiciel ${t.acces.libelle} (client ${t.acces.partenaireRef}) : à faire avant le ${t.echeance.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}, toujours pas confirmé.`,
      `cloud-tache-retard:${t.id}`,
    );
    await dbSite().tacheAcces.update({ where: { id: t.id }, data: { alerteLe: maintenant } });
    bilan.alertes++;
  }
  return bilan;
}
