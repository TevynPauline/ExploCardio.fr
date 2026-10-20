import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import type { DroitsAssistance, Intervention, ReglesProgramme } from "@/connecteurs/odoo/interfaces";
import { dbSite } from "@/lib/db/site";

// Page « Assistance » du back-office (F06, US6, D7) : en lecture seule pour toute l'équipe, le
// statut des droits d'un client, retrouvé par nom, cabinet, email, téléphone, RPPS ou SIRET.

export type FicheAssistance = {
  compteId: string;
  nom: string;
  cabinet: string | null;
  email: string;
  telephone: string | null;
  rpps: string | null;
  siret: string | null;
  droits: DroitsAssistance | null;
  interventions: Intervention[];
};

export const RESULTATS_MAX = 20;

export async function rechercherAssistance(recherche: string): Promise<{ fiches: FicheAssistance[]; indisponible: boolean }> {
  const q = recherche.trim();
  if (q.length < 2) return { fiches: [], indisponible: false };
  const chiffres = q.replace(/\s+/g, "");
  // Téléphones comparés sur leurs seuls chiffres (saisis avec ou sans espaces, points, tirets).
  const numero = q.replace(/[^\d]/g, "");
  const parTelephone =
    numero.length >= 4
      ? (await dbSite().$queryRaw<{ id: string }[]>`SELECT id FROM utilisateur WHERE regexp_replace(coalesce(telephone, ''), '[^0-9]', '', 'g') LIKE ${`%${numero}%`}`).map((u) => u.id)
      : [];
  const comptes = await dbSite().compteClient.findMany({
    where: {
      odooPartnerRef: { not: null },
      statut: { not: "supprime" },
      OR: [
        { utilisateur: { name: { contains: q, mode: "insensitive" } } },
        { utilisateur: { email: { contains: q, mode: "insensitive" } } },
        { utilisateurId: { in: parTelephone } },
        { nomCabinet: { contains: q, mode: "insensitive" } },
        { rpps: { contains: chiffres } },
        { siret: { contains: chiffres } },
      ],
    },
    include: { utilisateur: true },
    orderBy: { creeLe: "desc" },
    take: RESULTATS_MAX,
  });
  const odoo = registre.odoo().fidelite;
  let indisponible = false;
  const fiches = await Promise.all(
    comptes.map(async (c): Promise<FicheAssistance> => {
      let droits: DroitsAssistance | null = null;
      let interventions: Intervention[] = [];
      try {
        [droits, interventions] = await Promise.all([odoo.lireDroitsAssistance(c.odooPartnerRef!), odoo.listerInterventions(c.odooPartnerRef!)]);
      } catch (e) {
        if (!estErreurConnecteur(e)) throw e;
        indisponible = true;
      }
      return {
        compteId: c.id,
        nom: c.utilisateur.name,
        cabinet: c.nomCabinet,
        email: c.utilisateur.email,
        telephone: c.utilisateur.telephone,
        rpps: c.rpps,
        siret: c.siret,
        droits,
        interventions,
      };
    }),
  );
  return { fiches, indisponible };
}

export async function reglesEnVigueur(): Promise<ReglesProgramme | null> {
  try {
    return await registre.odoo().fidelite.lireReglesProgramme();
  } catch (e) {
    if (estErreurConnecteur(e)) return null;
    throw e;
  }
}
