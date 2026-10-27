import { dbSite } from "@/lib/db/site";
import { journaliser } from "./admin-contenus";

// Page d'attente (F17) : les cardiologues demandent à être prévenus de l'ouverture du site.
// Inscription simple (aucun email envoyé tant que l'emailing est en démonstration) ; le texte
// du consentement est conservé avec l'inscription et dans le registre des consentements.

export const TEXTE_CONSENTEMENT_OUVERTURE =
  "J’accepte qu’ExploCardio.fr utilise mon nom et mon adresse email pour me prévenir de l’ouverture du site.";
export const NOM_MAX = 120;

export type SaisieOuverture = { nom: string; email: string; consentement: boolean };
export type ErreursOuverture = Partial<Record<"nom" | "email" | "consentement", string>>;

export function validerOuverture(s: SaisieOuverture): ErreursOuverture {
  const erreurs: ErreursOuverture = {};
  const nom = s.nom.trim();
  if (!nom) erreurs.nom = "Indiquez votre nom.";
  else if (nom.length > NOM_MAX) erreurs.nom = `Le nom ne doit pas dépasser ${NOM_MAX} caractères.`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.email.trim())) erreurs.email = "Indiquez une adresse email valide, par exemple nom@cabinet.fr.";
  if (!s.consentement) erreurs.consentement = "Cochez la case pour être prévenu de l’ouverture.";
  return erreurs;
}

/** Inscrit (ou met à jour le nom d'une adresse déjà inscrite) ; même réponse dans tous les cas. */
export async function inscrireOuverture(s: SaisieOuverture): Promise<void> {
  const email = s.email.trim().toLowerCase();
  const nom = s.nom.trim();
  await dbSite().$transaction([
    dbSite().inscriptionOuverture.upsert({
      where: { email },
      create: { email, nom, textePresente: TEXTE_CONSENTEMENT_OUVERTURE },
      update: { nom, textePresente: TEXTE_CONSENTEMENT_OUVERTURE },
    }),
    dbSite().consentement.create({
      data: { email, objet: "ouverture", etat: true, origine: "page d'attente", textePresente: TEXTE_CONSENTEMENT_OUVERTURE },
    }),
  ]);
}

export async function listerInscriptionsOuverture() {
  return dbSite().inscriptionOuverture.findMany({ orderBy: { creeLe: "desc" } });
}

const cellule = (v: string) => (/[";\n\r]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v);

/** Export pour l'annonce d'ouverture : UTF-8 avec BOM et point-virgule, lisible par Excel. */
export function csvOuverture(lignes: { nom: string; email: string; creeLe: Date }[]): string {
  const corps = lignes.map((l) =>
    [l.creeLe.toLocaleString("fr-FR", { timeZone: "Europe/Paris" }), l.nom, l.email].map(cellule).join(";"),
  );
  return `﻿${["Date d'inscription;Nom;Email", ...corps].join("\r\n")}\r\n`;
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
