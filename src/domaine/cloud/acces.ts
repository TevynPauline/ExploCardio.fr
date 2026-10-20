import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import type { EtatAcces, Medecin } from "@/connecteurs/pca/interfaces";
import { emailsCloud } from "@/emails/modeles-cloud";
import type { EmailRendu } from "@/emails/modeles";
import { ajouterJoursOuvres, dateDuJour, jourDeParis } from "@/lib/calendrier";
import { dbSite } from "@/lib/db/site";
import { lireParametreEntier } from "@/lib/parametres";
import type { AccesLogiciel, ActionTacheAcces, OrigineAcces } from "@generated/site/client";
import { alerterEquipe, envoyer } from "../commande/notifications";

// Accès aux logiciels Cloud (F12, R1, R3) : SEUL chemin pour agir sur un accès. Chaque action
// appelle le connecteur PCA, met à jour le registre, journalise (FR-018), prévient le client et,
// si la plateforme n'est pas automatisée, crée la tâche de l'équipe (FR-019 à FR-022). Les
// emails partent à la confirmation en sous-mode manuel : le médecin voit la même chose dans
// les deux sous-modes (SC-006). Aucun mot de passe, aucune donnée de patient (FR-014, FR-026).

export type Auteur = { id: string | null; libelle: string };
export const AUTOMATIQUE: Auteur = { id: null, libelle: "accès Cloud (automatique)" };

const JOUR = 24 * 3600_000;
/** Délai entre deux alertes pour un même accès en échec (FR-005, FR-011). */
const RELANCE_ALERTE_MS = JOUR;

type CompteAvecUtilisateur = Awaited<ReturnType<typeof compteDe>>;

async function compteDe(compteId: string) {
  return dbSite().compteClient.findUniqueOrThrow({ where: { id: compteId }, include: { utilisateur: true } });
}

/**
 * Données transmises à la plateforme (FR-026) : liste fermée — identité professionnelle, email,
 * RPPS ou SIRET, cabinet. Rien d'autre.
 */
export function medecinDe(c: CompteAvecUtilisateur): Medecin {
  return {
    partenaireRef: c.odooPartnerRef!,
    nom: c.utilisateur.name,
    email: c.utilisateur.email,
    ...(c.rpps ? { rpps: c.rpps } : {}),
    ...(c.siret ? { siret: c.siret } : {}),
    ...(c.nomCabinet ? { cabinet: c.nomCabinet } : {}),
  };
}

async function journal(action: string, acces: AccesLogiciel, auteur: Auteur, detail: Record<string, unknown> = {}) {
  await dbSite().journalAction.create({
    data: {
      auteurId: auteur.id,
      auteur: auteur.libelle,
      action: `cloud.${action}`,
      objet: acces.id,
      detail: JSON.parse(JSON.stringify({ logiciel: acces.logiciel, partenaire: acces.partenaireRef, ...detail })),
    },
  });
}

async function prevenir(acces: AccesLogiciel, quoi: string, rendu: Promise<EmailRendu>) {
  const c = await compteDe(acces.compteId);
  if (c.statut === "supprime") return;
  await envoyer(c.utilisateur.email, await rendu, `accès Cloud : ${quoi}`, `cloud:${acces.partenaireRef}:${acces.id}:${quoi}`);
}

/** Libellé lisible du logiciel (nom de l'article dans Odoo), sinon sa référence. */
async function libelleDe(logiciel: string): Promise<string> {
  try {
    return (await registre.odoo().catalogue.lireArticle(logiciel)).nom.replace(/\s*\(logiciel Cloud\)\s*$/i, "");
  } catch {
    return logiciel;
  }
}

async function alerterUneFois(acces: AccesLogiciel, objet: string, texte: string, maintenant = new Date()) {
  if (acces.alerteLe && maintenant.getTime() - acces.alerteLe.getTime() < RELANCE_ALERTE_MS) return;
  await alerterEquipe(objet, texte, `cloud-alerte:${acces.id}:${objet}`);
  await dbSite().accesLogiciel.update({ where: { id: acces.id }, data: { alerteLe: maintenant } });
}

