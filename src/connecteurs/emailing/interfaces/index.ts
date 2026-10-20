import type { Cle } from "../../types";

// Contrat du connecteur emailing (F11 ; F10 : specs/010-emailing-automatise/contracts/emailing.md).
// Les modèles sont rendus par le site (à la charte) ; le connecteur transmet le rendu final.
// Seul `src/domaine/emailing/` l'appelle.

export type FamilleEmail = "transactionnel" | "service" | "commercial";

export type EmailClient = {
  modele: string;
  famille: FamilleEmail;
  destinataire: string;
  objet: string;
  /** Rendu HTML final. */
  rendu: string;
  /** Version texte (lecteurs d'écran, clients sans HTML). */
  texte: string;
  /** Événement du site qui a déclenché l'envoi (ex. « inscription », « commande payée »). */
  declencheur: string;
  /** Service et commercial : adresse de désinscription en un clic (List-Unsubscribe, RFC 8058). */
  desinscription?: string;
};

export type NotificationEquipe = {
  canal: "email" | "sms";
  destinataires: string[];
  objet?: string;
  texte: string;
  declencheur: string;
};

export type EtatRemise = "envoye" | "remis" | "rejete";

export type SuiviEnvoi = {
  etat: EtatRemise;
  ouvertLe: Date | null;
  motifRejet: string | null;
  /** Rejet définitif (adresse inexistante) plutôt que temporaire (boîte pleine). */
  rejetDefinitif: boolean;
};

export interface ConnecteurEmailing {
  envoyerEmail(email: EmailClient, cle: Cle): Promise<{ envoiId: string }>;
  envoyerNotificationEquipe(notification: NotificationEquipe, cle: Cle): Promise<{ envoiId: string }>;
  mettreAJourContact(contact: { email: string; consentements: Record<string, boolean> }): Promise<void>;
  lireSuivi(envoiId: string): Promise<SuiviEnvoi>;
}
