import type { Prisma } from "@generated/site/client";
import { dbSite } from "@/lib/db/site";

// Journal du back-office (F13, US7, FR-031 à FR-033) : appels aux connecteurs et actions de
// l'équipe, filtrés et paginés. Aucune donnée de carte, de patient ni de mot de passe n'y figure.

export { verifierSeuil } from "./seuil";

export const PAR_PAGE = 50;

export type FiltresConnecteurs = { connecteur?: string; resultat?: string; du?: string; au?: string; q?: string };
export type FiltresActions = { action?: string; auteur?: string; du?: string; au?: string; q?: string };

/** « AAAA-MM-JJ » → bornes de la journée, heure de Paris approchée (UTC+1/+2 sans effet notable sur un filtre). */
function periode(du?: string, au?: string): Prisma.DateTimeFilter | undefined {
  const jour = /^\d{4}-\d{2}-\d{2}$/;
  const f: Prisma.DateTimeFilter = {};
  if (du && jour.test(du)) f.gte = new Date(`${du}T00:00:00`);
  if (au && jour.test(au)) f.lte = new Date(`${au}T23:59:59.999`);
  return Object.keys(f).length ? f : undefined;
}

function numeroPage(page: number) {
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export async function lireJournalConnecteurs(f: FiltresConnecteurs, page = 1) {
  const q = f.q?.trim();
  const where: Prisma.JournalConnecteurWhereInput = {
    ...(f.connecteur ? { connecteur: f.connecteur } : {}),
    ...(f.resultat ? { resultat: f.resultat } : {}),
    ...(periode(f.du, f.au) ? { date: periode(f.du, f.au) } : {}),
    ...(q ? { OR: [{ operation: { contains: q, mode: "insensitive" } }, { objet: { contains: q, mode: "insensitive" } }, { motifErreur: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const n = numeroPage(page);
  const [lignes, total] = await Promise.all([
    dbSite().journalConnecteur.findMany({ where, orderBy: { date: "desc" }, skip: (n - 1) * PAR_PAGE, take: PAR_PAGE }),
    dbSite().journalConnecteur.count({ where }),
  ]);
  return { lignes, total, page: n, pages: Math.max(1, Math.ceil(total / PAR_PAGE)) };
}

export async function lireJournalActions(f: FiltresActions, page = 1) {
  const q = f.q?.trim();
  const where: Prisma.JournalActionWhereInput = {
    ...(f.action ? { action: { startsWith: f.action } } : {}),
    ...(f.auteur?.trim() ? { auteur: { contains: f.auteur.trim(), mode: "insensitive" } } : {}),
    ...(periode(f.du, f.au) ? { date: periode(f.du, f.au) } : {}),
    ...(q ? { OR: [{ action: { contains: q, mode: "insensitive" } }, { objet: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const n = numeroPage(page);
  const [lignes, total] = await Promise.all([
    dbSite().journalAction.findMany({ where, orderBy: { date: "desc" }, skip: (n - 1) * PAR_PAGE, take: PAR_PAGE }),
    dbSite().journalAction.count({ where }),
  ]);
  return { lignes, total, page: n, pages: Math.max(1, Math.ceil(total / PAR_PAGE)) };
}

/** Familles d'actions proposées dans le filtre (préfixes). */
export const FAMILLES_ACTIONS: Record<string, string> = {
  comptes: "Comptes",
  equipe: "Équipe",
  parametres: "Paramètres",
  contenus: "Contenus",
  aide: "Centre d'aide",
  catalogue: "Catalogue",
  commande: "Commandes",
  demandes: "Demandes",
  financement: "Financements",
  cloud: "Accès Cloud",
  rgpd: "RGPD",
};
