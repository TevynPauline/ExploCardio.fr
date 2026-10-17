import type { Cle } from "../../types";

// Domaine « Stock et parc » du connecteur Odoo (contracts/odoo.md §2).

export type EtatDisponibilite =
  | { etat: "disponible" }
  | { etat: "delai"; delaiJours: number }
  | { etat: "indisponible" };

export type Disponibilite = {
  defaultCode: string;
  achat: EtatDisponibilite;
  /** Quantité en stock à l'achat (F03 : « N disponibles, le reste sous X jours ») ; null pour un pack. */
  quantiteDisponible: number | null;
  /** Délai de réassort quand le stock est épuisé ; null si l'article devient indisponible. */
  delaiReassortJours: number | null;
  /** Absente si l'article n'est pas proposé en mise à disposition. */
  miseADisposition: EtatDisponibilite | null;
};

export type LigneReservation = { defaultCode: string; quantite: number };

export interface StockOdoo {
  lireDisponibilite(references: string[]): Promise<Disponibilite[]>;
  /** Lève OutOfStock si une quantité n'est pas disponible. */
  reserver(lignes: LigneReservation[], cle: Cle): Promise<{ reference: string }>;
  lireDisponibiliteParc(reference: string, dateSouhaitee: Date): Promise<{ premiereDate: Date }>;
}
