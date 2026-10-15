import type { Centimes } from "../../types";
import type { LigneNouvelleCommande } from "./commandes";

// Domaine « Fidélité » du connecteur Odoo (contracts/odoo.md §7, règles de F06).
// En démonstration, ces règles sont appliquées comme le fera Odoo (principe III).

export type TypeMouvement = "credit" | "utilisation" | "retrait" | "restitution" | "expiration";

export type MouvementCagnotte = {
  type: TypeMouvement;
  montantHt: Centimes;
  commandeRef: string | null;
  date: Date;
  validiteFin: Date | null;
};

export type Cagnotte = {
  soldeHt: Centimes;
  mouvements: MouvementCagnotte[];
  prochaineExpiration: { date: Date; montantHt: Centimes } | null;
};

export type DroitsAssistance =
  | { statut: "actif"; fin: Date; origine: string }
  | { statut: "inactif"; fin: Date | null; origine: string | null };

export type EstimationGains = {
  montantEligibleHt: Centimes;
  tauxPourcent: number;
  bonsAchatHt: Centimes;
  /** Date de fin des droits si la commande en ouvre ou en prolonge. */
  droitsJusquAu: Date | null;
  /** Montant éligible qui ouvrirait les droits (client sans droits actifs). */
  seuilDroitsHt: Centimes;
};

export interface FideliteOdoo {
  lireCagnotte(partenaireRef: string): Promise<Cagnotte>;
  lireDroitsAssistance(partenaireRef: string): Promise<DroitsAssistance>;
  estimerGains(partenaireRef: string, lignes: LigneNouvelleCommande[]): Promise<EstimationGains>;
  /**
   * Applique les règles à une commande payée, annulée ou remboursée : crédite, retire ou
   * restitue. Idempotent : rejouer ne compte rien deux fois (F06, FR-018).
   */
  appliquerRegles(commandeRef: string): Promise<{ mouvements: MouvementCagnotte[] }>;
}
