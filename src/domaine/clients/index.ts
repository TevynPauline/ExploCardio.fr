import type { Prisma, StatutCompteClient } from "@generated/site/client";
import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import type { Commande, DroitsAssistance, Intervention, Location, ResumeFacture } from "@/connecteurs/odoo/interfaces";
import { accesDuCompte } from "@/domaine/cloud/acces";
import { dbSite } from "@/lib/db/site";

// Rubrique « Clients » du back-office (F13, US1, US5, D6) : liste (à valider en tête, comptes
// prioritaires d'abord), recherche par nom, cabinet, téléphone, email, RPPS ou SIRET, et fiche
// complète en lecture seule : compte, droits d'assistance, locations, accès Cloud, commandes
// récentes, factures. Les données de gestion sont lues dans Odoo par son connecteur.

export const STATUTS_LISTE = ["en_attente", "valide", "suspendu", "refuse", "email_a_confirmer", "tous"] as const;
export type StatutListe = (typeof STATUTS_LISTE)[number];

/** Condition de recherche ; téléphones comparés sur leurs seuls chiffres (F06). */
export async function conditionRecherche(recherche: string): Promise<Prisma.CompteClientWhereInput | null> {
  const q = recherche.trim().slice(0, 100);
  if (q.length < 2) return null;
  const chiffres = q.replace(/\s+/g, "");
  const numero = q.replace(/[^\d]/g, "");
  const parTelephone =
    numero.length >= 4
      ? (await dbSite().$queryRaw<{ id: string }[]>`SELECT id FROM utilisateur WHERE regexp_replace(coalesce(telephone, ''), '[^0-9]', '', 'g') LIKE ${`%${numero}%`}`).map((u) => u.id)
      : [];
  return {
    OR: [
      { utilisateur: { name: { contains: q, mode: "insensitive" } } },
      { utilisateur: { email: { contains: q, mode: "insensitive" } } },
      { utilisateurId: { in: parTelephone } },
      { nomCabinet: { contains: q, mode: "insensitive" } },
      { rpps: { contains: chiffres } },
      { siret: { contains: chiffres } },
    ],
  };
}

export type LigneClient = {
  id: string;
  nom: string;
  civilite: string | null;
  email: string;
  numero: string;
  cabinet: string | null;
  statut: StatutCompteClient;
  creeLe: Date;
  /** Compte en attente ayant déjà payé une commande (mise à disposition express, F05). */
  prioritaire: boolean;
};

export async function listerClients(statut: StatutListe, recherche = ""): Promise<LigneClient[]> {
  const condition = await conditionRecherche(recherche);
  const comptes = await dbSite().compteClient.findMany({
    where: { ...(statut === "tous" ? { statut: { not: "supprime" } } : { statut }), ...(condition ?? {}) },
    include: { utilisateur: true, commandes: { where: { etape: "terminee" }, select: { id: true }, take: 1 } },
    orderBy: { creeLe: statut === "en_attente" ? "asc" : "desc" },
    take: 200,
  });
  const lignes = comptes.map((c) => ({
    id: c.id,
    nom: c.utilisateur.name,
    civilite: c.utilisateur.civilite,
    email: c.utilisateur.email,
    numero: c.rpps ? `RPPS ${c.rpps}` : `SIRET ${c.siret ?? ""}`,
    cabinet: c.nomCabinet,
    statut: c.statut,
    creeLe: c.creeLe,
    prioritaire: c.statut === "en_attente" && c.commandes.length > 0,
  }));
  // À valider : les comptes prioritaires en tête, puis les plus anciens (FR-001).
  return statut === "en_attente" ? [...lignes.filter((l) => l.prioritaire), ...lignes.filter((l) => !l.prioritaire)] : lignes;
}

export async function compterParStatut(): Promise<Record<string, number>> {
  const g = await dbSite().compteClient.groupBy({ by: ["statut"], _count: true });
  return Object.fromEntries(g.map((x) => [x.statut, x._count]));
}

export type FicheClient = NonNullable<Awaited<ReturnType<typeof ficheClient>>>;

async function lire<T>(lecture: () => Promise<T>, indisponibles: string[], bloc: string): Promise<T | null> {
  try {
    return await lecture();
  } catch (e) {
    if (!estErreurConnecteur(e)) throw e;
    indisponibles.push(bloc);
    return null;
  }
}

export async function ficheClient(id: string) {
  const compte = await dbSite().compteClient.findUnique({
    where: { id },
    include: { utilisateur: true, adresses: true, decisions: { orderBy: { date: "desc" } }, commandes: { where: { etape: "terminee" }, select: { id: true }, take: 1 } },
  });
  if (!compte) return null;
  const ref = compte.odooPartnerRef;
  const indisponibles: string[] = [];
  const odoo = registre.odoo();
  const [droits, interventions, locations, commandes, factures, acces] = await Promise.all([
    ref ? lire<DroitsAssistance>(() => odoo.fidelite.lireDroitsAssistance(ref), indisponibles, "droits") : null,
    ref ? lire<Intervention[]>(() => odoo.fidelite.listerInterventions(ref), indisponibles, "droits") : null,
    ref ? lire<Location[]>(async () => (await odoo.location.listerLocations(ref)).filter((l) => !["terminee", "annulee"].includes(l.etat)), indisponibles, "locations") : null,
    ref
      ? lire<Commande[]>(async () => Promise.all((await odoo.commandes.listerCommandes(ref)).slice(0, 10).map((c) => odoo.commandes.lireCommande(c.ref))), indisponibles, "commandes")
      : null,
    ref ? lire<ResumeFacture[]>(async () => (await odoo.factures.listerFactures(ref)).slice(0, 10), indisponibles, "factures") : null,
    accesDuCompte(compte.id),
  ]);
  return { compte, prioritaire: compte.statut === "en_attente" && compte.commandes.length > 0, droits, interventions, locations, commandes, factures, acces, indisponibles: [...new Set(indisponibles)] };
}
