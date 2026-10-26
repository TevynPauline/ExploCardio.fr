import type { Metadata } from "next";
import Link from "next/link";
import { actionAnnuler, actionPasserAchat, actionProlonger, actionReporter } from "@/actions/locations";
import { prixTtc } from "@/domaine/catalogue/prix";
import { abonnementsARegler, LIBELLES_LOCATION } from "@/domaine/commande/mon-compte";
import { compteCourant } from "@/domaine/comptes/session";
import { datesDeReport, locationsDuCompte, type LocationDuCompte } from "@/domaine/location/gestion";
import { euros } from "@/lib/montants";
import { Card, Kicker, Retour } from "@/ui";
import { NavMonCompte } from "@/ui/comptes/NavMonCompte";

export const metadata: Metadata = { title: "Locations" };

const date = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

async function Location({ l, compteId }: { l: LocationDuCompte; compteId: string }) {
  const reports = l.actions.reporter ? await datesDeReport(compteId, l.ref) : [];
  return (
    <li className="ec-card flex flex-col gap-3" aria-label={`Location ${l.ref}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-h3 font-semibold">{l.libelle}</h2>
        <p>{LIBELLES_LOCATION[l.etat]}</p>
      </div>
      {l.impaye ? <p role="status" className="ec-box--promo p-3">Le dernier prélèvement n’a pas abouti : merci de vérifier votre moyen de paiement.</p> : null}
      {l.expeditionBloquee ? <p className="ec-box--info p-3">L’appareil sera expédié dès la vérification du numéro d’entreprise de votre cabinet.</p> : null}
      {l.attenteChoixClient ? (
        <p role="status" className="ec-box--promo p-3">L’appareil prévu s’est révélé défectueux : choisissez une nouvelle date de livraison, ou annulez sans frais.</p>
      ) : null}
      <dl className="grid gap-x-6 gap-y-1 text-small sm:grid-cols-[auto_1fr]">
        <dt className="text-muted">Référence</dt>
        <dd>{l.ref}</dd>
        {l.numeroSerie ? (
          <>
            <dt className="text-muted">Numéro de série</dt>
            <dd>{l.numeroSerie}</dd>
          </>
        ) : null}
        {l.etat === "commandee" && l.dateLivraison ? (
          <>
            <dt className="text-muted">Livraison prévue</dt>
            <dd>{date(l.dateLivraison)}</dd>
          </>
        ) : (
          <>
            <dt className="text-muted">Début</dt>
            <dd>{date(l.debut)}</dd>
          </>
        )}
        {l.suivi ? (
          <>
            <dt className="text-muted">Suivi du colis</dt>
            <dd>{l.transporteur ?? "Transporteur"}, n° {l.suivi}</dd>
          </>
        ) : null}
        {l.prochaineEcheance && ["en_cours", "commandee", "suspendue_impaye"].includes(l.etat) ? (
          <>
            <dt className="text-muted">Prochaine échéance</dt>
            <dd>
              {date(l.prochaineEcheance)} : {euros(l.montantMensuelHt)} HT ({euros(prixTtc(l.montantMensuelHt, 20))} TTC)
            </dd>
          </>
        ) : null}
        {l.fin ? (
          <>
            <dt className="text-muted">Fin</dt>
            <dd>{date(l.fin)}</dd>
          </>
        ) : null}
        {l.dateLimiteRetour && l.etat !== "terminee" ? (
          <>
            <dt className="text-muted">Retour de l’appareil avant le</dt>
            <dd>{date(l.dateLimiteRetour)}</dd>
          </>
        ) : null}
      </dl>
      {l.etat === "resiliation_prevue" || l.etat === "en_retard_retour" ? (
        <p className="text-small">
          Pour le retour : emballez l’appareil et ses accessoires loués, collez l’étiquette préaffranchie et déposez le colis avant la date limite.
        </p>
      ) : null}
      {l.factures.length ? (
        <p className="text-small">
          Factures :{" "}
          {l.factures.map((f, i) => (
            <span key={f.numero}>
              {i ? ", " : ""}
              <Link href={`/mon-compte/factures/${encodeURIComponent(f.numero)}/pdf`}>{f.type === "avoir" ? "Avoir" : "Facture"} {f.numero}</Link>
            </span>
          ))}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {l.actions.resilier ? (
          <Link href={`/mon-compte/locations/${encodeURIComponent(l.ref)}/resilier`} className="ec-btn ec-btn--secondary" aria-label={`Résilier la location ${l.ref}`}>
            Résilier
          </Link>
        ) : null}
        {l.actions.prolonger ? (
          <form action={actionProlonger}>
            <input type="hidden" name="ref" value={l.ref} />
            <button type="submit" className="ec-btn ec-btn--primary" aria-label={`Prolonger la location ${l.ref}`}>Prolonger</button>
          </form>
        ) : null}
        {l.actions.etiquette ? (
          <a href={`/mon-compte/locations/${encodeURIComponent(l.ref)}/etiquette`} className="ec-btn ec-btn--secondary" aria-label={`Étiquette de retour de la location ${l.ref} (PDF)`}>
            Étiquette de retour (PDF)
          </a>
        ) : null}
        {l.actions.acheter ? (
          <form action={actionPasserAchat}>
            <input type="hidden" name="ref" value={l.ref} />
            <button type="submit" className="ec-btn ec-btn--secondary" aria-label={`Passer à l’achat (${l.ref})`}>Passer à l’achat</button>
          </form>
        ) : null}
        {l.actions.financer ? (
          <Link href={`/financement/demande?article=${encodeURIComponent(l.defaultCode)}`} className="ec-btn ec-btn--secondary" aria-label={`Passer au financement (${l.ref})`}>
            Passer au financement
          </Link>
        ) : null}
        {l.actions.annuler ? (
          <form action={actionAnnuler}>
            <input type="hidden" name="ref" value={l.ref} />
            <button type="submit" className="ec-btn ec-btn--secondary" aria-label={`Annuler sans frais (${l.ref})`}>Annuler sans frais</button>
          </form>
        ) : null}
      </div>
      {l.actions.reporter ? (
        <form action={actionReporter} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="ref" value={l.ref} />
          <label className="flex flex-col gap-1 text-small font-medium text-ink">
            Nouvelle date de livraison
            <select name="date" className="min-h-11 rounded-sm border border-muted bg-surface px-3">
              {reports.map((d) => (
                <option key={d.valeur} value={d.valeur}>{d.libelle}</option>
              ))}
            </select>
          </label>
          <button type="submit" className="ec-btn ec-btn--primary">Reporter la livraison</button>
        </form>
      ) : null}
      {l.actions.acheter ? <p className="text-small text-muted">Passer à l’achat ajoute un appareil neuf à votre panier ; la location continue jusqu’à ce que vous la résiliiez.</p> : null}
    </li>
  );
}

// Locations (F05, US3) : chaque location en cours ou commandée, ses informations et ses
// actions ; historique des locations terminées avec leurs factures (FR-017 à FR-020).
export default async function Locations({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const r = await searchParams;
  const { compte } = await compteCourant("/mon-compte/locations");
  const [{ actives, historique, indisponible }, aRegler] = await Promise.all([locationsDuCompte(compte.id), abonnementsARegler(compte.id)]);
  return (
    <>
      <Kicker>Mon compte</Kicker>
      <h1 className="text-h2 font-light">Locations</h1>
      <NavMonCompte actif="/mon-compte" />
      <Retour {...r} />
      {aRegler.map((c) => (
        <p key={c.id} role="status" className="ec-box--promo p-4">
          La mise à disposition de la commande {c.ref} reste à régler. <Link href={`/commande/recapitulatif?ref=${c.ref}`}>Autoriser le prélèvement mensuel</Link>
        </p>
      ))}
      {indisponible ? <p role="status" className="ec-box--info p-4">Vos locations sont momentanément indisponibles. Réessayez dans quelques instants.</p> : null}
      {!indisponible && !actives.length ? (
        <Card>
          <p>
            Vous n’avez pas de mise à disposition en cours. <Link href="/mise-a-disposition">Découvrir le dépannage express</Link>
          </p>
        </Card>
      ) : null}
      {actives.length ? (
        <ul className="flex list-none flex-col gap-3 p-0">
          {actives.map((l) => (
            <Location key={l.ref} l={l} compteId={compte.id} />
          ))}
        </ul>
      ) : null}
      {historique.length ? (
        <section aria-labelledby="titre-historique" className="flex flex-col gap-3">
          <h2 id="titre-historique" className="text-h3 font-semibold">Locations terminées</h2>
          <ul className="flex list-none flex-col gap-3 p-0">
            {historique.map((l) => (
              <Location key={l.ref} l={l} compteId={compte.id} />
            ))}
          </ul>
        </section>
      ) : null}
      <p className="text-small text-muted">Toutes vos factures sont dans <Link href="/mon-compte/factures">Factures</Link>.</p>
    </>
  );
}
