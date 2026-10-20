import { dbSite } from "@/lib/db/site";

// Page « Logiciels Cloud » du back-office (F12, US4, US5) : tâches à faire, recherche d'un client
// et de ses accès (nom, cabinet, email, RPPS, SIRET).

export async function tachesAFaire() {
  return dbSite().tacheAcces.findMany({
    where: { etat: "a_faire" },
    include: { acces: { include: { compte: { include: { utilisateur: true } } } } },
    orderBy: { echeance: "asc" },
  });
}

export async function rechercherClientsCloud(recherche: string) {
  const q = recherche.trim();
  if (q.length < 2) return [];
  const chiffres = q.replace(/\s+/g, "");
  return dbSite().compteClient.findMany({
    where: {
      odooPartnerRef: { not: null },
      OR: [
        { utilisateur: { name: { contains: q, mode: "insensitive" } } },
        { utilisateur: { email: { contains: q, mode: "insensitive" } } },
        { nomCabinet: { contains: q, mode: "insensitive" } },
        { rpps: { contains: chiffres } },
        { siret: { contains: chiffres } },
      ],
    },
    include: { utilisateur: true, accesLogiciels: { orderBy: { creeLe: "desc" } } },
    orderBy: { creeLe: "desc" },
    take: 20,
  });
}

export async function journalDesAcces(accesIds: string[]) {
  if (!accesIds.length) return [];
  return dbSite().journalAction.findMany({ where: { objet: { in: accesIds }, action: { startsWith: "cloud." } }, orderBy: { date: "desc" }, take: 50 });
}
