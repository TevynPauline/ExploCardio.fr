import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { commandeDetaillee, facturesDuCompte, LIBELLES_STATUT } from "@/domaine/commande/mon-compte";
import { compteCourant } from "@/domaine/comptes/session";
import { euros } from "@/lib/montants";
import { Card, Kicker } from "@/ui";
import { NavMonCompte } from "@/ui/comptes/NavMonCompte";

export const metadata: Metadata = { title: "Commande" };

// Détail d'une commande (F04, US7) : statut, transporteur et suivi, montants, factures et avoirs.
export default async function DetailCommande({ params }: { params: Promise<{ ref: string }> }) {
  const ref = decodeURIComponent((await params).ref);
  const { compte } = await compteCourant(`/mon-compte/commandes/${ref}`);
  const c = await commandeDetaillee(compte.id, ref);
  if (!c) notFound();
  const { factures } = await facturesDuCompte(compte.id);
  const liees = factures.filter((f) => f.commandeRef === c.ref);
  return (
    <>
      <Kicker>Mon compte</Kicker>
      <h1 className="text-h2 font-light">Commande {c.ref}</h1>
      <NavMonCompte actif="/mon-compte" />
      <Card className="flex flex-col gap-2">
        <p>
          <span className="font-semibold text-ink">Statut : </span>
          {LIBELLES_STATUT[c.statut]}
          {c.financee ? " · commande financée (aucun montant à régler sur le site)" : ""}
        </p>
        <p className="text-small text-muted">Passée le {c.date.toLocaleDateString("fr-FR")}</p>
        {c.statut === "en_attente_paiement" && c.echeancePaiement ? (
          <p>Virement attendu avant le {c.echeancePaiement.toLocaleDateString("fr-FR")}, en rappelant la référence {c.ref}.</p>
        ) : null}
        {c.transporteur || c.suivi ? (
          <p>
            <span className="font-semibold text-ink">Expédition : </span>
            {c.transporteur ?? "Transporteur"}{c.suivi ? `, suivi n° ${c.suivi}` : ""}
          </p>
        ) : null}
        {c.remboursementsTtc ? <p>Remboursé : {euros(c.remboursementsTtc)} TTC</p> : null}
      </Card>
      <section aria-labelledby="titre-lignes" className="flex flex-col gap-2">
        <h2 id="titre-lignes" className="text-h3 font-semibold">Articles</h2>
        <ul className="flex list-none flex-col p-0">
          {c.lignes.map((l, i) => (
            <li key={i} className="flex flex-wrap justify-between gap-x-4 border-b border-line py-2">
              <span>{l.quantite} × {l.libelle}</span>
              <span>{l.prixUnitaireHt === 0 ? "Offert" : `${euros(l.prixUnitaireHt * l.quantite - l.remiseHt)} HT`}</span>
            </li>
          ))}
        </ul>
        <p className="text-right">
          Livraison : {euros(c.fraisPortHt)} HT · Total : <strong>{euros(c.montantHt)} HT</strong> · TVA {euros(c.tva)} · <strong>{euros(c.montantTtc)} TTC</strong>
        </p>
      </section>
      {liees.length ? (
        <section aria-labelledby="titre-factures" className="flex flex-col gap-2">
          <h2 id="titre-factures" className="text-h3 font-semibold">Factures et avoirs</h2>
          <ul className="flex list-none flex-col gap-1 p-0">
            {liees.map((f) => (
              <li key={f.numero}>
                <a href={`/mon-compte/factures/${encodeURIComponent(f.numero)}/pdf`} className="inline-flex min-h-11 items-center">
                  {f.type === "avoir" ? "Avoir" : "Facture"} {f.numero} (PDF)
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p><Link href="/mon-compte/commandes" className="inline-flex min-h-11 items-center">Toutes mes commandes</Link></p>
    </>
  );
}
