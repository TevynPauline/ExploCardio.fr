import type { Metadata } from "next";
import { compterDevis, ETATS_DEVIS, listerDevis, type EtatDevis } from "@/domaine/demandes/suivi";
import { peut } from "@/lib/droits";
import { exigerEquipe } from "@/lib/roles";
import { Kicker, Retour } from "@/ui";
import { actionSuivreDevis } from "../demandes/actions";
import { Onglets } from "../demandes/Onglets";
import { SuiviForm } from "../demandes/SuiviForm";
import { RappelPatient } from "@/ui/admin";

export const metadata: Metadata = { title: "Demandes de devis" };

type Demandeur = { nom: string; email: string; telephone: string | null; cabinet: string | null; besoin: string; message: string | null };

// Demandes de devis (ECG de repos, F03) et d'intérêt pour l'hébergement des données de santé
// (F12, FR-024) ; suivi par l'équipe : état, note interne, qui a traité (F13, US6).
export default async function Devis({ searchParams }: { searchParams: Promise<{ etat?: string; ok?: string; erreur?: string }> }) {
  const { etat: brut, ...r } = await searchParams;
  const etat = brut === "tous" || (brut && brut in ETATS_DEVIS) ? (brut as EtatDevis | "tous") : "recue";
  const { role } = await exigerEquipe();
  const [demandes, comptes] = await Promise.all([listerDevis(etat), compterDevis()]);
  const retour = `/admin/devis?etat=${etat}`;
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Demandes</Kicker>
      <h1 className="text-h2 font-light">Demandes de devis et d’intérêt</h1>
      <Onglets chemin="/admin/devis" actif={etat} etats={ETATS_DEVIS} comptes={comptes} />
      <Retour {...r} />
      <RappelPatient />
      {!demandes.length ? <p className="text-muted">Aucune demande dans cette liste.</p> : null}
      <ul className="flex list-none flex-col gap-3 p-0">
        {demandes.map((d) => {
          const p = d.demandeur as Demandeur;
          return (
            <li key={d.id} id={`demande-${d.id}`} aria-label={`Demande de ${p.email}`} className="ec-card flex scroll-mt-24 flex-col gap-1">
              <p className="font-semibold">{d.objet}</p>
              <p className="text-small text-muted">
                {d.creeLe.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} · {ETATS_DEVIS[d.statut]}
                {d.opportuniteRef ? ` · opportunité ${d.opportuniteRef}` : ""}
                {d.traitePar ? ` · suivi par ${d.traitePar}` : ""}
              </p>
              <p className="break-all">
                {p.nom} · <a href={`mailto:${p.email}`}>{p.email}</a>
                {p.telephone ? ` · ${p.telephone}` : ""}
                {p.cabinet ? ` · ${p.cabinet}` : ""}
              </p>
              <p>{p.besoin}</p>
              {p.message ? <p className="text-small whitespace-pre-line">{p.message}</p> : null}
              <SuiviForm action={actionSuivreDevis} id={d.id} etat={d.statut} etats={ETATS_DEVIS} notes={d.notes} modifieLe={d.modifieLe} retour={retour} modifiable={peut(role, "demandes", "modifier")} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
