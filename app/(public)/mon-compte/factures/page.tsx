import type { Metadata } from "next";
import { facturesDuCompte } from "@/domaine/commande/mon-compte";
import { compteCourant } from "@/domaine/comptes/session";
import { euros } from "@/lib/montants";
import { Card, Kicker } from "@/ui";
import { NavMonCompte } from "@/ui/comptes/NavMonCompte";

export const metadata: Metadata = { title: "Factures" };

// Factures et avoirs (F04, FR-028, FR-030) : émis par Odoo, PDF lus à la demande.
export default async function Factures() {
  const { compte } = await compteCourant("/mon-compte/factures");
  const { factures, indisponible } = await facturesDuCompte(compte.id);
  return (
    <>
      <Kicker>Mon compte</Kicker>
      <h1 className="text-h2 font-light">Factures et avoirs</h1>
      <NavMonCompte actif="/mon-compte" />
      {indisponible ? <p role="status" className="ec-box--info p-4">Vos factures sont momentanément indisponibles. Réessayez dans quelques instants.</p> : null}
      {!indisponible && !factures.length ? <Card><p>Aucune facture pour le moment.</p></Card> : null}
      {factures.length ? (
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Tableau des factures">
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">Factures et avoirs</caption>
            <thead>
              <tr className="border-b border-line text-small text-muted">
                <th scope="col" className="py-2 pr-4 font-medium">Document</th>
                <th scope="col" className="py-2 pr-4 font-medium">Date</th>
                <th scope="col" className="py-2 pr-4 font-medium">Montant</th>
                <th scope="col" className="py-2 font-medium">PDF</th>
              </tr>
            </thead>
            <tbody>
              {factures.map((f) => (
                <tr key={f.numero} className="border-b border-line">
                  <th scope="row" className="py-2 pr-4 font-normal">{f.type === "avoir" ? "Avoir" : "Facture"} {f.numero}</th>
                  <td className="py-2 pr-4">{f.date.toLocaleDateString("fr-FR")}</td>
                  <td className="py-2 pr-4">{euros(f.montantHt)} HT · {euros(f.montantTtc)} TTC</td>
                  <td className="py-2">
                    <a href={`/mon-compte/factures/${encodeURIComponent(f.numero)}/pdf`} className="inline-flex min-h-11 items-center" aria-label={`Télécharger ${f.type === "avoir" ? "l'avoir" : "la facture"} ${f.numero}`}>
                      Télécharger
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
