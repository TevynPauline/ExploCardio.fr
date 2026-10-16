import { dbSite } from "@/lib/db/site";
import { verifierLien } from "./liens";

// Règles de validation du mini back-office (contracts/back-office-contenus.md) et journal.

export class SaisieRefusee extends Error {}

export function exigerLien(saisie: string, obligatoire: boolean): string | null {
  const t = saisie.trim();
  if (!t) {
    if (obligatoire) throw new SaisieRefusee("Le lien est obligatoire.");
    return null;
  }
  const r = verifierLien(t);
  if (!r.ok) throw new SaisieRefusee(r.raison);
  return r.lien;
}

export function exigerTexte(saisie: string, libelle: string, min: number, max: number): string {
  const t = saisie.trim();
  if (t.length < min) throw new SaisieRefusee(`${libelle} : ${min > 1 ? `au moins ${min} caractères` : "champ obligatoire"}.`);
  if (t.length > max) throw new SaisieRefusee(`${libelle} : ${max} caractères au plus (actuellement ${t.length}).`);
  return t;
}

export function dateFacultative(saisie: string, libelle: string): Date | null {
  if (!saisie.trim()) return null;
  const d = new Date(saisie);
  if (Number.isNaN(d.getTime())) throw new SaisieRefusee(`${libelle} : date invalide.`);
  return d;
}

export async function journaliser(auteur: { id: string; libelle: string }, action: string, objet: string, avant: unknown, apres: unknown) {
  await dbSite().journalAction.create({
    data: { auteurId: auteur.id, auteur: auteur.libelle, action, objet, detail: JSON.parse(JSON.stringify({ avant, apres })) },
  });
}
