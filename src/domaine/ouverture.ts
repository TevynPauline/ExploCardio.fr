import { dbSite } from "@/lib/db/site";
import { journaliser } from "./admin-contenus";

// Page d'attente (F17) : les cardiologues demandent à être prévenus de l'ouverture du site et,
// s'ils le souhaitent, laissent un téléphone et un commentaire pour être recontactés.
// Aucun email n'est envoyé tant que l'emailing est en démonstration : l'équipe suit les
// inscriptions dans le back-office. Le texte du consentement est conservé avec l'inscription et
// dans le registre des consentements.

export const TEXTE_CONSENTEMENT_OUVERTURE =
  "J’accepte qu’ExploCardio.fr utilise mon nom et mon adresse email pour me prévenir de l’ouverture du site et/ou répondre à ma demande";
export const NOM_MAX = 120;
export const COMMENTAIRE_MAX = 2000;
const TELEPHONE = /^[+0-9 ().-]{6,20}$/;

export type SaisieOuverture = { nom: string; email: string; telephone: string; commentaire: string; consentement: boolean };
export type ErreursOuverture = Partial<Record<"nom" | "email" | "telephone" | "commentaire" | "consentement", string>>;

export function validerOuverture(s: SaisieOuverture): ErreursOuverture {
  const erreurs: ErreursOuverture = {};
  const nom = s.nom.trim();
  if (!nom) erreurs.nom = "Indiquez votre nom.";
  else if (nom.length > NOM_MAX) erreurs.nom = `Le nom ne doit pas dépasser ${NOM_MAX} caractères.`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.email.trim())) erreurs.email = "Indiquez une adresse email valide, par exemple nom@cabinet.fr.";
  if (s.telephone.trim() && !TELEPHONE.test(s.telephone.trim())) erreurs.telephone = "Ce numéro de téléphone n’est pas valide.";
  if (s.commentaire.trim().length > COMMENTAIRE_MAX) erreurs.commentaire = "Votre commentaire ne doit pas dépasser 2 000 caractères.";
  if (!s.consentement) erreurs.consentement = "Cochez la case pour envoyer votre message.";
  return erreurs;
}

/**
 * Inscrit, ou met à jour une adresse déjà inscrite : nom remplacé, téléphone remplacé s'il est
 * donné, nouveau commentaire ajouté à la suite des précédents (daté) pour n'en perdre aucun.
 * Même réponse dans tous les cas.
 */
export async function inscrireOuverture(s: SaisieOuverture, maintenant = new Date()): Promise<void> {
  const email = s.email.trim().toLowerCase();
  const nom = s.nom.trim();
  const telephone = s.telephone.trim() || null;
  const nouveau = s.commentaire.trim() || null;
  const existante = await dbSite().inscriptionOuverture.findUnique({ where: { email } });
  const date = maintenant.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" });
  const commentaire = existante?.commentaire && nouveau ? `${existante.commentaire}\n\n[${date}] ${nouveau}` : (nouveau ?? existante?.commentaire ?? null);
  await dbSite().$transaction([
    dbSite().inscriptionOuverture.upsert({
      where: { email },
      create: { email, nom, telephone, commentaire, textePresente: TEXTE_CONSENTEMENT_OUVERTURE },
      update: { nom, telephone: telephone ?? existante?.telephone ?? null, commentaire, textePresente: TEXTE_CONSENTEMENT_OUVERTURE },
    }),
    dbSite().consentement.create({
      data: { email, objet: "ouverture", etat: true, origine: "page d'attente", textePresente: TEXTE_CONSENTEMENT_OUVERTURE },
    }),
  ]);
}

/** Les plus récemment mises à jour d'abord : un nouveau commentaire remonte en tête. */
export async function listerInscriptionsOuverture() {
  return dbSite().inscriptionOuverture.findMany({ orderBy: { modifieLe: "desc" } });
}

const cellule = (v: string) => (/[";\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);

/** Export pour l'annonce d'ouverture : UTF-8 avec BOM et point-virgule, lisible par Excel. */
export function csvOuverture(lignes: { nom: string; email: string; telephone: string | null; commentaire: string | null; creeLe: Date }[]): string {
  const corps = lignes.map((l) =>
    [l.creeLe.toLocaleString("fr-FR", { timeZone: "Europe/Paris" }), l.nom, l.email, l.telephone ?? "", l.commentaire ?? ""].map(cellule).join(";"),
  );
  return `﻿${["Date d'inscription;Nom;Email;Téléphone;Commentaires", ...corps].join("\r\n")}\r\n`;
}

/** Suppression (demande RGPD) : le retrait du consentement est enregistré et l'action journalisée. */
export async function supprimerInscriptionOuverture(id: string, auteur: { id: string; libelle: string }): Promise<boolean> {
  const inscription = await dbSite().inscriptionOuverture.findUnique({ where: { id } });
  if (!inscription) return false;
  await dbSite().$transaction([
    dbSite().inscriptionOuverture.delete({ where: { id } }),
    dbSite().consentement.create({
      data: { email: inscription.email, objet: "ouverture", etat: false, origine: "back-office (suppression)", textePresente: "Suppression de l'inscription à l'ouverture" },
    }),
  ]);
  await journaliser(auteur, "demandes.ouverture.suppression", inscription.email, { nom: inscription.nom, email: inscription.email }, null);
  return true;
}