async function creerTache(acces: AccesLogiciel, action: ActionTacheAcces, echeance: Date) {
  const deja = await dbSite().tacheAcces.findFirst({ where: { accesId: acces.id, action, etat: "a_faire" } });
  if (deja) return deja;
  const tache = await dbSite().tacheAcces.create({ data: { accesId: acces.id, action, echeance } });
  const c = await compteDe(acces.compteId);
  await alerterEquipe(
    action === "ouvrir" ? "Accès Cloud à ouvrir" : "Accès Cloud à fermer",
    `${action === "ouvrir" ? "Ouvrir" : "Fermer"} sur la plateforme l'accès de ${c.utilisateur.name} (${c.utilisateur.email}) au logiciel ${acces.libelle}, avant le ${echeance.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}, puis confirmer la tâche dans Back-office → Logiciels Cloud.`,
    `cloud-tache:${tache.id}`,
  );
  return tache;
}

/** Échéance d'une tâche d'ouverture (FR-021) : veille de la livraison, sinon un jour ouvré. */
function echeanceOuverture(livraison: Date | null | undefined, maintenant: Date): Date {
  if (livraison) return new Date(Math.max(maintenant.getTime(), livraison.getTime() - JOUR));
  return dateDuJour(ajouterJoursOuvres(jourDeParis(maintenant), 1));
}

async function appliquerOuverture(acces: AccesLogiciel, etat: EtatAcces, auteur: Auteur, echeanceTache: Date) {
  if (etat === "a_ouvrir") {
    await creerTache(acces, "ouvrir", echeanceTache);
    return dbSite().accesLogiciel.update({ where: { id: acces.id }, data: { etat: "en_ouverture" } });
  }
  const ouvert = await dbSite().accesLogiciel.update({ where: { id: acces.id }, data: { etat: "actif", alerteLe: null } });
  await journal("ouverture", ouvert, auteur, { origine: ouvert.origine, source: ouvert.sourceRef, fin: ouvert.finPrevue });
  if (!ouvert.ouvertureNotifiee) {
    await prevenir(ouvert, "ouverture", emailsCloud.ouverture({ logiciel: ouvert.libelle, fin: ouvert.finPrevue }));
    return dbSite().accesLogiciel.update({ where: { id: ouvert.id }, data: { ouvertureNotifiee: true } });
  }
  return ouvert;
}

export type DemandeOuverture = {
  compteId: string;
  logiciel: string;
  origine: OrigineAcces;
  sourceRef: string | null;
  debut: Date;
  /** null : sans fin (location ou abonnement en cours). */
  finPrevue: Date | null;
  /** Date de livraison d'une location : la tâche manuelle doit être faite la veille. */
  livraison?: Date | null;
};

/**
 * Ouvre l'accès, ou prolonge celui que le médecin a déjà pour ce logiciel (un seul accès par
 * logiciel, sur un seul compte — FR-003). Idempotent. Un échec de la plateforme laisse l'accès
 * « en cours d'ouverture », alerte l'équipe et sera repris (FR-005).
 */
export async function ouvrirAcces(d: DemandeOuverture, auteur: Auteur = AUTOMATIQUE, maintenant = new Date()): Promise<AccesLogiciel> {
  const compte = await compteDe(d.compteId);
  if (!compte.odooPartnerRef) throw new Error(`Compte ${d.compteId} sans fiche client : accès Cloud impossible.`);
  const partenaireRef = compte.odooPartnerRef;

  const exact = await dbSite().accesLogiciel.findFirst({ where: { partenaireRef, logiciel: d.logiciel, origine: d.origine, sourceRef: d.sourceRef } });
  if (!exact) {
    // Accès existant pour ce logiciel (autre origine) : prolongé, sans second droit.
    const existant = await dbSite().accesLogiciel.findFirst({
      where: { partenaireRef, logiciel: d.logiciel, etat: { not: "ferme" }, NOT: { origine: d.origine, sourceRef: d.sourceRef } },
      orderBy: { creeLe: "desc" },
    });
    if (existant) return prolongerAcces(existant, { origine: d.origine, sourceRef: d.sourceRef, finPrevue: d.finPrevue }, auteur);
  }
  let acces =
    exact ??
    (await dbSite()
      .accesLogiciel.create({
        data: {
          compteId: compte.id,
          partenaireRef,
          logiciel: d.logiciel,
          libelle: await libelleDe(d.logiciel),
          origine: d.origine,
          sourceRef: d.sourceRef,
          debut: d.debut,
          finPrevue: d.finPrevue,
        },
      })
      .catch(async (e: unknown) => {
        // Même ouverture déclenchée deux fois au même instant (clé unique).
        const deja = await dbSite().accesLogiciel.findFirst({ where: { partenaireRef, logiciel: d.logiciel, origine: d.origine, sourceRef: d.sourceRef } });
        if (deja) return deja;
        throw e;
      }));
  if (acces.etat === "actif" || acces.etat === "ferme" || acces.etat === "grace" || acces.etat === "suspendu") return acces;
  if (await dbSite().tacheAcces.findFirst({ where: { accesId: acces.id, action: "ouvrir", etat: "a_faire" } })) return acces;

  try {
    const { ref, etat } = await registre.pca().ouvrirDroit(
      { medecin: medecinDe(compte), logiciel: acces.logiciel, debut: acces.debut, finPrevue: acces.finPrevue },
      `acces:${acces.id}`,
    );
    acces = await dbSite().accesLogiciel.update({ where: { id: acces.id }, data: { pcaRef: ref } });
    return await appliquerOuverture(acces, etat, auteur, echeanceOuverture(d.livraison, maintenant));
  } catch (e) {
    if (!estErreurConnecteur(e)) throw e;
    await alerterUneFois(
      acces,
      "Accès Cloud non ouvert",
      `L'ouverture de l'accès de ${compte.utilisateur.email} au logiciel ${acces.libelle} a échoué (${e.message}). Le site réessaie automatiquement ; vous pouvez aussi l'ouvrir depuis Back-office → Logiciels Cloud.`,
      maintenant,
    );
    return acces;
  }
}

