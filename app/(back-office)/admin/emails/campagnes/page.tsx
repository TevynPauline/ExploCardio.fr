import type { Metadata } from "next";
import Link from "next/link";
import { TYPES_CAMPAGNE } from "@/domaine/emailing/campagnes";
import { dbSite } from "@/lib/db/site";
import { exigerAdministrateur } from "@/lib/roles";
import { Card, Kicker, Retour } from "@/ui";
import { actionCreerCampagne } from "../actions";
import { dateCourte as date, ETATS_CAMPAGNE } from "./etats";
import { FormulaireCampagne } from "./FormulaireCampagne";
import { NavEmails } from "../NavEmails";

export const metadata: Metadata = { title: "Campagnes" };

// Campagnes commerciales (F10, US3, D7) : réservées aux abonnés confirmés à la newsletter.
export default async function Campagnes({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  await exigerAdministrateur();
  const r = await searchParams;
  const campagnes = await dbSite().campagne.findMany({ orderBy: { creeLe: "desc" }, take: 50 });
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Emails</Kicker>
      <h1 className="text-h2 font-light">Campagnes</h1>
      <NavEmails actif="/admin/emails/campagnes" />
      <p className="text-muted">Promotions, ventes flash et nouveautés : envoyées uniquement aux abonnés confirmés à la newsletter, les jours ouvrés, avec un lien de désinscription.</p>
      <Retour {...r} />
      <Card className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">Campagnes récentes</h2>
        {!campagnes.length ? <p className="text-muted">Aucune campagne pour l’instant.</p> : null}
        <ul className="flex list-none flex-col gap-2 p-0">
          {campagnes.map((c) => (
            <li key={c.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
              <Link href={`/admin/emails/campagnes/${c.id}`} className="inline-flex min-h-11 items-center font-medium">{c.objet}</Link>
              <span className="text-small text-muted">
                {TYPES_CAMPAGNE[c.type]} · {ETATS_CAMPAGNE[c.etat]}
                {c.programmeePour ? ` · ${date(c.programmeePour)}` : ""}
                {c.destinataires !== null ? ` · ${c.destinataires} abonné${c.destinataires > 1 ? "s" : ""}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">Nouvelle campagne</h2>
        <FormulaireCampagne action={actionCreerCampagne} bouton="Enregistrer le brouillon" />
      </Card>
    </div>
  );
}
