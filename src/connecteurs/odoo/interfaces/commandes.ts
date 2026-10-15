import type { Centimes, Cle, MarqueFictive } from "../../types";

// Domaine « Commandes » du connecteur Odoo (contracts/odoo.md §4).

export type StatutCommande =
  | "confirmee"
  | "expediee"
  | "livree"
  | "annulee"
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
  livraison: { adresse: string; codePostal: string; ville: string; fraisPortHt: Centimes };
  paiement: { mode: "carte" | "sepa" | "virement" | "financement"; reference: string };
  bonsUtilisesHt?: Centimes;
  codePromo?: string;
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
  financee: boolean;
  suivi: string | null;
};

export interface CommandesOdoo {
  /** Créée une seule fois par clé ; lève OutOfStock si une quantité manque. */
  creerCommandePayee(commande: NouvelleCommande, cle: Cle): Promise<{ ref: string }>;
  listerCommandes(partenaireRef: string): Promise<ResumeCommande[]>;
  lireCommande(ref: string): Promise<Commande>;
}
