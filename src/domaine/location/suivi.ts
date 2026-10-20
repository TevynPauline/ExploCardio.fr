import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import type { ChangementLocation } from "@/connecteurs/odoo/interfaces";
import { dbSite } from "@/lib/db/site";
import { liensContact, messagePrerempli } from "@/lib/contact-whatsapp";
import { emailsLocations } from "@/emails/modeles-locations";
import type { SuiviLocation } from "@generated/site/client";
import { alerterEquipe, envoyer } from "../commande/notifications";
import * as cloud from "../cloud/acces";

// Suivi des locations (F05, R5), toutes les 5 minutes : les changements faits dans Odoo
// (expédition, livraison, appareil défectueux, colis non livré, impayé, suspension, retour)
// sont relevés et chacun déclenche une seule fois ses effets : email au client, accès au
// logiciel Cloud par le connecteur PCA, alerte à l'équipe, journal (FR-041). Les montants
// facturés par Odoo après la fin d'une location sont prélevés sur l'autorisation conservée
// (FR-030).

/** Fenêtre de relève : les changements sont comparés au dernier état connu, donc rejouables. */
const FENETRE_JOURS = 7;

async function journal(action: string, objet: string, detail: object) {
  await dbSite().journalAction.create({ data: { auteur: "suivi des locations", action, objet, detail: JSON.parse(JSON.stringify(detail)) } });
}

async function compteDu(partenaireRef: string) {
  return dbSite().compteClient.findFirst({ where: { odooPartnerRef: partenaireRef }, include: { utilisateur: true } });
}

/** Ouvre l'accès au logiciel du pack (FR-012), par le module des accès Cloud (F12). */
async function ouvrirAccesLocation(l: ChangementLocation): Promise<void> {
  if (!l.logiciel) return;
  const compte = await compteDu(l.partenaireRef);
  if (!compte) return;
  await cloud.ouvrirAcces({ compteId: compte.id, logiciel: l.logiciel, origine: "location", sourceRef: l.ref, debut: l.dateLivraison ?? new Date(), finPrevue: null, livraison: l.dateLivraison });
}

/**
 * Suivi d'une location, créé au premier relevé. Un suivi d'un autre client porte une référence
 * réutilisée après une réinitialisation de la démonstration : il est périmé et recréé.
 */
export async function suiviPour(l: ChangementLocation): Promise<SuiviLocation> {
  const existant = await dbSite().suiviLocation.findUnique({ where: { abonnementRef: l.ref } });
  if (existant && existant.partenaireRef === l.partenaireRef) return existant;
  if (existant) await dbSite().suiviLocation.delete({ where: { abonnementRef: l.ref } });
  return dbSite().suiviLocation.create({
    // Locations déjà avancées au premier relevé (jeu de départ) : rien n'est renvoyé.
    data: { abonnementRef: l.ref, partenaireRef: l.partenaireRef, dernierEtat: l.etat, expedieNotifie: Boolean(l.expedieLe) && l.etat !== "commandee", retourNotifie: l.etat === "terminee" },
  });
}

/** F12 : abonnement logiciel : impayé → accès suspendu, régularisation → rétabli (FR-016). */
async function traiterAbonnementLogiciel(l: ChangementLocation, maintenant: Date): Promise<boolean> {
  const suivi = await suiviPour(l);
  if (l.etat === suivi.dernierEtat) return false;
  if (l.etat === "suspendue_impaye") await cloud.suspendreSource(l.ref, "abonnement impayé");
  if (suivi.dernierEtat === "suspendue_impaye" && l.etat === "en_cours") await cloud.retablirSource(l.ref, "abonnement régularisé");
  await dbSite().suiviLocation.update({ where: { abonnementRef: l.ref }, data: { dernierEtat: l.etat, notifieLe: maintenant } });
  return true;
}

