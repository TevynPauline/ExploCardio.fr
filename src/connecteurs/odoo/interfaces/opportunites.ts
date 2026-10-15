import type { Cle } from "../../types";

// Domaine « Opportunités commerciales » du connecteur Odoo (contracts/odoo.md §8, FR-021).

export type CopieDemande = {
  type: "financement" | "devis";
  /** Référence de la demande gérée par le site. */
  referenceDemande: string;
  partenaireRef?: string;
  contenu: Record<string, unknown>;
};

export interface OpportunitesOdoo {
  copierDemande(demande: CopieDemande, cle: Cle): Promise<{ ref: string }>;
}
