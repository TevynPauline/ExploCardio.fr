import type { Metadata } from "next";
import { paliersEnClair } from "@/domaine/fidelite/droits";
import { rechercherAssistance, reglesEnVigueur, RESULTATS_MAX } from "@/domaine/fidelite/equipe";
import { euros } from "@/lib/montants";
import { Button, Card, Champ, Kicker } from "@/ui";

export const metadata: Metadata = { title: "Assistance" };

const date = (d: Date) => d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });

// Assistance (F06, US6) : lecture seule. Statut des droits d'un client avant de le prendre en
// charge (SC-007). Les ajustements et le programme se règlent dans Odoo (FR-027, FR-029).
export default async function Assistance({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const [{ fiches, indisponible }, regles] = await Promise.all([rechercherAssistance(q), reglesEnVigueur()]);
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Assistance</Kicker>
      <h1 className="text-h2 font-light">Droits d’assistance des clients</h1>
      <p className="text-muted">Lecture seule : les droits, les ajustements et les règles du programme se gèrent dans Odoo.</p>
      <form role="search" className="flex max-w-2xl flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <Champ id="recherche" name="q" libelle="Nom, cabinet, email, téléphone, RPPS ou SIRET" defaultValue={q} autoComplete="off" />
        </div>
        <Button type="submit">Rechercher</Button>
      </form>
      {indisponible ? <p role="status" className="ec-box--info p-4">Odoo est momentanément injoignable : les droits ne peuvent pas être affichés.</p> : null}
      {q.trim().length >= 2 && !fiches.length ? <p role="status">Aucun client ne correspond à « {q} ».</p> : null}
      {fiches.length ? (
        <section aria-label="Résultats" className="flex flex-col gap-3">
          {fiches.length === RESULTATS_MAX ? <p className="text-small text-muted">Les {RESULTATS_MAX} premiers résultats : précisez la recherche.</p> : null}
          <ul className="flex list-none flex-col gap-3 p-0">
            {fiches.map((f) => (
              <li key={f.compteId} aria-label={`Client ${f.nom}`} className="ec-card flex flex-col gap-2">
                <p className="font-semibold">
                  {f.nom}
                  {f.cabinet ? ` · ${f.cabinet}` : ""}
                </p>
                <p className="text-small text-muted break-all">
                  {[f.email, f.telephone, f.rpps ? `RPPS ${f.rpps}` : null, f.siret ? `SIRET ${f.siret}` : null].filter(Boolean).join(" · ")}
                </p>
                {f.droits ? (
                  f.droits.statut === "actif" ? (
                    <p>
                      <strong>Droits actifs</strong> jusqu’au {date(f.droits.fin)} (commande {f.droits.origine}).
                    </p>
                  ) : (
                    <p>
                      <strong>Pas de droits actifs</strong>
                      {f.droits.fin ? ` — fin le ${date(f.droits.fin)}` : ""}.
                    </p>
                  )
                ) : null}
                {f.droits?.historique.filter((e) => e.type === "ajustement").map((e, i) => (
                  <p key={i} className="text-small">Ajustement du {date(e.date)} : jusqu’au {date(e.fin)}{e.motif ? ` — ${e.motif}` : ""}</p>
                ))}
                {f.interventions.length ? (
                  <p className="text-small">
                    Interventions payées : {f.interventions.filter((i) => i.etat === "disponible").length} disponible(s), {f.interventions.filter((i) => i.etat === "consommee").length} réalisée(s).
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {regles ? (
        <Card className="flex flex-col gap-2">
          <h2 className="text-h3 font-semibold">Règles en vigueur</h2>
          <ul className="list-disc pl-6">
            <li>Bons d’achat : {paliersEnClair(regles).join(" ; ")} — valables {regles.validiteMois} mois.</li>
            <li>
              Droits d’assistance : commande d’au moins {euros(regles.seuilDroitsHt)} HT de consommables ou d’accessoires → {regles.dureeDroitsJours} jours (
              {regles.prolongation === "cumul" ? "cumulés" : "remis à zéro"}, plafond {regles.plafondDroitsJours} jours).
            </li>
            <li>Assistance à l’acte : {euros(regles.prixAssistanceActeHt)} HT l’intervention.</li>
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