/** Reprise des ouvertures en échec (tâche horaire) : sans compte en double (FR-005). */
export async function reprendreOuvertures(maintenant = new Date()) {
  const enAttente = await dbSite().accesLogiciel.findMany({ where: { etat: "en_ouverture", pcaRef: null } });
  for (const a of enAttente) {
    await ouvrirAcces({ compteId: a.compteId, logiciel: a.logiciel, origine: a.origine, sourceRef: a.sourceRef, debut: a.debut, finPrevue: a.finPrevue }, AUTOMATIQUE, maintenant);
  }
  return enAttente.length;
}

/**
 * Prolonge un accès : nouvelle origine (abonnement souscrit après une période incluse, autre
 * location) et nouvelle fin, sans interruption ni délai de grâce (FR-030, SC-011).
 */
export async function prolongerAcces(
  acces: AccesLogiciel,
  p: { origine?: OrigineAcces; sourceRef?: string | null; finPrevue: Date | null },
  auteur: Auteur = AUTOMATIQUE,
): Promise<AccesLogiciel> {
  const fin = p.finPrevue;
  if (acces.pcaRef && (acces.etat === "grace" || acces.etat === "actif")) {
    await registre.pca().prolonger(acces.pcaRef, fin);
  }
  const maj = await dbSite().accesLogiciel.update({
    where: { id: acces.id },
    data: {
      origine: p.origine ?? acces.origine,
      sourceRef: p.sourceRef === undefined ? acces.sourceRef : p.sourceRef,
      finPrevue: fin,
      finGrace: null,
      sansGrace: false,
      graceNotifiee: false,
      ...(acces.etat === "grace" ? { etat: "actif" as const } : {}),
    },
  });
  await journal("prolongation", maj, auteur, { origine: maj.origine, source: maj.sourceRef, fin });
  return maj;
}

/** Fin programmée à la résiliation d'une location ou d'un abonnement (FR-007). */
export async function programmerFin(sourceRef: string, fin: Date, auteur: Auteur = AUTOMATIQUE) {
  const liste = await dbSite().accesLogiciel.findMany({ where: { sourceRef, etat: { in: ["actif", "en_ouverture", "suspendu"] } } });
  for (const a of liste) {
    const maj = await dbSite().accesLogiciel.update({ where: { id: a.id }, data: { finPrevue: fin } });
    await journal("fin_programmee", maj, auteur, { fin });
  }
  return liste.length;
}

/** Résiliation annulée (« Prolonger », F05) : la fermeture programmée est annulée (FR-010). */
export async function annulerFin(sourceRef: string, auteur: Auteur = AUTOMATIQUE) {
  const liste = await dbSite().accesLogiciel.findMany({ where: { sourceRef, etat: { in: ["actif", "grace", "en_ouverture", "suspendu"] } } });
  for (const a of liste) await prolongerAcces(a, { finPrevue: null }, auteur);
  return liste.length;
}

