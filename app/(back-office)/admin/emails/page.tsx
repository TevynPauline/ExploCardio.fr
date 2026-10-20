import type { Metadata } from "next";
import type { EtatEnvoi, FamilleEmail, Prisma } from "@generated/site/client";
import { CATALOGUE, TYPES_FACULTATIFS, type EntreeCatalogue } from "@/domaine/emailing/catalogue";
import { dbSite } from "@/lib/db/site";
import { exigerAdministrateur } from "@/lib/roles";
import { Button, Card, Kicker, Retour } from "@/ui";
import { actionDesinscriptionEquipe, actionLeverSuspension } from "./actions";
import { dateCourte } from "./campagnes/etats";
import { NavEmails } from "./NavEmails";

export const metadata: Metadata = { title: "Suivi des emails" };

const ETATS: Record<EtatEnvoi, string> = { programme: "Programmé", envoye: "Envoyé", remis: "Remis", rejete: "Rejeté", annule: "Non envoyé", bloque: "Bloqué" };
const FAMILLES: Record<FamilleEmail, string> = { transactionnel: "Toujours envoyé", service: "Service", commercial: "Newsletter", equipe: "Équipe" };
const select = "min-h-11 w-full max-w-full rounded-sm border border-muted bg-surface px-2";

const libelle = (modele: string) =>
  (CATALOGUE as Record<string, EntreeCatalogue>)[modele]?.libelle ?? (modele.startsWith("notification_equipe") ? "Notification d’équipe" : modele);

// Suivi des envois (F10, US8, FR-035, FR-036, D10) : emails d'un client, leur état de remise et
// le motif d'un non-envoi ; suspension d'une adresse qui rejette les messages ; désinscription
// reçue par réponse à un email, enregistrée par l'équipe.
export default async function SuiviEmails({ searchParams }: { searchParams: Promise<{ q?: string; etat?: string; ok?: string; erreur?: string }> }) {
  await exigerAdministrateur();
  const r = await searchParams;
  const q = r.q?.trim().slice(0, 120) ?? "";
  const etat = r.etat && r.etat in ETATS ? (r.etat as EtatEnvoi) : undefined;
  const where: Prisma.EnvoiWhereInput = {
    ...(q ? { destinataire: { contains: q, mode: "insensitive" } } : {}),
    ...(etat ? { etat } : {}),
  };
  const [envois, rejet, suspendues] = await Promise.all([
    dbSite().envoi.findMany({ where, orderBy: { creeLe: "desc" }, take: 100 }),
    q.includes("@") ? dbSite().adresseRejetee.findUnique({ where: { email: q.toLowerCase() } }) : null,
    dbSite().adresseRejetee.findMany({ where: { suspendueLe: { not: null }, leveeLe: null }, orderBy: { suspendueLe: "desc" }, take: 20 }),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Emails</Kicker>
      <h1 className="text-h2 font-light">Suivi des envois</h1>
      <NavEmails actif="/admin/emails" />
      <Retour ok={r.ok} erreur={r.erreur} />

      <form method="get" className="flex flex-wrap items-end gap-3" role="search">
        <label className="flex min-w-64 flex-1 flex-col gap-1 text-small font-medium">
          Adresse email du client (ou une partie)
          <input name="q" defaultValue={q} className="min-h-11 rounded-sm border border-muted bg-surface px-3 font-normal" />
        </label>
        <label className="flex flex-col gap-1 text-small font-medium">
          État
          <select name="etat" defaultValue={etat ?? ""} className={select}>
            <option value="">Tous</option>
            {Object.entries(ETATS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </label>
        <Button type="submit" variante="secondaire">Rechercher</Button>
      </form>

      {suspendues.length ? (
        <Card className="flex flex-col gap-2">
          <h2 className="text-h3 font-semibold">Adresses suspendues</h2>
          <p className="text-small text-muted">Ces adresses rejettent les messages : plus aucun email facultatif ni commercial ne leur est envoyé.</p>
          <ul className="flex list-none flex-col gap-1 p-0">
            {suspendues.map((s) => (
              <li key={s.email} className="text-small break-all">{s.email} · {s.motif ?? "rejets"} · depuis le {dateCourte(s.suspendueLe)}</li>
            ))}
          </ul>
        </Card>
      ) : null}

      {q.includes("@") ? (
        <Card className="flex flex-col gap-3">
          <h2 className="text-h3 font-semibold break-all">Adresse {q.toLowerCase()}</h2>
          {rejet?.suspendueLe && !rejet.leveeLe ? (
            <form action={actionLeverSuspension} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="email" value={q.toLowerCase()} />
              <p>Suspendue le {dateCourte(rejet.suspendueLe)} ({rejet.motif ?? "rejets"}).</p>
              <Button type="submit" variante="secondaire">Lever la suspension</Button>
            </form>
          ) : null}
          <form action={actionDesinscriptionEquipe} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="email" value={q.toLowerCase()} />
            <label className="flex flex-col gap-1 text-small font-medium">
              Désinscription reçue par réponse à un email
              <select name="objet" className={select} defaultValue="newsletter">
                <option value="newsletter">Newsletter</option>
                {TYPES_FACULTATIFS.map((t) => (
                  <option key={t.cle} value={t.cle}>{t.libelle}</option>
                ))}
              </select>
            </label>
            <Button type="submit" variante="secondaire">Enregistrer la désinscription</Button>
          </form>
        </Card>
      ) : null}

      <Card>
        <h2 className="text-h3 font-semibold">{envois.length} envoi{envois.length > 1 ? "s" : ""}{envois.length === 100 ? " (les 100 plus récents)" : ""}</h2>
        <div className="mt-3 overflow-x-auto" tabIndex={0} role="region" aria-label="Liste des envois (défilement horizontal)">
          <table className="w-full text-left text-small">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="py-2 pr-3">Date</th>
                <th scope="col" className="py-2 pr-3">Destinataire</th>
                <th scope="col" className="py-2 pr-3">Email</th>
                <th scope="col" className="py-2 pr-3">Famille</th>
                <th scope="col" className="py-2 pr-3">État</th>
              </tr>
            </thead>
            <tbody>
              {envois.map((e) => (
                <tr key={e.id} className="border-b border-line align-top">
                  <td className="py-2 pr-3 whitespace-nowrap">{dateCourte(e.envoyeLe ?? e.programmeLe)}</td>
                  <td className="py-2 pr-3 break-all">{e.destinataire}</td>
                  <td className="py-2 pr-3">{e.objet ?? libelle(e.modele)}<span className="block text-muted">{e.declencheur}</span></td>
                  <td className="py-2 pr-3">{FAMILLES[e.famille]}</td>
                  <td className="py-2 pr-3">
                    {ETATS[e.etat]}
                    {e.ouvertLe ? " · ouvert" : ""}
                    {e.motif && e.etat !== "envoye" && e.etat !== "remis" ? <span className="block text-muted">{e.motif}</span> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
