import type { Metadata } from "next";
import Link from "next/link";
import { compteCourant } from "@/domaine/comptes/session";
import { cagnotteDetaillee, LIBELLES_MOUVEMENT } from "@/domaine/fidelite/cagnotte";
import { paliersEnClair } from "@/domaine/fidelite/droits";
import { euros } from "@/lib/montants";
import { Card, Kicker } from "@/ui";
import { NavMonCompte } from "@/ui/comptes/NavMonCompte";
import { ParcoursFidelite } from "@/ui/fidelite/Parcours";

export const metadata: Metadata = { title: "Bons d’achat" };

const date = (d: Date) => d.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });
const signe = (c: number) => (c > 0 ? `+${euros(c)}` : euros(c));

// Bons d'achat (F06, US5) : solde, prochaine expiration, historique relié aux commandes, lus
// dans Odoo. Le solde est la somme de l'historique (SC-004).
export default async function BonsAchat() {
  const { compte } = await compteCourant("/mon-compte/bons-achat");
  const { cagnotte, regles, indisponible } = await cagnotteDetaillee(compte.id);
  const mouvements = cagnotte ? [...cagnotte.mouvements].sort((a, b) => b.date.getTime() - a.date.getTime()) : [];
  return (
    <>
      <Kicker>Mon compte</Kicker>
      <h1 className="text-h2 font-light">Bons d’achat</h1>
      <NavMonCompte actif="/mon-compte" />
      {indisponible ? <p role="status" className="ec-box--info p-4">Votre cagnotte est momentanément indisponible. Réessayez dans quelques instants.</p> : null}
      {cagnotte ? (
        <Card className="flex flex-col gap-2">
          <h2 className="text-h3 font-semibold">Votre cagnotte</h2>
          <p className="text-h2 font-light text-ink">{euros(cagnotte.soldeHt)} HT</p>
          {cagnotte.prochaineExpiration ? (
            <p>{euros(cagnotte.prochaineExpiration.montantHt)} HT expirent le {date(cagnotte.prochaineExpiration.date)}.</p>
          ) : null}
          <p className="text-small">
            Vos bons se déduisent de vos prochains achats, au panier. <Link href="/catalogue">Voir le catalogue</Link>
          </p>
        </Card>
      ) : null}
      {regles ? (
        <Card className="flex flex-col gap-2">
          <ParcoursFidelite />
          <h2 className="text-h3 font-semibold">Comment gagner des bons</h2>
          <p>Vos achats de consommables et d’accessoires vous rapportent des bons d’achat, selon le montant de chaque commande :</p>
          <ul className="list-disc pl-6">
            {paliersEnClair(regles).map((p) => <li key={p}>{p}</li>)}
          </ul>
          <p className="text-small text-muted">Le taux s’applique à tout le montant éligible de la commande. Les bons restent valables {regles.validiteMois} mois.</p>
        </Card>
      ) : null}
      {cagnotte && !mouvements.length ? <Card><p>Aucun mouvement pour le moment.</p></Card> : null}
      {mouvements.length ? (
        <section aria-labelledby="historique-bons" className="flex flex-col gap-2">
          <h2 id="historique-bons" className="text-h3 font-semibold">Historique</h2>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tableau de l’historique des bons d’achat">
            <table className="w-full border-collapse text-left">
              <caption className="sr-only">Historique des bons d’achat</caption>
              <thead>
                <tr className="border-b border-line text-small text-muted">
                  <th scope="col" className="py-2 pr-4 font-medium">Date</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Mouvement</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Montant HT</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Commande</th>
                  <th scope="col" className="py-2 font-medium">Valable jusqu’au</th>
                </tr>
              </thead>
              <tbody>
                {mouvements.map((m, i) => (
                  <tr key={i} className="border-b border-line">
                    <td className="py-2 pr-4">{date(m.date)}</td>
                    <th scope="row" className="py-2 pr-4 font-normal">
                      {LIBELLES_MOUVEMENT[m.type]}
                      {m.motif ? <span className="block text-small text-muted">{m.motif}</span> : null}
                    </th>
                    <td className="py-2 pr-4">{signe(m.montantHt)}</td>
                    <td className="py-2 pr-4">
                      {m.commandeRef ? <Link href={`/mon-compte/commandes/${encodeURIComponent(m.commandeRef)}`} className="inline-flex min-h-11 items-center">{m.commandeRef}</Link> : "—"}
                    </td>
                    <td className="py-2">{m.validiteFin && m.montantHt > 0 ? date(m.validiteFin) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}
