import type { Centimes, MarqueFictive } from "../../types";

// Domaine « Factures » du connecteur Odoo (contracts/odoo.md §5).

export type ResumeFacture = MarqueFictive & {
  numero: string;
  type: "facture" | "avoir";
  date: Date;
  commandeRef: string | null;
  montantHt: Centimes;
  montantTtc: Centimes;
  etatPaiement: "paye" | "en_attente" | "rembourse";
  /** Références portées par les lignes (commande, location) : rattachement d'une facture à sa location (F05). */
  references: string[];
};

/** Niveau de relance des paiements en retard (relances de factures d'Odoo, F10, D4). */
export type NiveauRelance = {
  niveau: number;
  libelle: string;
  /** Jours avant la conséquence (annulation de la commande, suspension). */
  joursAvantConsequence: number;
  /** Dernière relance : annonce la conséquence et sa date (FR-021). */
  annonceConsequence: boolean;
};

export interface FacturesOdoo {
  listerFactures(partenaireRef: string): Promise<ResumeFacture[]>;
  /** Niveaux de relance, du premier au dernier (F10, FR-020). */
  lireNiveauxRelance(): Promise<NiveauRelance[]>;
  /** PDF de la facture ; porte la mention « FICTIVE » en démonstration (FR-032). */
  obtenirPdf(numero: string): Promise<Uint8Array>;
}
