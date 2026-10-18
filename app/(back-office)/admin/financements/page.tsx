import type { Metadata } from "next";
import Link from "next/link";
import type { StatutDemandeFinancement } from "@generated/site/client";
import { compterDemandes, listerDemandes, STATUTS_FINANCEMENT } from "@/domaine/financement/administration";
import { LIBELLES_STATUT_FINANCEMENT } from "@/domaine/financement/demande";
import { euros } from "@/lib/montants";
import { Kicker } from "@/ui";

export const metadata: Metadata = { title: "Demandes de financement" };

// Liste des demandes par statut (FR-039) : les plus anciennes « reçues » d'abord.
export default async function Financements({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const { statut: s = "recue" } = await searchParams;
  const statut = ((STATUTS_FINANCEMENT as readonly string[]).includes(s) ? s : "recue") as StatutDemandeFinancement;
  const [demandes, compteurs] = await Promise.all([listerDemandes(statut), compterDemandes()]);
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Financements</Kicker>
      <h1 className="text-h2 font-light">Demandes de financement</h1>
      <nav aria-label="Statuts" className="flex flex-wrap gap-2">
        {STATUTS_FINANCEMENT.map((o) => (
          <Link key={o} href={`?statut=${o}`} aria-current={o === statut ? "page" : undefined} className={`ec-btn ${o === statut ? "ec-btn--primary" : "ec-btn--secondary"}`}>
            {LIBELLES_STATUT_FINANCEMENT[o]} ({compteurs[o]})
          </Link>
        ))}
      </nav>
      {demandes.length === 0 ? (
        <p className="text-muted">Aucune demande dans cette liste.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Demandes au statut « {LIBELLES_STATUT_FINANCEMENT[statut]} »</caption>
            <thead>
              <tr className="border-b border-line text-small text-muted">
                <th scope="col" className="py-2 pr-4 font-medium">Client</th>
                <th scope="col" className="py-2 pr-4 font-medium">Équipements</th>
                <th scope="col" className="py-2 pr-4 font-medium">Durée</th>
                <th scope="col" className="py-2 pr-4 font-medium">Mensualité indicative</th>
                <th scope="col" className="py-2 font-medium">Reçue le</th>
              </tr>
            </thead>
            <tbody>
              {demandes.map((d) => {
                const cabinet = d.cabinet as { nom?: string };
                const equipements = d.equipements as { nom?: string; defaultCode: string; quantite: number }[];
                return (
                  <tr key={d.id} className="border-b border-line">
                    <th scope="row" className="py-2 pr-4 font-normal">
                      <Link href={`/admin/financements/${d.id}`} className="inline-flex min-h-11 items-center font-medium">
                        {cabinet.nom || d.compte.utilisateur.name}
                      </Link>
                      <span className="block text-small text-muted">{d.compte.utilisateur.email}</span>
                    </th>
                    <td className="py-2 pr-4">{equipements.map((e) => `${e.nom ?? e.defaultCode} × ${e.quantite}`).join(", ")}</td>
                    <td className="py-2 pr-4">{d.dureeMois} mois</td>
                    <td className="py-2 pr-4">{d.mensualiteIndicativeHt ? `${euros(d.mensualiteIndicativeHt)} HT` : "—"}</td>
                    <td className="py-2">{d.creeLe.toLocaleDateString("fr-FR")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
