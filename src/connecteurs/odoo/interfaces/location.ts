import type { Centimes, Cle, MarqueFictive } from "../../types";

// Domaine « Location et abonnements » du connecteur Odoo (contracts/odoo.md §6, F05).

export type ObjetAbonnement = "mise_a_disposition" | "logiciel";

/**
 * Cycle de vie d'une location (F05, data-model.md) : commandée → en cours (livrée) →
 * résiliation prévue → en retard de retour → terminée ; suspendue pour impayé ; annulée.
 */
export type EtatLocation =
  | "commandee"
  | "en_cours"
  | "resiliation_prevue"
  | "en_retard_retour"
  | "suspendue_impaye"
  | "terminee"
  | "annulee";

export type Location = MarqueFictive & {
  ref: string;
  objet: ObjetAbonnement;
  defaultCode: string;
  libelle: string;
  /** Numéro de série, communiqué au client à l'expédition seulement (D5). */
  numeroSerie: string | null;
  montantMensuelHt: Centimes;
  debut: Date;
  fin: Date | null;
  prochaineEcheance: Date | null;
  etat: EtatLocation;
  /** Date de livraison annoncée (la location commence ce jour-là). */
  dateLivraison: Date | null;
  dateLimiteRetour: Date | null;
  expedieLe: Date | null;
  transporteur: string | null;
  suivi: string | null;
  /** Commande de vente d'origine (kit, premier mois). */
  commandeRef: string | null;
  /** Compte du client pas encore validé : rien ne part (FR-009). */
  expeditionBloquee: boolean;
  /** Appareil défectueux sans remplaçant : le client choisit de reporter ou d'annuler. */
  attenteChoixClient: boolean;
  colisNonLivre: boolean;
  /** Prélèvement échoué non régularisé. */
  impaye: boolean;
  rappelsRetour: number;
  etatRetour: "complet" | "degrade" | "perdu" | null;
  montantDegradationHt: Centimes | null;
  /** Logiciel Cloud de l'offre, ouvert à l'expédition (FR-012). */
  logiciel: string | null;
};

export type ChangementLocation = Location & { partenaireRef: string; modifieLe: Date };

export type NouvelAbonnement = {
  partenaireRef: string;
  objet: ObjetAbonnement;
  defaultCode: string;
  debut: Date;
  /** F05 : date de livraison choisie ; la location reste « commandée » jusqu'à la livraison. */
  dateLivraison?: Date;
  commandeRef?: string;
  expeditionBloquee?: boolean;
  /** Réservation d'appareil faite avant le paiement (F05, R4), consommée ici. */
  reservationCle?: Cle;
};

/** Règles de location fixées dans Odoo (FR-040, D7), lues pour prévenir le client à l'avance. */
export type ReglesLocation = {
  tentativesPrelevement: number;
  espacementTentativesJours: number;
  delaiRegularisationJours: number;
  delaiRetourJoursOuvres: number;
  toleranceRetardJours: number;
  delaiNonRetourJours: number;
};

/** Facture émise par Odoo après la fin d'une location, à prélever sur l'autorisation (FR-030). */
export type FactureAPrelever = { numero: string; abonnementRef: string; montantTtc: Centimes; libelle: string };

export interface LocationOdoo {
  /** Lève OutOfStock si aucun appareil n'est réservé ni disponible (mise à disposition). */
  creerAbonnement(abonnement: NouvelAbonnement, cle: Cle): Promise<{ ref: string }>;
  /**
   * Résiliation demandée à une date : fin au terme du mois payé (mois entamé dû si l'échéance
   * est atteinte), date limite de retour selon les règles d'Odoo.
   */
  resilier(ref: string, dateDemande: Date): Promise<{ fin: Date; dateLimiteRetour: Date | null }>;
  /** « Prolonger » : refusé (ValeurRefusee) si la fin est atteinte. */
  annulerResiliation(ref: string): Promise<{ fin: null }>;
  listerLocations(partenaireRef: string): Promise<Location[]>;
  listerChangements(depuis: Date): Promise<ChangementLocation[]>;
  /** Étiquette de retour préaffranchie (PDF) ; refusée sans résiliation. */
  etiquetteRetour(ref: string): Promise<Uint8Array>;
  /** Compte validé : les locations bloquées du client peuvent partir. */
  debloquerExpedition(partenaireRef: string): Promise<string[]>;
  /** Nouvelle date de livraison (choix du client après un appareil défectueux, ou recalcul). */
  reporterLivraison(ref: string, dateLivraison: Date): Promise<void>;
  /**
   * Annule une location non expédiée et émet l'avoir du premier mois ; renvoie le montant TTC
   * à rembourser. Refusée (ValeurRefusee) si l'appareil est parti.
   */
  annulerCommande(ref: string, motif: string, cle: Cle): Promise<{ montantTtc: Centimes; avoir: string | null }>;
  /** Kits d'accessoires possédés : achats payés (hors remboursés) et enregistrements de l'équipe. */
  kitsPossedes(partenaireRef: string): Promise<string[]>;
  lireRegles(): Promise<ReglesLocation>;
  /** Prélèvement mensuel refusé (événement de Stripe) : Odoo applique ses règles de nouvelles tentatives. */
  signalerImpaye(ref: string, date: Date): Promise<void>;
  listerFacturesAPrelever(): Promise<FactureAPrelever[]>;
  enregistrerPrelevement(numero: string, paiementRef: string, cle: Cle): Promise<void>;
  /**
   * Facture d'une échéance payée (premier mois ou mois suivant) des abonnements donnés (F04,
   * FR-029) ; idempotent par clé. Une échéance « suivante » avance la prochaine échéance.
   */
  facturerEcheance(
    echeance: { abonnementRefs: string[]; montantTtc: Centimes; paiementRef: string | null; libelle: string; mois?: "premier" | "suivant" },
    cle: Cle,
  ): Promise<{ facture: string }>;
}
