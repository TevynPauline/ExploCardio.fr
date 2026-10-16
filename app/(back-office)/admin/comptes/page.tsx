import type { Metadata } from "next";
import Link from "next/link";
import { dbSite } from "@/lib/db/site";
import { Kicker } from "@/ui";
import { LIBELLES_STATUT } from "@/ui/comptes/libelles";

export const metadata: Metadata = { title: "Comptes professionnels" };

const ONGLETS = ["en_attente", "valide", "suspendu", "refuse", "email_a_confirmer"] as const;

// Liste des comptes (US2-1) : en attente d'abord ; identité, numéro, cabinet, date.
export default async function Comptes({ searchParams }: { searchParams: Promise<{ statut?: string; q?: string }> }) {
  const { statut: s = "en_attente", q = "" } = await searchParams;
  const statut = (ONGLETS as readonly string[]).includes(s) ? (s as (typeof ONGLETS)[number]) : "en_attente";
  const recherche = q.trim();
  const comptes = await dbSite().compteClient.findMany({
    where: {
      statut,
      estDemonstration: undefined,
      ...(recherche
        ? {
            OR: [
              { rpps: { contains: recherche } },
              { siret: { contains: recherche } },
              { nomCabinet: { contains: recherche, mode: "insensitive" } },
              { utilisateur: { email: { contains: recherche, mode: "insensitive" } } },
              { utilisateur: { name: { contains: recherche, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { utilisateur: true },
    orderBy: { creeLe: statut === "en_attente" ? "asc" : "desc" },
    take: 200,
  });
  const compteurs = await dbSite().compteClient.groupBy({ by: ["statut"], _count: true });
  const n = (x: string) => compteurs.find((c) => c.statut === x)?._count ?? 0;
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Comptes</Kicker>
      <h1 className="text-h2 font-light">Comptes professionnels</h1>
      <nav aria-label="Statuts" className="flex flex-wrap gap-2">
        {ONGLETS.map((o) => (
          <Link key={o} href={`?statut=${o}`} aria-current={o === statut ? "page" : undefined} className={`ec-btn ${o === statut ? "ec-btn--primary" : "ec-btn--secondary"}`}>
            {LIBELLES_STATUT[o]} ({n(o)})
          </Link>
        ))}
        <Link href="/admin/comptes/demandes" className="ec-btn ec-btn--secondary">Demandes</Link>
        <Link href="/admin/comptes/rgpd" className="ec-btn ec-btn--secondary">Données personnelles</Link>
        <Link href="/admin/comptes/reglages" className="ec-btn ec-btn--secondary">Réglages</Link>
      </nav>
      <form method="get" className="flex max-w-xl gap-2">
        <input type="hidden" name="statut" value={statut} />
        <label htmlFor="q" className="sr-only">Rechercher un compte</label>
        <input id="q" name="q" defaultValue={recherche} placeholder="Nom, email, cabinet, RPPS ou SIRET" className="min-h-11 w-full rounded-sm border border-muted bg-surface px-3" />
        <button type="submit" className="ec-btn ec-btn--secondary">Rechercher</button>
      </form>
      {comptes.length === 0 ? (
        <p className="text-muted">Aucun compte dans cette liste.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Comptes au statut « {LIBELLES_STATUT[statut]} »</caption>
            <thead>
              <tr className="border-b border-line text-small text-muted">
                <th scope="col" className="py-2 pr-4 font-medium">Professionnel</th>
                <th scope="col" className="py-2 pr-4 font-medium">RPPS ou SIRET</th>
                <th scope="col" className="py-2 pr-4 font-medium">Cabinet</th>
                <th scope="col" className="py-2 font-medium">Inscription</th>
              </tr>
            </thead>
            <tbody>
              {comptes.map((c) => (
                <tr key={c.id} className="border-b border-line">
                  <th scope="row" className="py-2 pr-4 font-normal">
                    <Link href={`/admin/comptes/${c.id}`} className="inline-flex min-h-11 items-center font-medium">
                      {c.utilisateur.civilite ? `${c.utilisateur.civilite} ` : ""}{c.utilisateur.name}
                    </Link>
                    <span className="block text-small text-muted">{c.utilisateur.email}</span>
                  </th>
                  <td className="py-2 pr-4">{c.rpps ? `RPPS ${c.rpps}` : `SIRET ${c.siret}`}</td>
                  <td className="py-2 pr-4">{c.nomCabinet}</td>
                  <td className="py-2">{c.creeLe.toLocaleDateString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
