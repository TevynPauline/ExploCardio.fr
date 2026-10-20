import type { Envoi, Prisma, ScenarioEmail } from "@generated/site/client";
import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { dbSite } from "@/lib/db/site";
import { entreeDuModele } from "./catalogue";
import { destinatairesAlertes, notifierEquipe } from "./envoi";

// Suivi des envois (F10, US8, FR-033, FR-035, FR-036, D9, D10) : remise, rejets, ouvertures lus
// auprès de l'outil d'envoi ; suspension d'une adresse qui rejette durablement les messages ;
// résultats des scénarios et des campagnes (envoyés, remis, ouverts, suivis d'une commande).

const JOUR = 24 * 3600_000;
const SUIVI_JOURS = 3;
const REJETS_TEMPORAIRES_MAX = 3;
const CONVERSION_JOURS = 14;

/** Rejet d'une adresse : définitif, ou temporaire (trois de suite suspendent). */
export async function enregistrerRejet(emailBrut: string, definitif: boolean, motif: string, maintenant = new Date()): Promise<boolean> {
  const email = emailBrut.toLowerCase();
  const avant = await dbSite().adresseRejetee.findUnique({ where: { email } });
  const dejaSuspendue = Boolean(avant?.suspendueLe && !avant.leveeLe);
  const temporaires = definitif ? (avant?.rejetsTemporaires ?? 0) : (avant?.rejetsTemporaires ?? 0) + 1;
  const suspendre = !dejaSuspendue && (definitif || temporaires >= REJETS_TEMPORAIRES_MAX);
  await dbSite().adresseRejetee.upsert({
    where: { email },
    create: { email, rejetsTemporaires: temporaires, motif, ...(suspendre ? { suspendueLe: maintenant } : {}) },
    update: { rejetsTemporaires: temporaires, motif, ...(suspendre ? { suspendueLe: maintenant, leveeLe: null, leveePar: null } : {}) },
  });
  if (suspendre) {
    await notifierEquipe(
      {
        canal: "email",
        destinataires: await destinatairesAlertes(),
        objet: "Adresse email suspendue",
        texte: `L'adresse ${email} rejette les messages (${motif}). Les emails facultatifs et commerciaux ne lui sont plus envoyés. Vérifiez l'adresse du client ; vous pouvez lever la suspension dans Back-office → Emails.`,
        declencheur: "emailing",
      },
      `alerte-suspension:${email}:${maintenant.toISOString().slice(0, 10)}`,
    );
  }
  return suspendre;
}

export async function leverSuspension(emailBrut: string, par: string, maintenant = new Date()): Promise<void> {
  await dbSite().adresseRejetee.updateMany({ where: { email: emailBrut.toLowerCase() }, data: { leveeLe: maintenant, leveePar: par, rejetsTemporaires: 0 } });
}

async function suivreUn(envoi: Envoi, maintenant: Date): Promise<void> {
  const s = await registre.emailing().lireSuivi(envoi.connecteurEnvoiId!);
  if (s.etat === "rejete") {
    if (envoi.etat === "rejete") return;
    await dbSite().envoi.update({ where: { id: envoi.id }, data: { etat: "rejete", motif: s.motifRejet ?? "rejeté" } });
    await enregistrerRejet(envoi.destinataire, s.rejetDefinitif, s.motifRejet ?? "rejeté", maintenant);
    if (envoi.famille === "transactionnel") {
      await notifierEquipe(
        {
          canal: "email",
          destinataires: await destinatairesAlertes(),
          objet: "Email non remis",
          texte: `L'email « ${entreeDuModele(envoi.modele).libelle} » n'a pas pu être remis à ${envoi.destinataire} (${s.motifRejet ?? "rejeté"}). Contactez le client pour vérifier son adresse.`,
          declencheur: "emailing",
        },
        `alerte-rejet:${envoi.id}`,
      );
    }
    return;
  }
  const data: Prisma.EnvoiUpdateInput = {};
  if (s.etat === "remis" && envoi.etat === "envoye") {
    data.etat = "remis";
    data.remisLe = maintenant;
    await dbSite().adresseRejetee.updateMany({ where: { email: envoi.destinataire.toLowerCase(), rejetsTemporaires: { gt: 0 } }, data: { rejetsTemporaires: 0 } });
  }
  if (s.ouvertLe && !envoi.ouvertLe) data.ouvertLe = s.ouvertLe;
  if (Object.keys(data).length) await dbSite().envoi.update({ where: { id: envoi.id }, data });
}

/** Tâche `emails-suivi` (toutes les 15 minutes) : envois des trois derniers jours. */
export async function suivreEnvois(maintenant = new Date()): Promise<{ suivis: number }> {
  const envois = await dbSite().envoi.findMany({
    where: {
      famille: { not: "equipe" },
      connecteurEnvoiId: { not: null },
      envoyeLe: { gte: new Date(maintenant.getTime() - SUIVI_JOURS * JOUR) },
      OR: [{ etat: "envoye" }, { etat: "remis", ouvertLe: null }],
    },
    orderBy: { envoyeLe: "desc" },
    take: 500,
  });
  for (const e of envois) {
    try {
      await suivreUn(e, maintenant);
    } catch (err) {
      if (!estErreurConnecteur(err)) throw err;
    }
  }
  return { suivis: envois.length };
}

export type Statistiques = { envoyes: number; remis: number; ouverts: number; commandes: number };

/** Résultats d'un scénario ou d'une campagne (FR-036). */
export async function statistiques(filtre: { scenario?: ScenarioEmail; campagneId?: string }, depuis: Date): Promise<Statistiques> {
  const envois = await dbSite().envoi.findMany({
    where: { ...filtre, etat: { in: ["envoye", "remis", "rejete"] }, envoyeLe: { gte: depuis } },
    select: { etat: true, ouvertLe: true, compteId: true, envoyeLe: true, references: true },
  });
  let commandes = 0;
  for (const e of envois) {
    if (!e.compteId || !e.envoyeLe) continue;
    const fin = new Date(e.envoyeLe.getTime() + CONVERSION_JOURS * JOUR);
    const passees = await dbSite().commandeSite.findMany({
      where: { compteId: e.compteId, etape: "terminee", modifieLe: { gt: e.envoyeLe, lte: fin } },
      select: { lignes: true },
    });
    // Pour une relance de consommable : une commande contenant l'article relancé.
    const codes = e.references.map((r) => r.split("@")[0]!);
    const suivie = codes.length ? passees.some((c) => codes.some((code) => JSON.stringify(c.lignes).includes(`"${code}"`))) : passees.length > 0;
    if (suivie) commandes++;
  }
  return {
    envoyes: envois.length,
    remis: envois.filter((e) => e.etat === "remis").length,
    ouverts: envois.filter((e) => e.ouvertLe).length,
    commandes,
  };
}
