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

/** Verrou optimiste (F13, D9) : refuse si le contenu a changé depuis l'ouverture du formulaire. */
export async function verifierVersionContenu(id: string, lu: string) {
  if (!id || !lu) return;
  const actuel = await dbSite().contenu.findUnique({ where: { id }, select: { modifieLe: true } });
  if (!actuel || actuel.modifieLe.toISOString() === lu) return;
  const derniere = await dbSite().journalAction.findFirst({ where: { objet: id }, orderBy: { date: "desc" } });
  const heure = actuel.modifieLe.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
  throw new SaisieRefusee(`Ce contenu a été modifié${derniere ? ` par ${derniere.auteur}` : ""} à ${heure} depuis que vous l'avez ouvert : rien n'a été écrasé. Rechargez la page pour repartir de la dernière version.`);
}

/** Toute image enregistrée porte un texte de remplacement (F13, FR-008). */
export function exigerTexteRemplacement(texte: string, objet = "Image"): string {
  const t = texte.trim();
  if (!t) throw new SaisieRefusee(`${objet} : le texte de remplacement est obligatoire.`);
  if (t.length > 200) throw new SaisieRefusee(`${objet} : texte de remplacement de 200 caractères au plus.`);
  return t;
}
