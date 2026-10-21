import { dbSite } from "@/lib/db/site";

// Suivi des messages de contact et des demandes de devis (F13, US6, D11) : état, note interne,
// qui a traité ; verrou optimiste (D9) ; chaque changement est journalisé.

export class SuiviRefuse extends Error {}

type Auteur = { id: string; libelle: string };

export const ETATS_MESSAGE = { nouveau: "Nouveau", en_cours: "En cours", traite: "Traité" } as const;
export const ETATS_DEVIS = { recue: "Reçue", en_cours: "En cours", traitee: "Traitée" } as const;
export type EtatMessage = keyof typeof ETATS_MESSAGE;
export type EtatDevis = keyof typeof ETATS_DEVIS;

export type Suivi = { etat: string; notes: string; modifieLeLu: string };

const NOTES_MAX = 2000;

function heure(d: Date) {
  return d.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" });
}

function refusVersion(traitePar: string | null, modifieLe: Date): never {
  throw new SuiviRefuse(
    `Cette demande a été modifiée${traitePar ? ` par ${traitePar}` : ""} à ${heure(modifieLe)} depuis que vous l'avez ouverte : rien n'a été écrasé. Rechargez la page pour repartir de la dernière version.`,
  );
}

function notesValides(notes: string): string | null {
  const n = notes.replace(/\r\n/g, "\n").trim();
  if (n.length > NOTES_MAX) throw new SuiviRefuse(`Note : ${NOTES_MAX} caractères au plus (actuellement ${n.length}).`);
  return n || null;
}

async function journal(auteur: Auteur, action: string, objet: string, avant: unknown, apres: unknown) {
  await dbSite().journalAction.create({ data: { auteurId: auteur.id, auteur: auteur.libelle, action, objet, detail: JSON.parse(JSON.stringify({ avant, apres })) } });
}

export async function suivreMessage(id: string, s: Suivi, auteur: Auteur, maintenant = new Date()): Promise<void> {
  if (!(s.etat in ETATS_MESSAGE)) throw new SuiviRefuse("État inconnu.");
  const etat = s.etat as EtatMessage;
  const notes = notesValides(s.notes);
  const m = await dbSite().messageContact.findUnique({ where: { id } });
  if (!m) throw new SuiviRefuse("Ce message n'existe plus.");
  if (m.modifieLe.toISOString() !== s.modifieLeLu) refusVersion(m.traitePar, m.modifieLe);
  if (m.etat === etat && (m.notes ?? null) === notes) return;
  const donnees = { etat, notes, traitePar: auteur.libelle, traiteLe: etat === "traite" ? (m.traiteLe ?? maintenant) : null };
  await dbSite().messageContact.update({ where: { id }, data: donnees });
  await journal(auteur, "demandes.message.suivi", id, { etat: m.etat, notes: m.notes }, { etat, notes });
}

export async function suivreDevis(id: string, s: Suivi, auteur: Auteur): Promise<void> {
  if (!(s.etat in ETATS_DEVIS)) throw new SuiviRefuse("État inconnu.");
  const statut = s.etat as EtatDevis;
  const notes = notesValides(s.notes);
  const d = await dbSite().demandeDevis.findUnique({ where: { id } });
  if (!d) throw new SuiviRefuse("Cette demande n'existe plus.");
  if (d.modifieLe.toISOString() !== s.modifieLeLu) refusVersion(d.traitePar, d.modifieLe);
  if (d.statut === statut && (d.notes ?? null) === notes) return;
  await dbSite().demandeDevis.update({ where: { id }, data: { statut, notes, traitePar: auteur.libelle } });
  await journal(auteur, "demandes.devis.suivi", id, { statut: d.statut, notes: d.notes }, { statut, notes });
}

export async function listerMessages(etat: EtatMessage | "tous") {
  return dbSite().messageContact.findMany({ where: etat === "tous" ? {} : { etat }, orderBy: { date: "desc" }, take: 100 });
}

export async function listerDevis(statut: EtatDevis | "tous") {
  return dbSite().demandeDevis.findMany({ where: statut === "tous" ? {} : { statut }, orderBy: { creeLe: "desc" }, take: 100 });
}

export async function compterMessages() {
  const g = await dbSite().messageContact.groupBy({ by: ["etat"], _count: true });
  return Object.fromEntries(g.map((x) => [x.etat, x._count])) as Partial<Record<EtatMessage, number>>;
}

export async function compterDevis() {
  const g = await dbSite().demandeDevis.groupBy({ by: ["statut"], _count: true });
  return Object.fromEntries(g.map((x) => [x.statut, x._count])) as Partial<Record<EtatDevis, number>>;
}
