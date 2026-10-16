import { createHash, randomBytes, randomUUID } from "node:crypto";
import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { envoyerTache } from "@/file-attente";
import { dbSite } from "@/lib/db/site";
import { urlDuSite } from "@/emails/charte";
import { emailsComptes } from "@/emails/modeles-comptes";
import { lireParametre } from "@/lib/parametres";
import { MESSAGE_HORS_METROPOLE, codePostalMetropole } from "./adresses";
import { specialites } from "./inscription";
import { normaliserNumero, rppsValide, siretValide } from "./numeros";
import { journaliserSecurite, notifier } from "./securite";

// « Mon compte » : informations, adresses, email, numéro (F02, US5, FR-037).

export class SaisieInvalide extends Error {
  constructor(readonly erreurs: Record<string, string>) {
    super("Saisie invalide");
  }
}

export const FILE_COORDONNEES = "coordonnees-client";

type Coordonnees = Parameters<ReturnType<typeof registre.odoo>["clients"]["mettreAJourCoordonnees"]>[1];

/** Reporte un changement sur la fiche client d'Odoo, ou le confie à la file d'attente (R7). */
export async function reporterSurFicheClient(compteId: string, coordonnees: Coordonnees) {
  const c = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compteId } });
  if (!c.odooPartnerRef) return; // fiche créée à la validation, avec les données à jour
  try {
    await registre.odoo().clients.mettreAJourCoordonnees(c.odooPartnerRef, coordonnees);
  } catch (e) {
    if (!estErreurConnecteur(e)) throw e;
    await envoyerTache(FILE_COORDONNEES, { ref: c.odooPartnerRef, coordonnees }, `coordonnees:${compteId}:${randomUUID()}`);
  }
}

export type Informations = { civilite: string; prenom: string; nom: string; telephone: string; specialite: string };

export async function mettreAJourInformations(compteId: string, i: Informations): Promise<void> {
  const e: Record<string, string> = {};
  if (!["M.", "Mme", "Dr", "Pr"].includes(i.civilite)) e.civilite = "Choisissez une civilité.";
  if (!i.prenom.trim()) e.prenom = "Indiquez votre prénom.";
  if (!i.nom.trim()) e.nom = "Indiquez votre nom.";
  if (!/^[+0-9 ().-]{6,20}$/.test(i.telephone.trim())) e.telephone = "Indiquez un numéro de téléphone valide.";
  if (!(await specialites()).includes(i.specialite)) e.specialite = "Choisissez votre spécialité.";
  if (Object.keys(e).length) throw new SaisieInvalide(e);
  const c = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compteId } });
  const name = `${i.prenom.trim()} ${i.nom.trim()}`;
  await dbSite().utilisateur.update({
    where: { id: c.utilisateurId },
    data: { civilite: i.civilite, prenom: i.prenom.trim(), nom: i.nom.trim(), name, telephone: i.telephone.trim(), specialite: i.specialite },
  });
  await reporterSurFicheClient(compteId, { ...(c.type === "medecin" ? { nom: name } : {}), telephone: i.telephone.trim() });
}

export type AdresseSaisie = { ligne1: string; ligne2?: string; codePostal: string; ville: string };

export async function mettreAJourAdresses(compteId: string, adresses: Record<"cabinet" | "livraison" | "facturation", AdresseSaisie>): Promise<void> {
  const e: Record<string, string> = {};
  for (const [type, a] of Object.entries(adresses)) {
    if (a.ligne1.trim().length < 3) e[`${type}.ligne1`] = "Indiquez l'adresse.";
    if (!/^\d{5}$/.test(a.codePostal.trim())) e[`${type}.codePostal`] = "Le code postal comporte 5 chiffres.";
    else if (type === "livraison" && !codePostalMetropole(a.codePostal)) e[`${type}.codePostal`] = MESSAGE_HORS_METROPOLE;
    if (a.ville.trim().length < 2) e[`${type}.ville`] = "Indiquez la ville.";
  }
  if (Object.keys(e).length) throw new SaisieInvalide(e);
  const lignes = (Object.entries(adresses) as ["cabinet" | "livraison" | "facturation", AdresseSaisie][]).map(([type, a]) => ({
    type,
    ligne1: a.ligne1.trim(),
    ligne2: a.ligne2?.trim() || null,
    codePostal: a.codePostal.trim(),
    ville: a.ville.trim(),
  }));
  await dbSite().$transaction([
    dbSite().adresse.deleteMany({ where: { compteId } }),
    dbSite().adresse.createMany({ data: lignes.map((l) => ({ ...l, compteId })) }),
  ]);
  await reporterSurFicheClient(compteId, { adresses: lignes.map((l) => ({ ...l, ligne2: l.ligne2 ?? undefined })) });
}

// ------------------------------------------------------------------ Changement d'email

const empreinte = (jeton: string) => createHash("sha256").update(jeton).digest("hex");
const IDENTIFIANT_EMAIL = (utilisateurId: string) => `changement-email:${utilisateurId}`;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Demande de changement d'email (US5-4) : lien envoyé à la NOUVELLE adresse, ancienne prévenue.
 * Si la nouvelle adresse a déjà un compte, rien n'est envoyé mais la réponse est la même (SC-012).
 */
