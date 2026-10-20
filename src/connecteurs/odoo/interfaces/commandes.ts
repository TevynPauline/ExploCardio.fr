import type { Centimes, Cle, MarqueFictive } from "../../types";

// Domaine « Commandes » du connecteur Odoo (contracts/odoo.md §4).

export type StatutCommande =
  | "en_attente_paiement"
  | "payee"
  | "en_preparation"
  | "expediee"
  | "livree"
  | "annulee"
  | "remboursee_partiellement"
  | "remboursee";

export type LigneNouvelleCommande = {
  defaultCode: string;
  quantite: number;
  /** Ligne offerte à 0 € (cadeau de bienvenue). */
  offerte?: boolean;
};

export type NouvelleCommande = {
  partenaireRef: string;
  lignes: LigneNouvelleCommande[];
  /**
   * Adresse de livraison. Avec `mode`, les frais sont ceux du devis (F04) ; sans mode, les
   * frais donnés sont repris tels quels (jeu de départ de F11).
   */
  livraison: { adresse: string; codePostal: string; ville: string; fraisPortHt?: Centimes; mode?: string };
  paiement: { mode: "carte" | "sepa" | "virement" | "financement"; reference: string };
  bonsUtilisesHt?: Centimes;
  codePromo?: string;
  /** Réservation de stock faite avant le paiement : consommée par la commande (F04). */
  reservationCle?: Cle;
};

// --- Devis (F04, R1) : Odoo calcule ; le site affiche ce qui sera facturé. ----------------

export type FormuleLigne = "achat" | "mise_a_disposition";

export type LigneDevis = {
  defaultCode: string;
  formule: FormuleLigne;
  quantite: number;
  offerte?: boolean;
  /** F12 : abonnement logiciel qui ne commence qu'à cette date (fin d'une période incluse) : rien n'est dû avant. */
  priseEffet?: Date | null;
};

export type DemandeDevis = {
  /** Client connecté (liste de prix, bons d'achat) ; null pour un visiteur. */
  partenaireRef: string | null;
  lignes: LigneDevis[];
  codePromo?: string | null;
  bonsDemandesHt?: Centimes;
  modeLivraison?: string | null;
};

export type LigneDevisCalculee = {
  defaultCode: string;
  formule: FormuleLigne;
  libelle: string;
  quantite: number;
  /** Prix unitaire appliqué : prix du client, prix dégressif ou prix de base. */
  prixUnitaireHt: Centimes;
  /** Remise automatique (promotion en cours) et remise du code promo sur la ligne. */
  remiseHt: Centimes;
  totalHt: Centimes;
  tauxTva: number;
  offerte: boolean;
  /** Promotion automatique appliquée, s'il y en a une. */
  promotion: string | null;
};

export type ModeLivraisonDevis = {
  code: string;
  libelle: string;
  forfaitHt: Centimes;
  delaiJours: number;
  disponible: boolean;
  motif: string | null;
  francoAtteint: boolean;
};

export type Devis = MarqueFictive & {
  lignes: LigneDevisCalculee[];
  /** Bloc « Paiement unique » ; null si le panier ne contient pas d'achat. */
  achat: {
    sousTotalHt: Centimes;
    remisesAutomatiquesHt: Centimes;
    remiseCodePromoHt: Centimes;
    bonsHt: Centimes;
    fraisPortHt: Centimes;
    /** Livraison et installation des équipements volumineux, hors franco (FR-046). */
    fraisSpecifiquesHt: Centimes;
    totalHt: Centimes;
    tva: Centimes;
    totalTtc: Centimes;
  } | null;
  /** Bloc « Abonnement mensuel » ; null sans mise à disposition. */
  abonnement: { premierMoisHt: Centimes; moisSuivantsHt: Centimes; premierMoisTtc: Centimes; moisSuivantsTtc: Centimes } | null;
  codePromo: { code: string; applique: boolean; motif: string | null } | null;
  /** Règle de cumul des remises appliquée, à afficher au client. */
  regleCumul: string;
  modesLivraison: ModeLivraisonDevis[];
  /** Mode retenu (celui demandé s'il est disponible, sinon le premier disponible). */
  modeLivraison: string | null;
  seuilFrancoHt: Centimes;
};

export type ChangementCommande = {
  ref: string;
  partenaireRef: string;
  statut: StatutCommande;
  transporteur: string | null;
  suivi: string | null;
  remboursementsTtc: Centimes;
  modifieLe: Date;
};

export type RemboursementAExecuter = {
  id: string;
  commandeRef: string;
  /** Référence du paiement Stripe (carte, SEPA) ; null pour un virement. */
  paiementRef: string | null;
  modePaiement: string;
  montantTtc: Centimes;
  motif: string;
  /** F06 (D4) : bons d'achat déjà dépensés, déduits de ce remboursement (HT). */
  bonsDeduitsHt: Centimes;
};

export type EnregistrementRemboursement = {
  commandeRef: string;
  montantTtc: Centimes;
  motif: string;
  source: "odoo" | "stripe";
  referenceStripe: string | null;
  /** Remboursement décidé dans Odoo qui vient d'être exécuté. */
  remboursementId?: string;
};

export type LigneCommande = {
  defaultCode: string;
  libelle: string;
  quantite: number;
  prixUnitaireHt: Centimes;
  remiseHt: Centimes;
};

export type ResumeCommande = MarqueFictive & {
  ref: string;
  date: Date;
  montantHt: Centimes;
  montantTtc: Centimes;
  statut: StatutCommande;
};

export type Commande = ResumeCommande & {
  partenaireRef: string;
  lignes: LigneCommande[];
  tva: Centimes;
  fraisPortHt: Centimes;
  bonsUtilisesHt: Centimes;
  modePaiement: string;
  referencePaiement: string | null;
  financee: boolean;
  transporteur: string | null;
  suivi: string | null;
  echeancePaiement: Date | null;
  remboursementsTtc: Centimes;
};

export interface CommandesOdoo {
  /** Calcule les montants d'un panier (F04, R1) ; mêmes règles que la commande. */
  calculerDevis(demande: DemandeDevis): Promise<Devis>;
  /** Créée une seule fois par clé ; lève OutOfStock si une quantité manque. */
  creerCommandePayee(commande: NouvelleCommande, cle: Cle): Promise<{ ref: string }>;
  /** Commande « en attente de paiement », stock réservé jusqu'à l'échéance (F04, FR-017). */
  creerCommandeVirement(commande: NouvelleCommande, cle: Cle): Promise<{ ref: string; echeance: Date }>;
  /** Commande en attente annulée, stock libéré (F04, FR-018). */
  annulerCommandeEnAttente(ref: string, motif: string): Promise<void>;
  listerCommandes(partenaireRef: string): Promise<ResumeCommande[]>;
  lireCommande(ref: string): Promise<Commande>;
  /** Commandes modifiées depuis une date : statut, expédition, remboursements (F04, FR-032). */
  listerChangements(depuis: Date): Promise<ChangementCommande[]>;
  /** Remboursements décidés dans Odoo, à exécuter par Stripe (F04, FR-031). */
  listerRemboursementsAExecuter(): Promise<RemboursementAExecuter[]>;
  /** Enregistre un remboursement et émet l'avoir ; idempotent par clé (F04, FR-030). */
  enregistrerRemboursement(remboursement: EnregistrementRemboursement, cle: Cle): Promise<{ avoir: string }>;
}