export async function suspendreAcces(acces: AccesLogiciel, motif: string, auteur: Auteur = AUTOMATIQUE): Promise<AccesLogiciel> {
  if (acces.etat === "suspendu" || acces.etat === "ferme") return acces;
  if (acces.pcaRef) await registre.pca().suspendre(acces.pcaRef, motif);
  const maj = await dbSite().accesLogiciel.update({ where: { id: acces.id }, data: { etat: "suspendu" } });
  await journal("suspension", maj, auteur, { motif });
  await prevenir(maj, `suspension:${Date.now()}`, emailsCloud.suspension({ logiciel: maj.libelle, motif }));
  return maj;
}

export async function retablirAcces(acces: AccesLogiciel, motif: string, auteur: Auteur = AUTOMATIQUE): Promise<AccesLogiciel> {
  if (acces.etat !== "suspendu") return acces;
  if (acces.pcaRef) await registre.pca().retablir(acces.pcaRef);
  const maj = await dbSite().accesLogiciel.update({ where: { id: acces.id }, data: { etat: acces.pcaRef ? "actif" : "en_ouverture" } });
  await journal("retablissement", maj, auteur, { motif });
  await prevenir(maj, `retablissement:${Date.now()}`, emailsCloud.retablissement({ logiciel: maj.libelle }));
  return maj;
}

/** Suspend ou rétablit tous les accès liés à une source (location ou abonnement impayé, FR-016). */
export async function suspendreSource(sourceRef: string, motif: string, auteur: Auteur = AUTOMATIQUE) {
  for (const a of await dbSite().accesLogiciel.findMany({ where: { sourceRef } })) await suspendreAcces(a, motif, auteur);
}
export async function retablirSource(sourceRef: string, motif: string, auteur: Auteur = AUTOMATIQUE) {
  for (const a of await dbSite().accesLogiciel.findMany({ where: { sourceRef } })) await retablirAcces(a, motif, auteur);
}

/** Délai de grâce : consultation et récupération des données seulement (FR-007). */
export async function passerEnGrace(acces: AccesLogiciel, maintenant = new Date(), auteur: Auteur = AUTOMATIQUE): Promise<AccesLogiciel> {
  const delai = acces.sansGrace ? 0 : await lireParametreEntier("cloud.delai_grace_jours", 30);
  if (delai === 0) return fermerAcces(acces, "fin des droits", auteur, maintenant);
  if (acces.pcaRef) await registre.pca().passerEnGrace(acces.pcaRef, maintenant);
  const finGrace = new Date((acces.finPrevue ?? maintenant).getTime() + delai * JOUR);
  const maj = await dbSite().accesLogiciel.update({ where: { id: acces.id }, data: { etat: "grace", finGrace } });
  await journal("grace", maj, auteur, { finGrace });
  if (!maj.graceNotifiee) {
    await prevenir(maj, `grace:${finGrace.toISOString()}`, emailsCloud.grace({ logiciel: maj.libelle, finGrace }));
    return dbSite().accesLogiciel.update({ where: { id: maj.id }, data: { graceNotifiee: true } });
  }
  return maj;
}

async function appliquerFermeture(acces: AccesLogiciel, auteur: Auteur, motif: string) {
  const ferme = await dbSite().accesLogiciel.update({ where: { id: acces.id }, data: { etat: "ferme", alerteLe: null } });
  await journal("fermeture", ferme, auteur, { motif });
  if (!ferme.fermetureNotifiee) {
    await prevenir(ferme, "fermeture", emailsCloud.fermeture({ logiciel: ferme.libelle }));
    return dbSite().accesLogiciel.update({ where: { id: ferme.id }, data: { fermetureNotifiee: true } });
  }
  return ferme;
}

/** Ferme un accès sur la plateforme ; les autres logiciels du médecin restent ouverts (FR-009). */
export async function fermerAcces(acces: AccesLogiciel, motif: string, auteur: Auteur = AUTOMATIQUE, maintenant = new Date()): Promise<AccesLogiciel> {
  if (acces.etat === "ferme") return acces;
  if (!acces.pcaRef) return appliquerFermeture(acces, auteur, motif); // jamais ouvert sur la plateforme
  if (await dbSite().tacheAcces.findFirst({ where: { accesId: acces.id, action: "fermer", etat: "a_faire" } })) return acces;
  const { etat } = await registre.pca().fermer(acces.pcaRef, maintenant);
  if (etat === "a_fermer") {
    await creerTache(acces, "fermer", maintenant);
    await journal("fermeture_demandee", acces, auteur, { motif });
    return acces;
  }
  return appliquerFermeture(acces, auteur, motif);
}