async function traiter(l: ChangementLocation, maintenant: Date): Promise<boolean> {
  if (l.objet === "logiciel") return traiterAbonnementLogiciel(l, maintenant);
  if (l.objet !== "mise_a_disposition") return false;
  const suivi = await suiviPour(l);
  const compte = await compteDu(l.partenaireRef);
  const email = compte?.utilisateur.email ?? null;
  const maj: Partial<SuiviLocation> = {};

  // Expédition : email avec le suivi, accès Cloud, alerte « formation à organiser » (FR-012).
  if (l.expedieLe && !suivi.expedieNotifie) {
    // F09 : message pré-rempli limité au nom et au cabinet (FR-005).
    const contact = await liensContact(compte ? messagePrerempli({ nom: compte.utilisateur.name, cabinet: compte.nomCabinet, civilite: compte.utilisateur.civilite }) : messagePrerempli(null));
    await ouvrirAccesLocation(l);
    maj.expedieNotifie = true;
    if (email) {
      await envoyer(
        email,
        await emailsLocations.expediee({ appareil: l.libelle, numeroSerie: l.numeroSerie, transporteur: l.transporteur, suivi: l.suivi, dateLivraison: l.dateLivraison, whatsapp: contact?.ecrire ?? "/qui-sommes-nous#contact", logiciel: Boolean(l.logiciel) }),
        "location expédiée",
        `location-expediee:${l.partenaireRef}:${l.ref}`,
      );
    }
    await alerterEquipe("Formation à organiser", `La location ${l.ref} (${l.libelle}) est expédiée à ${email ?? l.partenaireRef} : contacter le médecin pour organiser sa formation.`, `formation:${l.partenaireRef}:${l.ref}`);
    await journal("location.expediee", l.ref, { suivi: l.suivi, numeroSerie: l.numeroSerie });
  } else if (l.expedieLe && l.logiciel && !["terminee", "annulee"].includes(l.etat)) {
    await ouvrirAccesLocation(l); // rattrapage (location déjà expédiée au premier relevé) ; idempotent
  }

  if (l.colisNonLivre && !suivi.colisNonLivreNotifie) {
    await alerterEquipe("Colis non livré", `Le colis de la location ${l.ref} (${l.libelle}) n'a pas été livré : la location ne commence pas. Contacter le médecin et le transporteur.`, `colis:${l.partenaireRef}:${l.ref}`);
    await journal("location.colis_non_livre", l.ref, {});
    maj.colisNonLivreNotifie = true;
  } else if (!l.colisNonLivre && suivi.colisNonLivreNotifie) maj.colisNonLivreNotifie = false;

  if (l.attenteChoixClient && !suivi.attenteChoixNotifie) {
    if (email) await envoyer(email, await emailsLocations.appareilDefectueux({ appareil: l.libelle }), "appareil défectueux", `location-defectueux:${l.partenaireRef}:${l.ref}`);
    await journal("location.attente_choix_client", l.ref, {});
    maj.attenteChoixNotifie = true;
  } else if (!l.attenteChoixClient && suivi.attenteChoixNotifie) maj.attenteChoixNotifie = false;

  // Impayé : client prévenu une fois, invité à régulariser (FR-026).
  if (l.impaye && !suivi.impayeNotifie) {
    const regles = await registre.odoo().location.lireRegles();
    if (email) await envoyer(email, await emailsLocations.prelevementEchoue({ appareil: l.libelle, delaiJours: regles.delaiRegularisationJours }), "prélèvement échoué", `location-impaye:${l.partenaireRef}:${l.ref}:${maintenant.toISOString().slice(0, 10)}`);
    await journal("location.prelevement_echoue", l.ref, {});
    maj.impayeNotifie = true;
    maj.impayeDepuis = maintenant;
  } else if (!l.impaye && suivi.impayeNotifie) {
    maj.impayeNotifie = false;
    maj.impayeDepuis = null;
  }

  if (l.etat !== suivi.dernierEtat) {
    if (l.etat === "suspendue_impaye") {
      await cloud.suspendreSource(l.ref, "location suspendue pour impayé");
      if (email) await envoyer(email, await emailsLocations.suspendue({ appareil: l.libelle }), "location suspendue", `location-suspendue:${l.partenaireRef}:${l.ref}:${maintenant.toISOString().slice(0, 10)}`);
      await alerterEquipe("Location suspendue pour impayé", `La location ${l.ref} (${email ?? l.partenaireRef}) est suspendue : accès Cloud suspendu, retour de l'appareil à demander.`, `suspendue:${l.partenaireRef}:${l.ref}`);
      await journal("location.suspendue", l.ref, {});
    }
    if (suivi.dernierEtat === "suspendue_impaye" && l.etat === "en_cours") {
      await cloud.retablirSource(l.ref, "location régularisée");
      await journal("location.regularisee", l.ref, {});
    }
    if (l.etat === "terminee" && !suivi.retourNotifie) {
      if (email) await envoyer(email, await emailsLocations.retourRecu({ appareil: l.libelle, degradationHt: l.montantDegradationHt }), "retour reçu", `location-retour:${l.partenaireRef}:${l.ref}`);
      // Accès Cloud : délai de grâce à la date de fin, puis fermeture (F12, tâche horaire).
      await cloud.programmerFin(l.ref, l.fin ?? maintenant);
      maj.retourNotifie = true;
      await journal("location.terminee", l.ref, { etatRetour: l.etatRetour, degradationHt: l.montantDegradationHt });
    }
    maj.dernierEtat = l.etat;
  }

  if (!Object.keys(maj).length) return false;
  await dbSite().suiviLocation.update({ where: { abonnementRef: l.ref }, data: { ...maj, notifieLe: maintenant } });
  return true;
}

