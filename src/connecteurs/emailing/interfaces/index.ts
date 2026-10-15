import type { Cle } from "../../types";

// Contrat du connecteur emailing (contracts/emailing.md).
// Les modèles sont rendus par le site (à la charte) ; le connecteur transmet le rendu final.

export type EmailTransactionnel = {
  modele: string;
  destinataire: string;
  objet: string;
  /** Rendu HTML final. */
  rendu: string;
  /** Événement du site qui a déclenché l'envoi (ex. « inscription », « commande payée »). */
  declencheur: string;
};

export type NotificationEquipe = {
  canal: "email" | "sms";
  destinataires: string[];
  objet?: string;
  texte: string;
  declencheur: string;
};

export type EtatRemise = "envoye" | "remis" | "rejete";

export interface ConnecteurEmailing {
  envoyerTransactionnel(email: EmailTransactionnel, cle: Cle): Promise<{ envoiId: string }>;
  envoyerNotificationEquipe(notification: NotificationEquipe, cle: Cle): Promise<{ envoiId: string }>;
  mettreAJourContact(contact: { email: string; consentements: Record<string, boolean> }): Promise<void>;
  lireEtatRemise(envoiId: string): Promise<EtatRemise>;
}
