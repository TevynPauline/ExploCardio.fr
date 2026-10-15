import { dbDemo } from "@/lib/db/demo";
import type { Prisma } from "@generated/demo/client";
import { PREFIXE_REFERENCE_FICTIVE } from "../../garde-donnees-fictives";

// Outils communs aux domaines du connecteur Odoo de démonstration.

export type Tx = Prisma.TransactionClient;

export const db = () => dbDemo();

/** Numérotation continue (équivalent de ir.sequence). */
export async function prochainNumero(tx: Tx, code: string): Promise<number> {
  const sequence = await tx.sequence.upsert({
    where: { code },
    create: { code, valeur: 1 },
    update: { valeur: { increment: 1 } },
  });
  return sequence.valeur;
}

/** Référence fictive : « FICT-SO-00012 ». Le préfixe la fait refuser par tout service réel. */
export async function prochaineReference(tx: Tx, prefixe: string): Promise<string> {
  const n = await prochainNumero(tx, prefixe);
  return `${PREFIXE_REFERENCE_FICTIVE}${prefixe}-${String(n).padStart(5, "0")}`;
}

/** Numéro de facture continu : « FICT/2026/00001 ». */
export async function prochainNumeroFacture(tx: Tx, date: Date): Promise<string> {
  const annee = date.getFullYear();
  const n = await prochainNumero(tx, `facture-${annee}`);
  return `FICT/${annee}/${String(n).padStart(5, "0")}`;
}

export function tva(montantHt: number, taux: number): number {
  return Math.round((montantHt * taux) / 100);
}

export function ajouterJours(date: Date, jours: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + jours);
  return d;
}

export function ajouterMois(date: Date, mois: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + mois);
  return d;
}

export function joursEntre(debut: Date, fin: Date): number {
  return Math.ceil((fin.getTime() - debut.getTime()) / 86_400_000);
}