export async function demanderChangementEmail(utilisateurId: string, nouvelleSaisie: string): Promise<void> {
  const nouvelle = nouvelleSaisie.trim().toLowerCase();
  if (!EMAIL.test(nouvelle)) throw new SaisieInvalide({ nouvelEmail: "Indiquez une adresse email valide." });
  const u = await dbSite().utilisateur.findUniqueOrThrow({ where: { id: utilisateurId } });
  if (nouvelle === u.email) throw new SaisieInvalide({ nouvelEmail: "C'est déjà votre adresse actuelle." });
  await journaliserSecurite("email_change_demande", utilisateurId);
  await notifier(u.email, await emailsComptes.ancienEmailPrevenu(nouvelle), "changement d'email demandé");
  if (await dbSite().utilisateur.findUnique({ where: { email: nouvelle } })) return;
  const jeton = randomBytes(24).toString("base64url");
  await dbSite().verification.deleteMany({ where: { identifier: IDENTIFIANT_EMAIL(utilisateurId) } });
  await dbSite().verification.create({
    data: {
      id: randomUUID(),
      identifier: IDENTIFIANT_EMAIL(utilisateurId),
      value: JSON.stringify({ nouvelle, empreinte: empreinte(jeton) }),
      expiresAt: new Date(Date.now() + 24 * 3600_000),
    },
  });
  const lien = urlDuSite(`/mon-compte/confirmer-email?u=${encodeURIComponent(utilisateurId)}&jeton=${jeton}`);
  await notifier(nouvelle, await emailsComptes.confirmerNouvelEmail(lien), "confirmation du nouvel email");
}

export async function confirmerChangementEmail(utilisateurId: string, jeton: string): Promise<boolean> {
  const v = await dbSite().verification.findFirst({ where: { identifier: IDENTIFIANT_EMAIL(utilisateurId) } });
  if (!v || v.expiresAt < new Date()) return false;
  const { nouvelle, empreinte: attendue } = JSON.parse(v.value) as { nouvelle: string; empreinte: string };
  if (empreinte(jeton) !== attendue) return false;
  if (await dbSite().utilisateur.findUnique({ where: { email: nouvelle } })) return false;
  await dbSite().$transaction([
    dbSite().utilisateur.update({ where: { id: utilisateurId }, data: { email: nouvelle, emailVerified: true } }),
    dbSite().verification.delete({ where: { id: v.id } }),
  ]);
  await journaliserSecurite("email_modifie", utilisateurId);
  const c = await dbSite().compteClient.findUnique({ where: { utilisateurId } });
  if (c) await reporterSurFicheClient(c.id, { email: nouvelle });
  return true;
}

// ------------------------------------------------------------------ Changement de numéro

export async function demanderChangementNumero(compteId: string, saisie: string): Promise<void> {
  const c = await dbSite().compteClient.findUniqueOrThrow({ where: { id: compteId } });
  const numero = normaliserNumero(saisie);
  const valide = c.type === "medecin" ? rppsValide(numero) : siretValide(numero);
  if (!valide) throw new SaisieInvalide({ numero: c.type === "medecin" ? "Le numéro RPPS comporte 11 chiffres." : "Ce numéro SIRET n'est pas valide." });
  await dbSite().demandeChangementNumero.create({ data: { compteId, ancienNumero: c.rpps ?? c.siret, nouveauNumero: numero } });
  const destinataire = (await lireParametre("contact.destinataire_messages"))?.trim() || "admin@demo.explocardio.test";
  await registre.emailing().envoyerNotificationEquipe(
    { canal: "email", destinataires: [destinataire], objet: "Changement de numéro à vérifier", texte: `Le compte ${c.nomCabinet ?? c.id} demande à remplacer ${c.rpps ?? c.siret} par ${numero}.`, declencheur: "mon compte" },
    `numero:${compteId}:${randomUUID()}`,
  );
}

export async function traiterDemandeNumero(id: string, accepter: boolean, auteur: { id: string; libelle: string }, motif = ""): Promise<void> {
  const d = await dbSite().demandeChangementNumero.findUniqueOrThrow({ where: { id }, include: { compte: true } });
  if (d.etat !== "en_attente") throw new Error("Cette demande a déjà été traitée.");
  if (accepter) {
    const champ = d.compte.type === "medecin" ? { rpps: d.nouveauNumero } : { siret: d.nouveauNumero };
    if (d.compte.type === "medecin" && (await dbSite().compteClient.findUnique({ where: { rpps: d.nouveauNumero } }))) {
      throw new Error("Ce RPPS est déjà utilisé par un autre compte.");
    }
    await dbSite().compteClient.update({ where: { id: d.compteId }, data: champ });
  }
  await dbSite().demandeChangementNumero.update({
    where: { id },
    data: { etat: accepter ? "acceptee" : "refusee", motif: motif || null, traiteePar: auteur.libelle, traiteeLe: new Date() },
  });
  await dbSite().journalAction.create({
    data: { auteurId: auteur.id, auteur: auteur.libelle, action: accepter ? "comptes.numero_accepte" : "comptes.numero_refuse", objet: d.compteId, detail: { ancien: d.ancienNumero, nouveau: d.nouveauNumero } },
  });
}
