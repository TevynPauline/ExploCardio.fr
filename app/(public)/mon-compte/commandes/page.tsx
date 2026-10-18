import type { Metadata } from "next";
import Link from "next/link";
import { abonnementsARegler, commandesDuCompte, LIBELLES_STATUT } from "@/domaine/commande/mon-compte";
import { compteCourant } from "@/domaine/comptes/session";
import { euros } from "@/lib/montants";
import { Card, Kicker } from "@/ui";
import { NavMonCompte } from "@/ui/comptes/NavMonCompte";

export const metadata: Metadata = { title: "Commandes" };

// Commandes (F04, US7) : lues dans Odoo ; abonnements d'un panier mixte restés à régler.
export default async function Commandes() {
  const { compte } = await compteCourant("/mon-compte/commandes");
  const [{ commandes, indisponible }, aRegler] = await Promise.all([commandesDuCompte(compte.id), abonnementsARegler(compte.id)]);
  return (
    <>
      <Kicker>Mon compte</Kicker>
      <h1 className="text-h2 font-light">Commandes</h1>
      <NavMonCompte actif="/mon-compte" />
      {aRegler.map((c) => (
        <p key={c.id} role="status" className="ec-box--promo p-4">
          La mise à disposition de la commande {c.ref} reste à régler.{" "}
          <Link href={`/commande/recapitulatif?ref=${c.ref}`}>Autoriser le prélèvement mensuel</Link>
        </p>
      ))}
      {indisponible ? <p role="status" className="ec-box--info p-4">Vos commandes sont momentanément indisponibles. Réessayez dans quelques instants.</p> : null}
      {!indisponible && !commandes.length ? (
        <Card>
          <p>Vous n’avez pas encore passé de commande. <Link href="/catalogue">Découvrir le catalogue</Link></p>
        </Card>
      ) : null}
      {commandes.length ? (
        <ul className="flex list-none flex-col gap-3 p-0">
          {commandes.map((c) => (
            <li key={c.ref} className="ec-card flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold">
                  <Link href={`/mon-compte/commandes/${encodeURIComponent(c.ref)}`}>Commande {c.ref}</Link>
                </p>
                <p className="text-small text-muted">du {c.date.toLocaleDateString("fr-FR")}</p>
              </div>
              <p>{LIBELLES_STATUT[c.statut]}</p>
              <p className="font-semibold text-ink">{euros(c.montantHt)} HT · {euros(c.montantTtc)} TTC</p>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
