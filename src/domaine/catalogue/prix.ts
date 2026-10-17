import type { BaremeFinancement, MensualiteForcee, Palier } from "@/connecteurs/odoo/interfaces";

// Règles de prix du catalogue (F03). Les prix, paliers, barèmes et montants forcés viennent
// d'Odoo (principe VI) ; le site ne fait qu'appliquer leurs règles d'affichage. Centimes HT.

/** Montant TTC (FR-027) : taux de TVA de la variante, arrondi au centime. */
export function prixTtc(prixHt: number, tauxTva: number): number {
  return Math.round((prixHt * (100 + tauxTva)) / 100);
}

export type Mensualite = { dureeMois: number; montantHt: number; source: "client" | "general" | "calcul" };

/**
 * Mensualité indicative de financement pour chaque durée du barème (FR-015, FR-016, FR-046) :
 * montant forcé pour le client connecté, sinon montant forcé pour tous, sinon prix × coefficient.
 */
export function mensualites(
  variante: { prixHt: number; mensualitesForcees: MensualiteForcee[] },
  bareme: BaremeFinancement[],
  forceesClient: MensualiteForcee[] = [],
): Mensualite[] {
  return [...bareme]
    .sort((a, b) => a.dureeMois - b.dureeMois)
    .map(({ dureeMois, coefficientPourcent }) => {
      const client = forceesClient.find((m) => m.dureeMois === dureeMois);
      if (client) return { dureeMois, montantHt: client.montantHt, source: "client" as const };
      const general = variante.mensualitesForcees.find((m) => m.dureeMois === dureeMois);
      if (general) return { dureeMois, montantHt: general.montantHt, source: "general" as const };
      return { dureeMois, montantHt: Math.round((variante.prixHt * coefficientPourcent) / 100), source: "calcul" as const };
    });
}

export type PrixQuantite = { prixLotHt: number; prixUnitaireHt: number; totalHt: number; palier: Palier | null };

/** Prix appliqué pour une quantité de conditionnements (FR-022, FR-023). */
export function prixPourQuantite(
  variante: { prixHt: number; quantiteParLot: number; paliers: Palier[] },
  quantite: number,
): PrixQuantite {
  if (!Number.isInteger(quantite) || quantite < 1) throw new RangeError("La quantité doit être un entier d'au moins 1.");
  const palier = [...variante.paliers].sort((a, b) => b.quantiteMin - a.quantiteMin).find((p) => quantite >= p.quantiteMin) ?? null;
  const prixLotHt = palier?.prixHt ?? variante.prixHt;
  return {
    prixLotHt,
    prixUnitaireHt: Math.round(prixLotHt / Math.max(1, variante.quantiteParLot)),
    totalHt: prixLotHt * quantite,
    palier,
  };
}
