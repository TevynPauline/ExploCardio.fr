import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { dbSite } from "@/lib/db/site";
import { Button, Card, Kicker, Retour } from "@/ui";
import { LIBELLES_DECISION, LIBELLES_STATUT } from "@/ui/comptes/libelles";
import { decider } from "../actions";

export const metadata: Metadata = { title: "Fiche du compte" };

// Fiche d'un compte (US2) : vérification du numéro (lien vers l'annuaire santé public, D6) et décisions.
export default async function FicheCompte({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const { id } = await params;
  const r = await searchParams;
  const c = await dbSite().compteClient.findUnique({
    where: { id },
    include: { utilisateur: true, adresses: true, decisions: { orderBy: { date: "desc" } } },
  });
  if (!c) notFound();
  const u = c.utilisateur;
  const annuaire = c.rpps
    ? `https://annuaire.sante.fr/web/site-pro/recherche/resultats?idNat=${encodeURIComponent(c.rpps)}`
    : `https://annuaire-entreprises.data.gouv.fr/etablissement/${encodeURIComponent(c.siret ?? "")}`;
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Kicker>Comptes</Kicker>
      <h1 className="text-h2 font-light">{u.civilite ? `${u.civilite} ` : ""}{u.name}</h1>
      <p><span className="ec-badge">{LIBELLES_STATUT[c.statut]}</span></p>
      <Retour {...r} />
      <Card>
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
          <dt className="font-medium">Email</dt><dd>{u.email}</dd>
          <dt className="font-medium">Téléphone</dt><dd>{u.telephone ?? "—"}</dd>
          <dt className="font-medium">Spécialité</dt><dd>{u.specialite ?? "—"}</dd>
          <dt className="font-medium">{c.rpps ? "RPPS" : "SIRET"}</dt>
          <dd>
            {c.rpps ?? c.siret}{" "}
            <a href={annuaire} target="_blank" rel="noopener noreferrer">
              Vérifier dans l’annuaire public<span className="sr-only"> (nouvel onglet)</span>
            </a>
          </dd>
          <dt className="font-medium">Cabinet</dt><dd>{c.nomCabinet}</dd>
          <dt className="font-medium">Inscription</dt><dd>{c.creeLe.toLocaleString("fr-FR")}</dd>
          {c.valideLe ? (<><dt className="font-medium">Validation</dt><dd>{c.valideLe.toLocaleString("fr-FR")}</dd></>) : null}
          {c.odooPartnerRef ? (<><dt className="font-medium">Fiche client Odoo</dt><dd>{c.odooPartnerRef}</dd></>) : null}
          {c.motifRefus ? (<><dt className="font-medium">Motif du refus</dt><dd>{c.motifRefus}</dd></>) : null}
        </dl>
        <h2 className="mt-4 text-h3 font-semibold">Adresses</h2>
        <ul className="mt-2 grid gap-2 sm:grid-cols-3">
          {c.adresses.map((a) => (
            <li key={a.id} className="text-small">
              <span className="block font-medium capitalize">{a.type}</span>
              {a.ligne1}{a.ligne2 ? `, ${a.ligne2}` : ""}<br />{a.codePostal} {a.ville}
            </li>
          ))}
        </ul>
      </Card>

      {c.statut === "en_attente" ? (
        <Card className="flex flex-col gap-4">
          <h2 className="text-h3 font-semibold">Décision</h2>
          <form action={decider}>
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="decision" value="valider" />
            <Button type="submit">Valider le compte</Button>
          </form>
          <form action={decider} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="decision" value="refuser" />
            <label htmlFor="motif-refus" className="text-small font-medium">Motif du refus</label>
            <textarea id="motif-refus" name="motif" rows={2} required className="rounded-sm border border-muted bg-surface p-2" />
            <div><Button type="submit" variante="secondaire">Refuser le compte</Button></div>
          </form>
        </Card>
      ) : null}
      {c.statut === "valide" ? (
        <Card>
          <form action={decider} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="decision" value="suspendre" />
            <label htmlFor="motif-suspension" className="text-small font-medium">Motif de la suspension</label>
            <textarea id="motif-suspension" name="motif" rows={2} required className="rounded-sm border border-muted bg-surface p-2" />
            <div><Button type="submit" variante="secondaire">Suspendre le compte</Button></div>
          </form>
        </Card>
      ) : null}
      {c.statut === "suspendu" ? (
        <Card>
          <form action={decider}>
            <input type="hidden" name="id" value={c.id} />
            <input type="hidden" name="decision" value="retablir" />
            <Button type="submit">Rétablir le compte</Button>
          </form>
        </Card>
      ) : null}

      {c.decisions.length ? (
        <Card>
          <h2 className="text-h3 font-semibold">Historique des décisions</h2>
          <ul className="mt-2 flex flex-col gap-1 text-small">
            {c.decisions.map((d) => (
              <li key={d.id}>
                {d.date.toLocaleString("fr-FR")} — {LIBELLES_DECISION[d.decision]}
                {d.auteurId ? "" : " (automatique)"}
                {d.motif ? ` : ${d.motif}` : ""}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
      <p><Link href="/admin/comptes">Retour à la liste</Link></p>
    </div>
  );
}
