import type { Centimes } from "../../types";
import type { LigneNouvelleCommande } from "./commandes";
import type { EtatDisponibilite } from "./stock";

// Domaine « Fidélité » du connecteur Odoo (contracts/odoo.md §7, règles de F06).
// Odoo calcule tout ; en démonstration, ces règles sont appliquées comme le fera Odoo
// (principe III), vérifiées par un jeu de commandes de référence commun aux deux modes.

export type TypeMouvement = "credit" | "utilisation" | "retrait" | "restitution" | "expiration" | "ajustement";

export type MouvementCagnotte = {
  type: TypeMouvement;
  montantHt: Centimes;
  commandeRef: string | null;
  date: Date;
  validiteFin: Date | null;
  /** Ajustement manuel : motif obligatoire (FR-027). */
  motif: string | null;
};

/** Lot de bons encore disponibles, consommés dans l'ordre de leur fin de validité (FR-012). */
export type LotBons = { resteHt: Centimes; validiteFin: Date; commandeRef: string | null };

export type Cagnotte = {
  soldeHt: Centimes;
  mouvements: MouvementCagnotte[];
  lots: LotBons[];
  prochaineExpiration: { date: Date; montantHt: Centimes } | null;
};

export type EvenementDroits = {
  date: Date;
  type: "ouverture" | "prolongation" | "retrait" | "ajustement";
  commandeRef: string | null;
  fin: Date;
  motif: string | null;
};

export type DroitsAssistance =
  | { statut: "actif"; fin: Date; origine: string; historique: EvenementDroits[] }
  | { statut: "inactif"; fin: Date | null; origine: string | null; historique: EvenementDroits[] };

export type EstimationGains = {
  montantEligibleHt: Centimes;
  tauxPourcent: number;
  bonsAchatHt: Centimes;
  /** Date de fin des droits si la commande en ouvre ou en prolonge. */
  droitsJusquAu: Date | null;
  /** Montant éligible qui ouvrirait les droits (client sans droits actifs). */
  seuilDroitsHt: Centimes;
  /** Montant éligible encore nécessaire pour le palier suivant, et son taux ; null au dernier palier. */
  palierSuivant: { manqueHt: Centimes; tauxPourcent: number } | null;
};

/** Règles du programme en vigueur (lecture seule sur le site, FR-029). */
export type ReglesProgramme = {
  paliers: { plancherHt: Centimes; inclusif: boolean; tauxPourcent: number }[];
  validiteMois: number;
  seuilDroitsHt: Centimes;
  dureeDroitsJours: number;
  prolongation: "cumul" | "remise_a_zero";
  plafondDroitsJours: number;
  prixAssistanceActeHt: Centimes;
  /** Article de l'assistance à l'acte (FR-013). */
  articleAssistanceActe: string;
};

export type Intervention = { id: string; etat: "disponible" | "consommee"; acheteeLe: Date; consommeeLe: Date | null; commandeRef: string };

/** Changement relevé par le site pour prévenir le client une seule fois (F06, R7). */
export type ChangementFidelite =
  | { genre: "mouvement"; cle: string; partenaireRef: string; mouvement: MouvementCagnotte }
  | { genre: "droits"; cle: string; partenaireRef: string; evenement: EvenementDroits }
  | { genre: "intervention"; cle: string; partenaireRef: string; intervention: Intervention };

export type PromotionAnnoncee = {
  nom: string;
  type: "remise_automatique" | "vente_flash" | "code_promo";
  code: string | null;
  remisePourcent: number | null;
  fin: Date | null;
  /** Articles concernés, avec prix d'origine et prix remisé HT (FR-033). */
  articles: { defaultCode: string; prixHt: Centimes; prixRemiseHt: Centimes }[];
};

/** Offre de bienvenue : article offert défini dans Odoo (F02). */
export type OffreBienvenue = { defaultCode: string; disponibilite: EtatDisponibilite };

export interface FideliteOdoo {
  lireCagnotte(partenaireRef: string): Promise<Cagnotte>;
  lireDroitsAssistance(partenaireRef: string): Promise<DroitsAssistance>;
  /** `partenaireRef` null : estimation pour un visiteur (bons selon le palier, seuil des droits). */
  estimerGains(partenaireRef: string | null, lignes: LigneNouvelleCommande[]): Promise<EstimationGains>;
  /**
   * Applique les règles à une commande payée, annulée ou remboursée : crédite, retire ou
   * restitue. Idempotent : rejouer ne compte rien deux fois (F06, FR-018). Odoo l'applique
   * aussi de lui-même à chaque changement d'état de la commande.
   */
  appliquerRegles(commandeRef: string): Promise<{ mouvements: MouvementCagnotte[] }>;
  listerChangementsDepuis(depuis: Date): Promise<ChangementFidelite[]>;
  lireReglesProgramme(): Promise<ReglesProgramme>;
  listerInterventions(partenaireRef: string): Promise<Intervention[]>;
  promotionsEnCours(date: Date): Promise<PromotionAnnoncee[]>;
  /** Article offert par le programme « cadeau de bienvenue », ou null s'il n'y en a pas. */
  lireOffreBienvenue(): Promise<OffreBienvenue | null>;
}
