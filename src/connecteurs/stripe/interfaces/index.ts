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
  /** F05 : un élément par location, pour arrêter l'une sans les autres. */
  elements?: ElementAbonnement[];
  moyens: MoyenPaiement[];
  urlRetour: string;
  urlAnnulation: string;
};

export type ElementAbonnement = { element: string; premierMontantTtc: Centimes; montantMensuelTtc: Centimes };

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
  /**
   * F05 : arrête les prélèvements mensuels d'un élément à une date ; l'autorisation de
   * prélèvement (carte, mandat SEPA) reste valable (FR-030). Idempotent.
   */
  retirerElementAbonnement(abonnementRef: string, element: string, dateEffet: Date, cle: Cle): Promise<void>;
  /** F05 : remet un élément retiré (résiliation annulée par « Prolonger »). */
  retablirElementAbonnement(abonnementRef: string, element: string): Promise<void>;
  /**
   * F05 : prélève un montant ponctuel sur l'autorisation conservée (retard, dégradation, valeur
   * de remplacement) ; idempotent par clé. Refusé (OperationRefusee) si l'autorisation est libérée.
   */
  preleverPonctuel(
    demande: { abonnementRef: string; montantTtc: Centimes; libelle: string },
    cle: Cle,
  ): Promise<{ paiementRef: string; etat: "payee" | "refusee" }>;
  /** F05 : libère l'autorisation après le retour et le règlement des sommes dues. */
  libererAutorisation(abonnementRef: string): Promise<void>;
  /** Lève InvalidSignature si la signature ne correspond pas. */
  verifierEvenement(contenu: string, signature: string): Promise<EvenementPaiement>;
}
