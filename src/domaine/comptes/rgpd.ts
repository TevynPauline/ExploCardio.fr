import { randomUUID } from "node:crypto";
import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { auth } from "@/lib/auth";
import { dbSite } from "@/lib/db/site";
import { emailsComptes } from "@/emails/modeles-comptes";
import { notifier } from "./securite";

// Droits sur les données (F02, US6, FR-039 à FR-041, R8).

export async function verifierMotDePasse(utilisateurId: string, motDePasse: string): Promise<boolean> {
  const compte = await dbSite().compteConnexion.findFirst({ where: { userId: utilisateurId, providerId: "credential" } });
  if (!compte?.password) return false;
  const ctx = await auth.$context;
  return ctx.password.verify({ hash: compte.password, password: motDePasse });
}

async function journal(utilisateurId: string | null, action: string, compteId: string, detail: object = {}) {
  await dbSite().journalAction.create({
    data: { auteurId: utilisateurId, auteur: "titulaire du compte", action, objet: compteId, detail: JSON.parse(JSON.stringify(detail)) },
  });
}

/** Export complet des données personnelles du compte, en JSON lisible (FR-039). */
export async function exporter(compteId: string, origine = "mon_compte"): Promise<object> {
  const c = await dbSite().compteClient.findUniqueOrThrow({
    where: { id: compteId },
    include: { utilisateur: true, adresses: true, decisions: true, demandesNumero: true },
  });
  const u = c.utilisateur;
  const [consentements, securite, newsletter, cadeau] = await Promise.all([
    dbSite().consentement.findMany({ where: { compteId }, orderBy: { date: "asc" } }),
    dbSite().journalAction.findMany({ where: { objet: u.id, action: { startsWith: "securite." } }, orderBy: { date: "asc" } }),
    dbSite().inscriptionNewsletter.findUnique({ where: { email: u.email } }),
    dbSite().attributionCadeau.findFirst({ where: { compteId } }),
  ]);
  let situation: object | null = null;
  if (c.odooPartnerRef) {
    try {
      const s = await registre.odoo().clients.lireSituation(c.odooPartnerRef);
      situation = { commandes: s.commandesRecentes, factures: s.factures, locations: s.locations, droitsAssistance: s.droitsAssistance };
    } catch (e) {
      if (!estErreurConnecteur(e)) throw e;
      situation = { indisponible: "Les données de commandes et de factures n'ont pas pu être lues ; elles vous seront envoyées sur demande." };
    }
  }
  await dbSite().demandeRgpd.create({ data: { compteId, type: "export", etat: "traitee", origine, traiteeLe: new Date() } });
  await journal(u.id, "rgpd.export", compteId);
  return {
    exportéLe: new Date().toISOString(),
    identité: { civilité: u.civilite, prénom: u.prenom, nom: u.nom, email: u.email, téléphone: u.telephone, spécialité: u.specialite },
    compte: {
      type: c.type === "medecin" ? "médecin" : "structure",
      rpps: c.rpps,
      siret: c.siret,
      cabinet: c.nomCabinet,
      statut: c.statut,
      inscritLe: c.creeLe,
      validéLe: c.valideLe,
      doubleAuthentification: Boolean(u.twoFactorEnabled),
    },
    adresses: c.adresses.map((a) => ({ type: a.type, adresse: a.ligne1, complément: a.ligne2, codePostal: a.codePostal, ville: a.ville })),
    consentements: consentements.map((x) => ({ objet: x.objet, accepté: x.etat, date: x.date, origine: x.origine, textePrésenté: x.textePresente })),
    décisionsSurLeCompte: c.decisions.map((d) => ({ décision: d.decision, motif: d.motif, date: d.date })),
    demandesDeChangementDeNuméro: c.demandesNumero.map((d) => ({ ancien: d.ancienNumero, nouveau: d.nouveauNumero, état: d.etat, date: d.demandeeLe })),
    historiqueDeSécurité: securite.map((j) => ({ événement: j.action.replace("securite.", ""), date: j.date })),
    newsletterPiedDePage: newsletter ? { état: newsletter.etat, demandéeLe: newsletter.demandeeLe, confirméeLe: newsletter.confirmeeLe } : null,
    cadeauDeBienvenue: cadeau ? { état: cadeau.etat, ouvertLe: cadeau.ouvertLe, remisLe: cadeau.remisLe } : null,
    commandesFacturesLocations: situation,
  };
}

export type ResultatSuppression = { supprime: true } | { supprime: false; raisons: string[] };

/** Ce qui doit être soldé avant la suppression (US6-4). */
async function obstacles(odooPartnerRef: string | null): Promise<string[]> {
  if (!odooPartnerRef) return [];
  const s = await registre.odoo().clients.lireSituation(odooPartnerRef);
  const raisons: string[] = [];
  if (s.locations.some((l) => l.etat !== "termine")) raisons.push("Une location est en cours : elle doit être terminée et le matériel restitué.");
  if (s.factures.some((f) => f.etatPaiement === "en_attente")) raisons.push("Une facture reste à régler.");
  return raisons;
}

/**
 * Suppression du compte (FR-040) : données personnelles anonymisées, factures conservées dans
 * Odoo (partenaire archivé), newsletter retirée, sessions fermées, demande journalisée.
 */
export async function supprimer(compteId: string, origine = "mon_compte"): Promise<ResultatSuppression> {
  const c = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compteId }, include: { utilisateur: true } });
  const raisons = await obstacles(c.odooPartnerRef);
  if (raisons.length) {
    await dbSite().demandeRgpd.create({ data: { compteId, type: "suppression", etat: "refusee", motif: raisons.join(" "), origine } });
    await journal(c.utilisateurId, "rgpd.suppression_refusee", compteId, { raisons });
    return { supprime: false, raisons };
  }
  const email = c.utilisateur.email;
  await notifier(email, await emailsComptes.compteSupprime(), "compte supprimé");
  await registre.emailing().mettreAJourContact({ email, consentements: { newsletter: false } });
  if (c.odooPartnerRef) await registre.odoo().clients.archiverPartenaire(c.odooPartnerRef, `archivage:${compteId}`);

  const anonyme = `supprime-${randomUUID()}@supprime.invalid`;
  await dbSite().$transaction([
    dbSite().session.deleteMany({ where: { userId: c.utilisateurId } }),
    dbSite().compteConnexion.deleteMany({ where: { userId: c.utilisateurId } }),
    dbSite().doubleAuthentification.deleteMany({ where: { userId: c.utilisateurId } }),
    dbSite().utilisateur.update({
      where: { id: c.utilisateurId },
      data: { email: anonyme, name: "Compte supprimé", prenom: null, nom: null, civilite: null, telephone: null, specialite: null, image: null, emailVerified: false, twoFactorEnabled: false },
    }),
    dbSite().adresse.deleteMany({ where: { compteId } }),
    dbSite().compteClient.update({ where: { id: compteId }, data: { statut: "supprime", nomCabinet: null, rpps: null, siret: null, motifRefus: null } }),
    dbSite().consentement.updateMany({ where: { compteId }, data: { email: null } }),
    dbSite().inscriptionNewsletter.deleteMany({ where: { email } }),
    dbSite().demandeRgpd.create({ data: { compteId, type: "suppression", etat: "traitee", origine, traiteeLe: new Date() } }),
  ]);
  await journal(null, "rgpd.suppression", compteId);
  return { supprime: true };
}
