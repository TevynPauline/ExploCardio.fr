import type { Metadata } from "next";
import Link from "next/link";
import { actionCommanderDevis } from "@/actions/devis-panier";
import { devisDuCompte, REFUS_COMMANDE_DEVIS } from "@/domaine/commande/devis-client";
import { compteCourant } from "@/domaine/comptes/session";
import { euros } from "@/lib/montants";
import { Card, Kicker } from "@/ui";
import { NavMonCompte } from "@/ui/comptes/NavMonCompte";

export const metadata: Metadata = { title: "Devis" };

const ETATS = { valide: "Valable", expire: "Expiré", commande: "Commandé" } as const;

// Devis du professionnel (F16, FR-020, FR-021) : lus dans Odoo, du plus récent au plus ancien.
export default async function MesDevis({ searchParams }: { searchParams: Promise<{ refus?: string }> }) {
  const { compte } = await compteCourant("/mon-compte/devis");
  const { refus } = await searchParams;
  const liste = await devisDuCompte(compte.id);
  const message = refus && refus in REFUS_COMMANDE_DEVIS ? REFUS_COMMANDE_DEVIS[refus as keyof typeof REFUS_COMMANDE_DEVIS] : null;
  return (
    <>
      <Kicker>Mon compte</Kicker>
      <h1 className="text-h2 font-light">Mes devis</h1>
      <NavMonCompte actif="/mon-compte" />
      {message ? <p role="alert" className="ec-box--info p-4">{message}</p> : null}
      {liste === null ? <p role="status" className="ec-box--info p-4">Vos devis sont momentanément indisponibles. Réessayez dans quelques instants.</p> : null}
      {liste && !liste.length ? (
        <Card className="flex flex-col gap-2">
          <p>Aucun devis pour le moment.</p>
          <p>Depuis votre panier, touchez « Recevoir un devis » : il est prêt aussitôt, en PDF.</p>
          <p><Link href="/panier" className="inline-flex min-h-11 items-center">Mon panier</Link></p>
        </Card>
      ) : null}
      {liste?.length ? (
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tableau des devis">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Mes devis, du plus récent au plus ancien</caption>
            <thead>
              <tr className="border-b border-line text-small text-muted">
                <th scope="col" className="py-2 pr-4 font-medium">Devis</th>
                <th scope="col" className="py-2 pr-4 font-medium">Date</th>
                <th scope="col" className="py-2 pr-4 font-medium">Montant</th>
                <th scope="col" className="py-2 pr-4 font-medium">État</th>
                <th scope="col" className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {liste.map((d) => (
                <tr key={d.ref} className="border-b border-line">
                  <th scope="row" className="py-2 pr-4 font-normal">Devis {d.ref}</th>
                  <td className="py-2 pr-4">{d.creeLe.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}</td>
                  <td className="py-2 pr-4">{euros(d.totalHt)} HT · {euros(d.totalTtc)} TTC</td>
                  <td className="py-2 pr-4">
                    <span className="ec-badge">{ETATS[d.etat]}</span>
                    <span className="block text-small text-muted">
                      {d.etat === "commande" ? `Commande ${d.commandeRef}` : `${d.etat === "valide" ? "Jusqu’au" : "Depuis le"} ${d.validiteLe.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}`}
                    </span>
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap items-center gap-x-4">
                      <a href={`/mon-compte/devis/${encodeURIComponent(d.ref)}/pdf`} className="inline-flex min-h-11 items-center" aria-label={`Télécharger le devis ${d.ref}`}>
                        Télécharger
                      </a>
                      {d.etat !== "commande" ? (
                        <form action={actionCommanderDevis}>
                          <input type="hidden" name="ref" value={d.ref} />
                          <button type="submit" className="ec-btn ec-btn--primary" aria-label={`Commander le devis ${d.ref}${d.etat === "expire" ? " aux prix du jour" : ""}`}>
                            {d.etat === "expire" ? "Commander aux prix du jour" : "Commander"}
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <p className="text-small text-muted">Commander un devis remplace le contenu de votre panier par les articles du devis.</p>
    </>
  );
}