/** Sous-mode manuel : l'équipe confirme avoir réalisé la tâche sur la plateforme (FR-020). */
export async function confirmerTache(tacheId: string, auteur: Auteur): Promise<AccesLogiciel> {
  const tache = await dbSite().tacheAcces.findUniqueOrThrow({ where: { id: tacheId }, include: { acces: true } });
  if (tache.etat === "realisee") return tache.acces;
  if (tache.acces.pcaRef) await registre.pca().confirmerTache(tache.acces.pcaRef);
  await dbSite().tacheAcces.update({ where: { id: tache.id }, data: { etat: "realisee", confirmeeLe: new Date(), confirmeePar: auteur.libelle } });
  await journal("tache_confirmee", tache.acces, auteur, { action: tache.action });
  return tache.action === "ouvrir"
    ? appliquerOuverture(tache.acces, "actif", auteur, new Date())
    : tache.action === "fermer"
      ? appliquerFermeture(tache.acces, auteur, "tâche confirmée")
      : tache.acces;
}

export type AccesAffiche = AccesLogiciel;

/** Accès du client pour « Mes logiciels Cloud » : actifs d'abord, puis les plus récents. */
export async function accesDuCompte(compteId: string): Promise<AccesLogiciel[]> {
  const ordre = { actif: 0, en_ouverture: 1, grace: 2, suspendu: 3, ferme: 4 } as const;
  const liste = await dbSite().accesLogiciel.findMany({ where: { compteId }, orderBy: { creeLe: "desc" } });
  return liste.sort((a, b) => ordre[a.etat] - ordre[b.etat]);
}

/**
 * Reprise dans le registre des droits déjà ouverts sur la plateforme (jeu de départ de la
 * démonstration, accès ouverts avant F12, ou ajoutés à la main sur la plateforme). Idempotent.
 */
export async function reprendreAccesExistants(): Promise<number> {
  let repris = 0;
  const comptes = await dbSite().compteClient.findMany({ where: { odooPartnerRef: { not: null }, statut: { not: "supprime" } } });
  const etats = { a_ouvrir: "en_ouverture", a_fermer: "grace", actif: "actif", grace: "grace", suspendu: "suspendu", ferme: "ferme" } as const;
  for (const c of comptes) {
    let droits;
    try {
      droits = await registre.pca().lireDroits(c.odooPartnerRef!);
    } catch (e) {
      if (estErreurConnecteur(e)) continue;
      throw e;
    }
    const connus = new Set((await dbSite().accesLogiciel.findMany({ where: { partenaireRef: c.odooPartnerRef! }, select: { pcaRef: true } })).map((a) => a.pcaRef));
    let abonnements: { ref: string; defaultCode: string }[] = [];
    if (droits.some((d) => !connus.has(d.ref))) {
      try {
        abonnements = (await registre.odoo().location.listerLocations(c.odooPartnerRef!)).filter((l) => l.objet === "logiciel").map((l) => ({ ref: l.ref, defaultCode: l.defaultCode }));
      } catch (e) {
        if (!estErreurConnecteur(e)) throw e;
      }
    }
    for (const d of droits.filter((x) => !connus.has(x.ref))) {
      const abonnement = abonnements.find((a) => a.defaultCode === d.logiciel);
      await dbSite().accesLogiciel.create({
        data: {
          compteId: c.id,
          partenaireRef: c.odooPartnerRef!,
          logiciel: d.logiciel,
          libelle: await libelleDe(d.logiciel),
          origine: abonnement ? "abonnement" : "manuel",
          sourceRef: abonnement?.ref ?? `reprise:${d.ref}`,
          pcaRef: d.ref,
          etat: etats[d.etat],
          debut: d.debut,
          finPrevue: d.finPrevue,
          finGrace: d.etat === "grace" && d.finPrevue ? new Date(d.finPrevue.getTime() + 30 * JOUR) : null,
          ouvertureNotifiee: true,
          graceNotifiee: d.etat === "grace",
          fermetureNotifiee: d.etat === "ferme",
        },
      });
      repris++;
    }
  }
  return repris;
}
