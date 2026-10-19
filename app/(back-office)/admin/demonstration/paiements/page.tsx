import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { commandesDemo, pagePaiementDemoDisponible, paiementDemo } from "@/connecteurs/demonstration";
import { euros } from "@/lib/montants";
import { Button, Card, Champ, Kicker, Retour } from "@/ui";
import { deciderRemboursement, expedierCommande, livrerCommande, ouvrirPaiementDeTest, simulerEcheance, simulerRemboursement, virementRecu } from "./actions";

export const metadata: Metadata = { title: "Paiements de démonstration" };

const select = "min-h-11 w-full max-w-full rounded-sm border border-muted bg-surface px-2";

// Simulations de paiement (T077, FR-028) : paiement de test, échéances mensuelles payées ou
// refusées, remboursements. Les événements suivent le même chemin que ceux de Stripe.
export default async function Paiements({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erreur?: string; paiement?: string }>;
}) {
  if (!pagePaiementDemoDisponible()) notFound();
  const { ok, erreur, paiement } = await searchParams;
  const [abonnements, paiements, commandes] = await Promise.all([paiementDemo.listerAbonnements(), paiementDemo.listerPaiementsAcceptes(), commandesDemo.lister()]);
  const message = paiement ? `Retour de la page de paiement : paiement ${paiement === "accepte" ? "accepté" : "refusé"}.` : ok;
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Kicker>Démonstration</Kicker>
      <h1 className="text-h2 font-light">Paiements</h1>
      <Retour ok={message} erreur={erreur} />

      <Card>
        <h2 className="text-h3 font-semibold">Ouvrir une page de paiement de test</h2>
        <form action={ouvrirPaiementDeTest} className="mt-3 flex flex-col gap-3">
          <div className="max-w-xs">
            <Champ id="montant" name="montant" libelle="Montant TTC (€)" inputMode="decimal" defaultValue="120,00" required />
          </div>
          <fieldset className="flex flex-wrap gap-4">
            <legend className="mb-1 text-small font-medium">Moyens proposés</legend>
            <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="moyens" value="carte" defaultChecked className="size-5" /> Cartes</label>
            <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="moyens" value="sepa" defaultChecked className="size-5" /> Prélèvement SEPA</label>
          </fieldset>
          <div><Button type="submit">Ouvrir la page de paiement</Button></div>
        </form>
      </Card>

      <Card>
        <h2 className="text-h3 font-semibold">Simuler une échéance mensuelle</h2>
        <form action={simulerEcheance} className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex w-full min-w-0 flex-col gap-1 text-small font-medium sm:w-auto sm:max-w-md">
            Abonnement
            <select name="abonnement" className={select} required>
              {abonnements.map((a) => (
                <option key={a.ref} value={a.ref}>
                  {a.ref} — {a.partenaire.nom} — {a.variante.modele.nom} ({euros(a.montantMensuelCentimes)} HT)
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-small font-medium">
            Issue
            <select name="issue" className={select}>
              <option value="payee">Payée</option>
              <option value="refusee">Refusée</option>
            </select>
          </label>
          <Button type="submit" variante="secondaire">Simuler l’échéance</Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-h3 font-semibold">Simuler un remboursement</h2>
        {paiements.length === 0 ? (
          <p className="mt-2 text-muted">Aucun paiement accepté pour l’instant. Ouvrez une page de paiement de test.</p>
        ) : (
          <form action={simulerRemboursement} className="mt-3 flex flex-wrap items-end gap-3">
            <label className="flex w-full min-w-0 flex-col gap-1 text-small font-medium sm:w-auto sm:max-w-md">
              Paiement
              <select name="paiement" className={select} required>
                {paiements.map((p) => (
                  <option key={p.paiementRef!} value={p.paiementRef!}>
                    {p.commandeRef ?? p.abonnementRef} — {euros(p.montantTtcCentimes)} TTC
                  </option>
                ))}
              </select>
            </label>
            <div className="w-40"><Champ id="montantRemboursement" name="montant" libelle="Montant TTC (€)" inputMode="decimal" required /></div>
            <div className="w-56"><Champ id="motif" name="motif" libelle="Motif" /></div>
            <Button type="submit" variante="secondaire">Simuler le remboursement</Button>
          </form>
        )}
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-h3 font-semibold">Commandes (ce que l’équipe fait dans Odoo)</h2>
        <p className="text-small text-muted">Virement reçu, expédition, livraison, remboursement décidé : le site en informe le client sous quelques minutes.</p>
        {commandes.length === 0 ? <p>Aucune commande.</p> : null}
        <ul className="flex list-none flex-col gap-4 p-0">
          {commandes.map((c) => {
            const id = c.ref.replace(/[^A-Za-z0-9]/g, "");
            const rembourse = c.remboursements.reduce((s, r) => s + r.montantTtcCentimes, 0);
            // F06 (D4) : bons crédités déjà dépensés, déduits du remboursement versé.
            const deduit = c.remboursements.reduce((s, r) => s + r.deductionTtcCentimes, 0);
            const bonsDeduits = c.remboursements.reduce((s, r) => s + r.bonsDeduitsHtCentimes, 0);
            return (
              <li key={c.ref} className="flex flex-col gap-2 border-b border-line pb-4" aria-label={`Commande ${c.ref}`}>
                <p>
                  <strong>{c.ref}</strong> · {c.partenaire.nom} · {euros(c.montantTtcCentimes)} TTC · {c.modePaiement} · statut : <strong>{c.statut}</strong>
                  {rembourse ? ` · remboursé ${euros(rembourse)}` : ""}
                  {deduit ? ` · réduit de ${euros(deduit)} TTC (${euros(bonsDeduits)} HT de bons déjà dépensés)` : ""}
                </p>
                {c.statut === "en_attente_paiement" ? (
                  <form action={virementRecu} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="commande" value={c.ref} />
                    <Champ id={`virement-${id}`} name="montant" libelle={`Montant reçu pour ${c.ref} (€ TTC)`} defaultValue={(c.montantTtcCentimes / 100).toFixed(2).replace(".", ",")} />
                    <Button type="submit" variante="secondaire">Virement reçu</Button>
                  </form>
                ) : null}
                {["payee", "confirmee", "en_preparation"].includes(c.statut) ? (
                  <form action={expedierCommande} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="commande" value={c.ref} />
                    <Champ id={`transporteur-${id}`} name="transporteur" libelle={`Transporteur (${c.ref})`} defaultValue="Colissimo" />
                    <Champ id={`suivi-${id}`} name="suivi" libelle={`Numéro de suivi (${c.ref})`} defaultValue={`FICT-COLIS-${id.slice(-6)}`} />
                    <Button type="submit" variante="secondaire">Marquer expédiée</Button>
                  </form>
                ) : null}
                {c.statut === "expediee" ? (
                  <form action={livrerCommande}>
                    <input type="hidden" name="commande" value={c.ref} />
                    <Button type="submit" variante="secondaire">Marquer livrée ({c.ref})</Button>
                  </form>
                ) : null}
                {["payee", "confirmee", "en_preparation", "expediee", "livree", "remboursee_partiellement"].includes(c.statut) && !c.financee ? (
                  <form action={deciderRemboursement} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="commande" value={c.ref} />
                    <Champ id={`rembourser-${id}`} name="montant" libelle={`Montant à rembourser (${c.ref}, € TTC)`} defaultValue={((c.montantTtcCentimes - rembourse - deduit) / 100).toFixed(2).replace(".", ",")} />
                    <Champ id={`motif-${id}`} name="motif" libelle={`Motif (${c.ref})`} defaultValue="Retour accepté" />
                    <Button type="submit" variante="secondaire">Décider un remboursement</Button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
