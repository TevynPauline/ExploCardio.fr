import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { lireDemande, STATUTS_FINANCEMENT } from "@/domaine/financement/administration";
import { LIBELLES_STATUT_FINANCEMENT } from "@/domaine/financement/demande";
import { euros } from "@/lib/montants";
import { Button, Card, Kicker, Retour } from "@/ui";
import { actionCommandeFinancee, actionNote, actionStatut } from "../actions";
import { RappelPatient } from "@/ui/admin";

export const metadata: Metadata = { title: "Demande de financement" };

const select = "min-h-11 w-full max-w-xs rounded-sm border border-muted bg-surface px-2";

// Fiche d'une demande (FR-036 à FR-039) : statut, notes internes, journal, commande financée.
export default async function FicheFinancement({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const { id } = await params;
  const r = await searchParams;
  const lu = await lireDemande(id);
  if (!lu) notFound();
  const { demande: d, historique } = lu;
  const u = d.compte.utilisateur;
  const cabinet = d.cabinet as { nom?: string; siret?: string; adresse?: string; praticiens?: number | null; telephone?: string };
  const equipements = d.equipements as { nom?: string; defaultCode: string; quantite: number; mensualiteIndicativeHt?: number | null }[];
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Kicker>Financements</Kicker>
      <h1 className="text-h2 font-light">Demande de {cabinet.nom || u.name}</h1>
      <p><Link href="/admin/financements">Toutes les demandes</Link></p>
      <Retour {...r} />
      <RappelPatient />

      <Card className="flex flex-col gap-2">
        <h2 className="text-h3 font-semibold">Demande</h2>
        <p>Statut : <strong className="text-ink">{LIBELLES_STATUT_FINANCEMENT[d.statut]}</strong> · reçue le {d.creeLe.toLocaleDateString("fr-FR")}</p>
        <ul className="list-disc pl-5">
          {equipements.map((e) => (
            <li key={e.defaultCode}>
              {e.nom ?? e.defaultCode} × {e.quantite} <span className="text-small text-muted">({e.defaultCode})</span>
            </li>
          ))}
        </ul>
        <p>Durée : {d.dureeMois} mois{d.mensualiteIndicativeHt ? ` · mensualité indicative affichée : ${euros(d.mensualiteIndicativeHt)} HT` : ""}</p>
        {d.opportuniteRef ? <p className="text-small text-muted">Opportunité Odoo : {d.opportuniteRef}</p> : <p className="text-small text-muted">Copie dans Odoo en attente (nouvel essai automatique).</p>}
      </Card>

      <Card className="flex flex-col gap-1">
        <h2 className="text-h3 font-semibold">Client et cabinet</h2>
        <p><Link href={`/admin/comptes/${d.compteId}`}>{u.civilite ? `${u.civilite} ` : ""}{u.name}</Link> · {u.email}</p>
        <p>{cabinet.nom}{cabinet.siret ? ` · SIRET ${cabinet.siret}` : ""}</p>
        <p>{cabinet.adresse}</p>
        {cabinet.praticiens ? <p>{cabinet.praticiens} praticien{cabinet.praticiens > 1 ? "s" : ""}</p> : null}
        {cabinet.telephone ? <p>Téléphone : {cabinet.telephone}</p> : null}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">Statut</h2>
        {d.commandeRef ? (
          <p>Commande financée créée dans Odoo : <strong className="text-ink">{d.commandeRef}</strong>.</p>
        ) : (
          <form action={actionStatut} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={d.id} />
            <label className="flex flex-col gap-1 text-small font-medium">
              Nouveau statut
              <select name="statut" defaultValue={d.statut} className={select}>
                {STATUTS_FINANCEMENT.map((s) => (
                  <option key={s} value={s}>{LIBELLES_STATUT_FINANCEMENT[s]}</option>
                ))}
              </select>
            </label>
            <Button type="submit" variante="secondaire">Enregistrer le statut</Button>
          </form>
        )}
        <p className="text-small text-muted">Le client est prévenu par email à chaque changement. Ne citez jamais l’organisme de financement auprès du client.</p>
        {d.statut === "accordee" && !d.commandeRef ? (
          <form action={actionCommandeFinancee}>
            <input type="hidden" name="id" value={d.id} />
            <Button type="submit">Créer la commande financée</Button>
            <p className="mt-2 text-small text-muted">Crée la commande dans Odoo sans paiement ni facture au client ; le stock est décompté.</p>
          </form>
        ) : null}
      </Card>

      <Card className="flex flex-col gap-3">
        <h2 className="text-h3 font-semibold">Notes internes</h2>
        <p className="text-small text-muted">Jamais visibles du client.</p>
        {d.notesInternes ? <p className="whitespace-pre-line">{d.notesInternes}</p> : <p className="text-muted">Aucune note.</p>}
        <form action={actionNote} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={d.id} />
          <label htmlFor="note" className="text-small font-medium text-ink">Ajouter une note</label>
          <textarea id="note" name="note" rows={3} maxLength={2000} className="rounded-sm border border-muted bg-surface p-2" />
          <div><Button type="submit" variante="secondaire">Ajouter la note</Button></div>
        </form>
      </Card>

      <Card className="flex flex-col gap-2">
        <h2 className="text-h3 font-semibold">Journal</h2>
        {historique.length === 0 ? (
          <p className="text-muted">Aucune action.</p>
        ) : (
          <ul className="flex list-none flex-col gap-1 p-0 text-small">
            {historique.map((h) => (
              <li key={h.id}>
                {h.date.toLocaleString("fr-FR", { timeZone: "Europe/Paris" })} — {h.auteur} — {h.action}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
