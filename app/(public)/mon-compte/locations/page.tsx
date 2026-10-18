import type { Metadata } from "next";
import Link from "next/link";
import { abonnementsARegler, LIBELLES_LOCATION, locationsDuCompte } from "@/domaine/commande/mon-compte";
import { compteCourant } from "@/domaine/comptes/session";
import { euros } from "@/lib/montants";
import { Card, Kicker } from "@/ui";
import { NavMonCompte } from "@/ui/comptes/NavMonCompte";

export const metadata: Metadata = { title: "Locations en cours" };

const date = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

// Mises à disposition souscrites (F04, US5) : montant mensuel, prochaine échéance, sans
// engagement. La résiliation et le retour du matériel viendront avec F05.
export default async function Locations() {
  const { compte } = await compteCourant("/mon-compte/locations");
  const [{ locations, indisponible }, aRegler] = await Promise.all([locationsDuCompte(compte.id), abonnementsARegler(compte.id)]);
  return (
    <>
      <Kicker>Mon compte</Kicker>
      <h1 className="text-h2 font-light">Locations en cours</h1>
      <NavMonCompte actif="/mon-compte" />
      {aRegler.map((c) => (
        <p key={c.id} role="status" className="ec-box--promo p-4">
          La mise à disposition de la commande {c.ref} reste à régler.{" "}
          <Link href={`/commande/recapitulatif?ref=${c.ref}`}>Autoriser le prélèvement mensuel</Link>
        </p>
      ))}
      {indisponible ? <p role="status" className="ec-box--info p-4">Vos locations sont momentanément indisponibles. Réessayez dans quelques instants.</p> : null}
      {!indisponible && !locations.length ? (
        <Card>
          <p>Vous n’avez pas de mise à disposition en cours. <Link href="/catalogue">Découvrir le matériel disponible en mise à disposition</Link></p>
        </Card>
      ) : null}
      {locations.length ? (
        <ul className="flex list-none flex-col gap-3 p-0">
          {locations.map((l) => (
            <li key={l.ref} className="ec-card flex flex-col gap-2" aria-label={`Location ${l.ref}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-ink">{l.libelle}</p>
                <p>{LIBELLES_LOCATION[l.etat]}</p>
              </div>
              <dl className="grid gap-x-6 gap-y-1 text-small sm:grid-cols-[auto_1fr]">
                <dt className="text-muted">Référence</dt>
                <dd>{l.ref}</dd>
                <dt className="text-muted">Montant mensuel</dt>
                <dd>{euros(l.montantMensuelHt)} HT, sans engagement</dd>
                <dt className="text-muted">Depuis le</dt>
                <dd>{date(l.debut)}</dd>
                {l.prochaineEcheance ? (
                  <>
                    <dt className="text-muted">Prochaine échéance</dt>
                    <dd>{date(l.prochaineEcheance)}</dd>
                  </>
                ) : null}
                {l.fin ? (
                  <>
                    <dt className="text-muted">Fin</dt>
                    <dd>{date(l.fin)}</dd>
                  </>
                ) : null}
                {l.numeroSerie ? (
                  <>
                    <dt className="text-muted">Numéro de série</dt>
                    <dd>{l.numeroSerie}</dd>
                  </>
                ) : null}
              </dl>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-small text-muted">Les factures mensuelles sont dans <Link href="/mon-compte/factures">Factures</Link>.</p>
    </>
  );
}
