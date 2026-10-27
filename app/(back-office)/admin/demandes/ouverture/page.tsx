import type { Metadata } from "next";
import { listerInscriptionsOuverture } from "@/domaine/ouverture";
import { peut } from "@/lib/droits";
import { exigerEquipe } from "@/lib/roles";
import { Kicker, Retour } from "@/ui";
import { actionSupprimerInscriptionOuverture } from "./actions";

export const metadata: Metadata = { title: "Inscriptions à l’ouverture" };

// Inscriptions de la page d'attente (F17, FR-008) : liste, export CSV, suppression (RGPD).
export default async function InscriptionsOuverture({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const r = await searchParams;
  const { role } = await exigerEquipe();
  const inscriptions = await listerInscriptionsOuverture();
  const modifiable = peut(role, "demandes", "modifier");
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Demandes</Kicker>
      <h1 className="text-h2 font-light">Inscriptions à l’ouverture</h1>
      <p className="text-muted">
        Personnes inscrites depuis la page d’attente de www.explocardio.fr pour être prévenues de l’ouverture du site. Aucun email ne leur a encore été envoyé.
      </p>
      <Retour {...r} />
      <p className="flex flex-wrap items-center gap-4">
        <span className="font-medium">
          {inscriptions.length} inscription{inscriptions.length > 1 ? "s" : ""}
        </span>
        {inscriptions.length ? (
          <a href="/admin/demandes/ouverture/export" className="ec-btn ec-btn--secondary" download>
            Exporter en CSV
          </a>
        ) : null}
      </p>
      {!inscriptions.length ? <p className="text-muted">Aucune inscription pour le moment.</p> : null}
      {inscriptions.length ? (
        <div role="region" aria-label="Tableau des inscriptions" tabIndex={0} className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="py-2 pr-4">Date</th>
                <th scope="col" className="py-2 pr-4">Nom</th>
                <th scope="col" className="py-2 pr-4">Email</th>
                {modifiable ? <th scope="col" className="py-2"><span className="sr-only">Actions</span></th> : null}
              </tr>
            </thead>
            <tbody>
              {inscriptions.map((i) => (
                <tr key={i.id} className="border-b border-line">
                  <td className="py-2 pr-4 whitespace-nowrap">{i.creeLe.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="py-2 pr-4">{i.nom}</td>
                  <td className="py-2 pr-4 break-all">
                    <a href={`mailto:${i.email}`}>{i.email}</a>
                  </td>
                  {modifiable ? (
                    <td className="py-2">
                      <form action={actionSupprimerInscriptionOuverture}>
                        <input type="hidden" name="id" value={i.id} />
                        <button type="submit" className="ec-btn ec-btn--secondary" aria-label={`Supprimer l’inscription de ${i.email}`}>
                          Supprimer
                        </button>
                      </form>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
