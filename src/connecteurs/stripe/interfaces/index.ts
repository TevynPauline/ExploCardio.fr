import type { Centimes, Cle } from "../../types";

// Contrat du connecteur Stripe (contracts/stripe.md). Aucune donnée de carte ne touche le site.

export type MoyenPaiement = "carte" | "sepa";
export type TypeCarte = "visa" | "mastercard" | "amex";

export type ClientPaiement = { partenaireRef: string; email: string };

export type SessionPaiement = {
  commandeRef: string;
  montantTtc: Centimes;
  moyens: MoyenPaiement[];
  client: ClientPaiement;
  urlRetour: string;
  urlAnnulation: string;
};

export type SessionAbonnement = {
  client: ClientPaiement;
  objet: "mise_a_disposition" | "logiciel";
  abonnementRef: string;
  premierMontantTtc: Centimes;
  montantMensuelTtc: Centimes;
  moyens: MoyenPaiement[];
  urlRetour: string;
  urlAnnulation: string;
};

export type TypeEvenementPaiement =
  | "paiement_reussi"
  | "paiement_refuse"
  | "authentification_requise"
  | "echeance_payee"
  | "echeance_refusee"
  | "remboursement";

/** Événement typé, identique dans les deux modes. */
export type EvenementPaiement = {
  id: string;
  type: TypeEvenementPaiement;
  date: Date;
  sessionId: string | null;
  commandeRef: string | null;
  abonnementRef: string | null;
  paiementRef: string | null;
  montantTtc: Centimes;
  moyen: MoyenPaiement | null;
  carte: TypeCarte | null;
};

export interface ConnecteurStripe {
  ouvrirSessionPaiement(session: SessionPaiement, cle: Cle): Promise<{ sessionId: string; url: string }>;
  ouvrirSessionAbonnement(session: SessionAbonnement, cle: Cle): Promise<{ sessionId: string; url: string }>;
  rembourser(
    demande: { paiementRef: string; montantTtc: Centimes; motif: string },
    cle: Cle,
  ): Promise<{ remboursementRef: string }>;
  resilierAbonnement(abonnementRef: string, dateFin: Date): Promise<void>;
  /** Lève InvalidSignature si la signature ne correspond pas. */
  verifierEvenement(contenu: string, signature: string): Promise<EvenementPaiement>;
}
