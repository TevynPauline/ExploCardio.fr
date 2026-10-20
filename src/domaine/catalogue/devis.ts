import { randomUUID } from "node:crypto";
import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { dbSite } from "@/lib/db/site";
import { lireParametre } from "@/lib/parametres";

// Demande de devis « Vous cherchez un autre modèle ? » de l'ECG de repos (F03, US7, FR-008,
// FR-009) : enregistrée comme demande de devis, l'équipe est prévenue. Aucun champ de patient.

export const OBJET_DEVIS_ECG = "devis ECG de repos";
/** F12 (FR-024) : intérêt pour l'offre « Hébergement des données de santé » en préparation. */
export const OBJET_INTERET_HEBERGEMENT = "Hébergement des données de santé — intérêt";

export type SujetDevis = "ecg" | "hebergement";
const SUJETS: Record<SujetDevis, { objet: string; titre: string }> = {
  ecg: { objet: OBJET_DEVIS_ECG, titre: "Nouvelle demande de devis : ECG de repos" },
  hebergement: { objet: OBJET_INTERET_HEBERGEMENT, titre: "Intérêt pour l'hébergement des données de santé" },
};

export type SaisieDevis = { besoin: string; nom: string; email: string; telephone: string; cabinet: string; message: string };
export type ErreursDevis = Partial<Record<keyof SaisieDevis, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEPHONE = /^[+0-9 ().-]{6,20}$/;

export function validerDevis(s: SaisieDevis): ErreursDevis {
  const e: ErreursDevis = {};
  if (s.besoin.trim().length < 2) e.besoin = "Indiquez le modèle recherché ou votre besoin.";
  if (s.besoin.length > 300) e.besoin = "300 caractères au plus.";
  if (s.nom.trim().length < 2) e.nom = "Indiquez votre nom.";
  if (!EMAIL.test(s.email.trim())) e.email = "Indiquez une adresse email valide, par exemple nom@cabinet.fr.";
  if (s.telephone.trim() && !TELEPHONE.test(s.telephone.trim())) e.telephone = "Ce numéro de téléphone n'est pas valide.";
  if (s.message.length > 3000) e.message = "Votre message ne doit pas dépasser 3 000 caractères.";
  return e;
}

export async function envoyerDemandeDevis(s: SaisieDevis, sujet: SujetDevis = "ecg"): Promise<{ ok: true } | { ok: false; erreurs: ErreursDevis }> {
  const { objet, titre } = SUJETS[sujet];
  const erreurs = validerDevis(s);
  if (Object.keys(erreurs).length) return { ok: false, erreurs };
  const demandeur = {
    nom: s.nom.trim(),
    email: s.email.trim().toLowerCase(),
    telephone: s.telephone.trim() || null,
    cabinet: s.cabinet.trim() || null,
    besoin: s.besoin.trim(),
    message: s.message.trim() || null,
  };
  const demande = await dbSite().demandeDevis.create({ data: { objet, demandeur } });
  // Copie en opportunité commerciale dans Odoo (F11, FR-024 de F12) ; en cas d'échec, la demande
  // reste visible au back-office et la copie pourra être refaite.
  try {
    const { ref } = await registre.odoo().opportunites.copierDemande({ type: "devis", referenceDemande: demande.id, contenu: { objet, ...demandeur } }, `devis:${demande.id}`);
    await dbSite().demandeDevis.update({ where: { id: demande.id }, data: { opportuniteRef: ref } });
  } catch (e) {
    if (!estErreurConnecteur(e)) throw e;
  }
  const destinataire = (await lireParametre("contact.destinataire_messages"))?.trim() || "admin@demo.explocardio.test";
  try {
    await registre.emailing().envoyerNotificationEquipe(
      {
        canal: "email",
        destinataires: [destinataire],
        objet: titre,
        texte: `${demandeur.nom} (${demandeur.email}${demandeur.cabinet ? `, ${demandeur.cabinet}` : ""}) : ${demandeur.besoin}${demandeur.message ? `\n\n${demandeur.message}` : ""}`,
        declencheur: objet,
      },
      `devis:${demande.id}:${randomUUID()}`,
    );
  } catch (e) {
    // La demande est conservée et consultable par l'équipe même si la notification échoue.
    if (!estErreurConnecteur(e)) throw e;
  }
  return { ok: true };
}
