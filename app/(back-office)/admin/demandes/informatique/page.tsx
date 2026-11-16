import type { Metadata } from "next";
import { compterDemandesInformatique, ETATS_INFORMATIQUE, listerDemandesInformatique, type EtatInformatique } from "@/domaine/demandes/suivi";
import { CRENEAUX, DELAIS, EXAMENS_LOGICIELS, INTERETS, LOGICIELS, PRESTATAIRES } from "@/domaine/informatique/questionnaire";
import { peut } from "@/lib/droits";
import { exigerEquipe } from "@/lib/roles";
import { Kicker, Retour } from "@/ui";
import { actionSuivreInformatique } from "../actions";
import { Onglets } from "../Onglets";
import { SuiviForm } from "../SuiviForm";

export const metadata: Metadata = { title: "Demandes Informatique médicale" };

type Coordonnees = { nom: string; cabinet: string; codePostal: string; email: string; telephone: string };
type Logiciel = { choix: string; precision?: string };

const libelle = <T extends Record<string, unknown>>(liste: T, v: string) => {
  const x = liste[v as keyof T];
  return typeof x === "string" ? x : typeof x === "object" && x && "libelle" in x ? String((x as { libelle: string }).libelle) : v;
};

// Demandes du questionnaire « Décrire mon besoin » (F27, US5, FR-034, FR-035) : nouvelle → en
// cours → transmise à 2i → close, note interne, journal. Aucune donnée de patient.
export default async function DemandesInformatique({ searchParams }: { searchParams: Promise<{ etat?: string; ok?: string; erreur?: string }> }) {
  const { etat: brut, ...r } = await searchParams;
  const etat = brut === "tous" || brut === "non_traitees" || (brut && brut in ETATS_INFORMATIQUE) ? (brut as EtatInformatique | "tous" | "non_traitees") : "non_traitees";
  const { role } = await exigerEquipe();
  const [demandes, comptes] = await Promise.all([listerDemandesInformatique(etat), compterDemandesInformatique()]);
  const retour = `/admin/demandes/informatique?etat=${etat}`;
  const etats = { non_traitees: "À traiter", ...ETATS_INFORMATIQUE };
  const nombres = { ...comptes, non_traitees: (comptes.nouvelle ?? 0) + (comptes.en_cours ?? 0) };
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Demandes</Kicker>
      <h1 className="text-h2 font-light">Informatique médicale</h1>
      <p className="text-muted">Rappelez le médecin pour préciser son besoin, puis transmettez la demande à Indoor Informatique (2i).</p>
      <Onglets chemin="/admin/demandes/informatique" actif={etat} etats={etats} comptes={nombres} total={Object.values(comptes).reduce<number>((t, n) => t + (n ?? 0), 0)} />
      <Retour {...r} />
      {!demandes.length ? <p className="text-muted">Aucune demande dans cette liste.</p> : null}
      <ul className="flex list-none flex-col gap-3 p-0">
        {demandes.map((d) => {
          const c = d.coordonnees as Coordonnees;
          const logiciels = d.logiciels as Record<string, Logiciel>;
          return (
            <li key={d.id} id={`demande-${d.id}`} aria-label={`Demande de ${c.cabinet}`} className="ec-card flex scroll-mt-24 flex-col gap-1">
              <p className="font-semibold">
                {c.cabinet} ({c.codePostal}) · {d.interets.map((i) => libelle(INTERETS, i)).join(", ")}
              </p>
              <p className="text-small text-muted">
                {d.creeLe.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} · {ETATS_INFORMATIQUE[d.etat]}
                {d.traitePar ? ` · suivi par ${d.traitePar}` : ""}
                {d.compteId ? " · client connecté" : ""}
              </p>
              <p className="break-all">
                {c.nom} · <a href={`mailto:${c.email}`}>{c.email}</a> · <a href={`tel:${c.telephone.replace(/\s/g, "")}`}>{c.telephone}</a> · à rappeler{" "}
                {libelle(CRENEAUX, d.creneau).toLowerCase()} · délai : {libelle(DELAIS, d.delai).toLowerCase()}
              </p>
              <p>
                {d.medecins} médecin{d.medecins > 1 ? "s" : ""}, {d.postes} poste{d.postes > 1 ? "s" : ""}, secrétariat sur place : {d.secretariat ? "oui" : "non"} · prestataire actuel :{" "}
                {libelle(PRESTATAIRES, d.prestataireActuel).toLowerCase()}
              </p>
              <p className="text-small">
                Logiciels :{" "}
                {Object.entries(EXAMENS_LOGICIELS)
                  .map(([k, examen]) => `${examen} : ${logiciels[k]?.choix === "autre" ? logiciels[k]?.precision : libelle(LOGICIELS, logiciels[k]?.choix ?? "")}`)
                  .join(" · ")}
              </p>
              <SuiviForm
                action={actionSuivreInformatique}
                id={d.id}
                etat={d.etat}
                etats={ETATS_INFORMATIQUE}
                notes={d.notes}
                modifieLe={d.modifieLe}
                retour={retour}
                modifiable={peut(role, "demandes", "modifier")}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
