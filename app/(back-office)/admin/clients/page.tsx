import type { Metadata } from "next";
import Link from "next/link";
import { compterParStatut, listerClients, STATUTS_LISTE, type StatutListe } from "@/domaine/clients";
import { dbSite } from "@/lib/db/site";
import { exigerDroit, peut } from "@/lib/droits";
import { Button, Champ, Kicker } from "@/ui";
import { LIBELLES_STATUT } from "@/ui/comptes/libelles";

export const metadata: Metadata = { title: "Clients" };

const LIBELLES: Record<StatutListe, string> = { ...(LIBELLES_STATUT as Record<string, string>), en_attente: "À valider", tous: "Tous" } as Record<StatutListe, string>;

// Clients (F13, US1, US5, D6) : comptes à valider (prioritaires en tête, puis les plus anciens),
// recherche par nom, cabinet, téléphone, email, SIRET ou SIREN ; numéros à vérifier (F16) ;
// accès à la fiche complète.
export default async function Clients({ searchParams }: { searchParams: Promise<{ statut?: string; q?: string; numero?: string }> }) {
  const { role } = await exigerDroit("clients", "voir");
  const { statut: s, q = "", numero: n } = await searchParams;
  const recherche = q.trim();
  // F16 : les comptes ne passent plus par « à valider » ; liste de tous les comptes par défaut.
  const statut: StatutListe = (STATUTS_LISTE as readonly string[]).includes(s ?? "") ? (s as StatutListe) : "tous";
  const numero = n === "a_verifier" ? "a_verifier" : undefined;
  const [clients, compteurs, aVerifier] = await Promise.all([
    listerClients(statut, recherche, numero),
    compterParStatut(),
    dbSite().compteClient.count({ where: { numeroVerification: "a_verifier", statut: { not: "supprime" } } }),
  ]);
  const total = Object.entries(compteurs).filter(([k]) => k !== "supprime").reduce((a, [, n]) => a + n, 0);
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Clients</Kicker>
      <h1 className="text-h2 font-light">Clients</h1>
      <form role="search" method="get" className="flex max-w-2xl flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <Champ id="q" name="q" libelle="Nom, cabinet, téléphone, email, SIRET ou SIREN" defaultValue={recherche} autoComplete="off" />
        </div>
        <input type="hidden" name="statut" value={recherche ? statut : "tous"} />
        <Button type="submit">Rechercher</Button>
      </form>
      <nav aria-label="Statuts des comptes" className="flex flex-wrap gap-2">
        <Link href="?statut=tous&numero=a_verifier" aria-current={numero ? "page" : undefined} className={`ec-btn ${numero ? "ec-btn--primary" : "ec-btn--secondary"}`}>
          Numéros à vérifier ({aVerifier})
        </Link>
        {STATUTS_LISTE.filter((o) => o !== "en_attente" || (compteurs.en_attente ?? 0) > 0).map((o) => (
          <Link key={o} href={`?statut=${o}${recherche ? `&q=${encodeURIComponent(recherche)}` : ""}`} aria-current={!numero && o === statut ? "page" : undefined} className={`ec-btn ${!numero && o === statut ? "ec-btn--primary" : "ec-btn--secondary"}`}>
            {LIBELLES[o]} ({o === "tous" ? total : (compteurs[o] ?? 0)})
          </Link>
        ))}
        {peut(role, "clients", "modifier") ? <Link href="/admin/comptes/demandes" className="ec-btn ec-btn--secondary">Changements de numéro</Link> : null}
        {peut(role, "comptes.rgpd", "voir") ? <Link href="/admin/comptes/rgpd" className="ec-btn ec-btn--secondary">Données personnelles</Link> : null}
      </nav>
      {clients.length === 0 ? (
        <p role="status" className="text-muted">{recherche ? `Aucun client ne correspond à « ${recherche} ».` : "Aucun compte dans cette liste."}</p>
      ) : (
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Liste des clients">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Clients : {LIBELLES[statut]}</caption>
            <thead>
              <tr className="border-b border-line text-small text-muted">
                <th scope="col" className="py-2 pr-4 font-medium">Professionnel</th>
                <th scope="col" className="py-2 pr-4 font-medium">SIRET ou SIREN</th>
                <th scope="col" className="py-2 pr-4 font-medium">Cabinet</th>
                <th scope="col" className="py-2 pr-4 font-medium">Statut</th>
                <th scope="col" className="py-2 font-medium">Inscription</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.id} className="border-b border-line">
                  <th scope="row" className="py-2 pr-4 font-normal">
                    <Link href={`/admin/clients/${c.id}`} className="inline-flex min-h-11 items-center font-medium">
                      {c.civilite ? `${c.civilite} ` : ""}{c.nom}
                    </Link>
                    {c.prioritaire ? <span className="ec-badge ml-2">Prioritaire</span> : null}
                    <span className="block break-all text-small text-muted">{c.email}</span>
                  </th>
                  <td className="py-2 pr-4">{c.numero}</td>
                  <td className="py-2 pr-4">{c.cabinet}</td>
                  <td className="py-2 pr-4">{LIBELLES_STATUT[c.statut]}</td>
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
