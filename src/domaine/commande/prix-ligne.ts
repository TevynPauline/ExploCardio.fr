import type { Palier } from "@/connecteurs/odoo/interfaces";

// Prix d'une ligne du panier calculé dans la page dès que la quantité change (F16, US5, D6) :
// le prix du client ou le prix dégressif atteint, et la remise en cours (même pourcentage).
// Odoo recalcule ensuite le panier complet (promotions, bons, frais de port) : ce calcul n'est
// qu'un affichage immédiat, corrigé en moins d'une seconde.

export type Bareme = {
  /** Prix unitaire HT de base de l'article (centimes). */
  prixHt: number;
  /** Prix dégressifs par quantité (centimes HT par unité). */
  paliers: Palier[];
  /** Prix du client hors palier, s'il est connu (centimes HT). */
  prixClientHt: number | null;
  /** Remise en cours sur la ligne, en pourcentage du montant brut. */
  remisePourcent: number;
};

export function prixUnitaire(b: Bareme, quantite: number): number {
  const palier = [...b.paliers].sort((x, y) => y.quantiteMin - x.quantiteMin).find((p) => quantite >= p.quantiteMin);
  return Math.min(b.prixClientHt ?? b.prixHt, palier?.prixHt ?? Number.POSITIVE_INFINITY);
}

/** Total HT de la ligne pour une quantité (centimes) ; `null` si la quantité n'est pas valable. */
export function prixLigne(b: Bareme, quantite: number): number | null {
  if (!Number.isInteger(quantite) || quantite < 1) return null;
  const brut = prixUnitaire(b, quantite) * quantite;
  return brut - Math.round((brut * b.remisePourcent) / 100);
}
