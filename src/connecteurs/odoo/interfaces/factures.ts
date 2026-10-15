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
};

export interface FacturesOdoo {
  listerFactures(partenaireRef: string): Promise<ResumeFacture[]>;
  /** PDF de la facture ; porte la mention « FICTIVE » en démonstration (FR-032). */
  obtenirPdf(numero: string): Promise<Uint8Array>;
}
