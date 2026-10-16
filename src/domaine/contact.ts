import { randomUUID } from "node:crypto";
import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { dbSite } from "@/lib/db/site";
import { lireParametre } from "@/lib/parametres";

// Formulaire de contact (F01, US5, FR-030 à FR-032, R6). Le message est enregistré dans la
// base du site, puis l'équipe est prévenue par le connecteur emailing (boîte de démonstration
// en phase 1, FR-050).

export const DELAI_MINIMAL_MS = 3000;

export type SaisieContact = {
  motif: string;
  nom: string;
  email: string;
  telephone: string;
  cabinet: string;
  message: string;
};

export type ErreursContact = Partial<Record<keyof SaisieContact, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEPHONE = /^[+0-9 ().-]{6,20}$/;

export function validerContact(s: SaisieContact, motifs: string[]): ErreursContact {
  const e: ErreursContact = {};
  if (!motifs.includes(s.motif)) e.motif = "Choisissez le motif de votre message.";
  if (s.nom.trim().length < 2) e.nom = "Indiquez votre nom.";
  if (!EMAIL.test(s.email.trim())) e.email = "Indiquez une adresse email valide, par exemple nom@cabinet.fr.";
  if (s.telephone.trim() && !TELEPHONE.test(s.telephone.trim())) e.telephone = "Ce numéro de téléphone n'est pas valide.";
  if (s.message.trim().length < 10) e.message = "Votre message doit contenir au moins 10 caractères.";
  if (s.message.length > 5000) e.message = "Votre message ne doit pas dépasser 5 000 caractères.";
  return e;
}

/** Destinataire des messages : paramètre du back-office, sinon l'administrateur de démonstration. */
async function destinataires(): Promise<string[]> {
  const parametre = (await lireParametre("contact.destinataire_messages"))?.trim();
  if (parametre) return [parametre];
  return ["admin@demo.explocardio.test"];
}

export async function enregistrerMessage(s: SaisieContact): Promise<void> {
  const message = await dbSite().messageContact.create({
    data: {
      motif: s.motif,
      coordonnees: {
        nom: s.nom.trim(),
        email: s.email.trim().toLowerCase(),
        telephone: s.telephone.trim() || null,
        cabinet: s.cabinet.trim() || null,
      },
      texte: s.message.trim(),
    },
  });
  try {
    await registre.emailing().envoyerNotificationEquipe(
      {
        canal: "email",
        destinataires: await destinataires(),
        objet: `Nouveau message : ${s.motif}`,
        texte: `${s.nom.trim()} (${s.email.trim()}${s.cabinet.trim() ? `, ${s.cabinet.trim()}` : ""}) a écrit depuis le site :\n\n${s.message.trim()}`,
        declencheur: "formulaire de contact",
      },
      `contact:${message.id}:${randomUUID()}`,
    );
  } catch (e) {
    // Le message est conservé et consultable par l'équipe même si l'envoi échoue.
    if (!estErreurConnecteur(e)) throw e;
    console.error("[contact] notification d'équipe impossible", e.code);
  }
}
