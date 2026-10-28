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
        Messages laissés sur la page d’attente de www.explocardio.fr : à prévenir de l’ouverture du site et, s’il y a un commentaire, à recontacter. Aucun email ne leur a été envoyé automatiquement.
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
      <ul className="flex list-none flex-col gap-3 p-0">
        {inscriptions.map((i) => (
          <li key={i.id} aria-label={`Inscription de ${i.email}`} className="ec-card flex flex-col gap-1">
            <p className="font-semibold">{i.nom}</p>
            <p className="text-small text-muted">
              Dernier envoi le {i.modifieLe.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" })}
            </p>
            <p className="break-all">
              <a href={`mailto:${i.email}`}>{i.email}</a>
              {i.telephone ? (
                <>
                  {" · "}
                  <a href={`tel:${i.telephone.replace(/\s/g, "")}`}>{i.telephone}</a>
                </>
              ) : null}
            </p>
            {i.commentaire ? <p className="whitespace-pre-line break-words">{i.commentaire}</p> : null}
            {modifiable ? (
              <form action={actionSupprimerInscriptionOuverture} className="mt-2">
                <input type="hidden" name="id" value={i.id} />
                <button type="submit" className="ec-btn ec-btn--secondary" aria-label={`Supprimer l’inscription de ${i.email}`}>
                  Supprimer
                </button>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
