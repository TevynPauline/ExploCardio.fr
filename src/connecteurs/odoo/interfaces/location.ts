import type { Centimes, Cle, MarqueFictive } from "../../types";

// Domaine « Location et abonnements » du connecteur Odoo (contracts/odoo.md §6).

export type ObjetAbonnement = "mise_a_disposition" | "logiciel";

export type Location = MarqueFictive & {
  ref: string;
  objet: ObjetAbonnement;
  defaultCode: string;
  libelle: string;
  numeroSerie: string | null;
  montantMensuelHt: Centimes;
  debut: Date;
  fin: Date | null;
  prochaineEcheance: Date | null;
  etat: "en_cours" | "resiliation_prevue" | "termine" | "en_retard_retour";
};

export type NouvelAbonnement = {
  partenaireRef: string;
  objet: ObjetAbonnement;
  defaultCode: string;
  debut: Date;
};

export interface LocationOdoo {
  /** Lève OutOfStock si aucun appareil du parc n'est disponible (mise à disposition). */
  creerAbonnement(abonnement: NouvelAbonnement, cle: Cle): Promise<{ ref: string }>;
  resilier(ref: string, date: Date): Promise<{ fin: Date }>;
  annulerResiliation(ref: string): Promise<{ fin: null }>;
  listerLocations(partenaireRef: string): Promise<Location[]>;
  /**
   * Facture d'une échéance payée (premier mois ou mois suivant) des abonnements donnés (F04,
   * FR-029) ; idempotent par clé.
   */
  facturerEcheance(echeance: { abonnementRefs: string[]; montantTtc: Centimes; paiementRef: string | null; libelle: string }, cle: Cle): Promise<{ facture: string }>;
}