/** Commande du site dont l'abonnement de paiement porte cette location (élément de F05). */
export async function commandeDeLocation(abonnementRef: string) {
  const commandes = await dbSite().commandeSite.findMany({ where: { odooAbonnementRefs: { has: abonnementRef } } });
  const c = commandes[0];
  if (!c) return null;
  const element = Object.entries((c.elementsAbonnement ?? {}) as Record<string, string>).find(([, ref]) => ref === abonnementRef)?.[0] ?? null;
  return { commande: c, element };
}

/** Factures d'Odoo émises après la fin (retard, dégradation, remplacement) : prélevées une fois chacune. */
async function preleverFactures(): Promise<number> {
  let n = 0;
  for (const f of await registre.odoo().location.listerFacturesAPrelever()) {
    const lien = await commandeDeLocation(f.abonnementRef);
    if (!lien) continue;
    try {
      const r = await registre.stripe().preleverPonctuel({ abonnementRef: lien.commande.ref, montantTtc: f.montantTtc, libelle: f.libelle }, `prelevement:${f.numero}`);
      if (r.etat !== "payee") continue;
      await registre.odoo().location.enregistrerPrelevement(f.numero, r.paiementRef, `prelevement:${f.numero}`);
      const compte = await dbSite().compteClient.findUnique({ where: { id: lien.commande.compteId }, include: { utilisateur: true } });
      if (compte) await envoyer(compte.utilisateur.email, await emailsLocations.prelevementPonctuel({ libelle: f.libelle, montantTtc: f.montantTtc, facture: f.numero }), "prélèvement ponctuel", `prelevement:${f.numero}`);
      await journal("location.prelevement_ponctuel", f.abonnementRef, { facture: f.numero, montantTtc: f.montantTtc, paiement: r.paiementRef });
      n++;
    } catch (e) {
      if (!estErreurConnecteur(e)) throw e;
      await alerterEquipe("Prélèvement impossible", `La facture ${f.numero} (location ${f.abonnementRef}, ${(f.montantTtc / 100).toFixed(2)} € TTC) n'a pas pu être prélevée : ${e.message}.`, `prelevement-echec:${f.numero}`);
    }
  }
  return n;
}

export async function suivreLocations(maintenant = new Date()): Promise<{ changements: number; prelevements: number }> {
  let changements = 0;
  const depuis = new Date(maintenant.getTime() - FENETRE_JOURS * 24 * 3600_000);
  for (const l of await registre.odoo().location.listerChangements(depuis)) {
    if (await traiter(l, maintenant)) changements++;
  }
  return { changements, prelevements: await preleverFactures() };
}
