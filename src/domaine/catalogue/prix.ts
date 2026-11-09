import type { BaremeFinancement, MensualiteForcee, Palier } from "@/connecteurs/odoo/interfaces";
import { euros } from "@/lib/montants";

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

// F22 — Affichage des prix (constitution 2.3.0, principe II) : TTC en caractères principaux,
// HT juste en dessous. Les montants restent tenus en HT ; le TTC est dérivé du taux de
// l'article, ou repris tel quel quand il a déjà été calculé (totaux, commandes, factures).

/** Montant à afficher : HT et taux, ou HT et TTC déjà calculés. */
export type MontantAffichable = { ht: number; tauxTva: number; ttc?: undefined } | { ht: number; ttc: number; tauxTva?: undefined };

/** Les deux montants à afficher, TTC d'abord (F22, FR-002). */
export function montantsAffiches(m: MontantAffichable): { ttc: number; ht: number } {
  return { ttc: m.ttc ?? prixTtc(m.ht, m.tauxTva!), ht: m.ht };
}

export type OptionsPrixTexte = { aPartirDe?: boolean; periode?: string };

/**
 * Prix en une ligne de texte (emails, messages) : « 2 388,00 € TTC (soit 1 990,00 € HT) » ;
 * la période suit chacun des deux montants ; « Offert » pour un montant nul (F22, FR-014).
 */
export function prixTexte(m: MontantAffichable, { aPartirDe = false, periode }: OptionsPrixTexte = {}): string {
  const { ttc, ht } = montantsAffiches(m);
  if (ttc === 0 && ht === 0) return "Offert";
  const p = periode ? ` ${periode}` : "";
  return `${aPartirDe ? "À partir de " : ""}${euros(ttc)} TTC${p} (soit ${euros(ht)} HT${p})`;
}

/** Taux de TVA des frais de port, pour l'affichage TTC du port et du franco (F22, R4). */
export const TVA_FRAIS = 20;
