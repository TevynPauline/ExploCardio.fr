import type { Metadata } from "next";
import Link from "next/link";
import { compteCourant } from "@/domaine/comptes/session";
import { demandesDuCompte, LIBELLES_STATUT_FINANCEMENT } from "@/domaine/financement/demande";
import { euros } from "@/lib/montants";
import { Card, Kicker } from "@/ui";
import { NavMonCompte } from "@/ui/comptes/NavMonCompte";

export const metadata: Metadata = { title: "Financements" };

// Demandes de financement du client et leur statut (F04, US6, FR-036). Les notes internes de
// l'équipe ne sont jamais affichées.
export default async function Financements({ searchParams }: { searchParams: Promise<{ envoyee?: string }> }) {
  const { envoyee } = await searchParams;
  const { compte } = await compteCourant("/mon-compte/financements");
  const demandes = await demandesDuCompte(compte.id);
  return (
    <>
      <Kicker>Mon compte</Kicker>
      <h1 className="text-h2 font-light">Financements</h1>
      <NavMonCompte actif="/mon-compte" />
      {envoyee ? (
        <p role="status" className="ec-box--info p-4">
          Votre demande de financement a bien été envoyée. Un email de confirmation vous a été adressé ; nous revenons vers vous rapidement.
        </p>
      ) : null}
      {!demandes.length ? (
        <Card>
          <p>Vous n’avez pas de demande de financement. <Link href="/financement">Découvrir le financement</Link></p>
        </Card>
      ) : (
        <ul className="flex list-none flex-col gap-3 p-0">
          {demandes.map((d) => (
            <li key={d.id} className="ec-card flex flex-col gap-2" aria-label={`Demande du ${d.creeLe.toLocaleDateString("fr-FR")}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold text-ink">Demande du {d.creeLe.toLocaleDateString("fr-FR")}</p>
                <p>Statut : <strong className="text-ink">{LIBELLES_STATUT_FINANCEMENT[d.statut]}</strong></p>
              </div>
              <p>{d.equipements.map((e) => `${e.nom ?? e.defaultCode} × ${e.quantite}`).join(", ")}</p>
              <p className="text-small text-muted">
                Sur {d.dureeMois} mois{d.mensualiteIndicativeHt ? ` · mensualité indicative ${euros(d.mensualiteIndicativeHt)} HT` : ""}
              </p>
              {d.commandeRef ? (
                <p>
                  Commande financée : <Link href={`/mon-compte/commandes/${encodeURIComponent(d.commandeRef)}`}>Commande {d.commandeRef}</Link>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
