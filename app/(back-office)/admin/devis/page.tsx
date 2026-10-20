import type { Metadata } from "next";
import { dbSite } from "@/lib/db/site";
import { Kicker } from "@/ui";

export const metadata: Metadata = { title: "Demandes de devis" };

type Demandeur = { nom: string; email: string; telephone: string | null; cabinet: string | null; besoin: string; message: string | null };

// Demandes de devis (ECG de repos, F03) et d'intérêt pour l'hébergement des données de santé
// (F12, FR-024), en lecture seule ; leur traitement complet arrive avec le back-office (F13).
export default async function Devis() {
  const demandes = await dbSite().demandeDevis.findMany({ orderBy: { creeLe: "desc" }, take: 100 });
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Demandes</Kicker>
      <h1 className="text-h2 font-light">Demandes de devis et d’intérêt</h1>
      {!demandes.length ? <p className="text-muted">Aucune demande pour le moment.</p> : null}
      <ul className="flex list-none flex-col gap-3 p-0">
        {demandes.map((d) => {
          const p = d.demandeur as Demandeur;
          return (
            <li key={d.id} aria-label={`Demande de ${p.email}`} className="ec-card flex flex-col gap-1">
              <p className="font-semibold">{d.objet}</p>
              <p className="text-small text-muted">
                {d.creeLe.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} · {d.statut}
                {d.opportuniteRef ? ` · opportunité ${d.opportuniteRef}` : ""}
              </p>
              <p className="break-all">
                {p.nom} · {p.email}
                {p.telephone ? ` · ${p.telephone}` : ""}
                {p.cabinet ? ` · ${p.cabinet}` : ""}
              </p>
              <p>{p.besoin}</p>
              {p.message ? <p className="text-small whitespace-pre-line">{p.message}</p> : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
