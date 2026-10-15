import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pagePaiementDemoDisponible, paiementDemo } from "@/connecteurs/demonstration";
import { euros } from "@/lib/montants";
import { Button, Card, Champ, Kicker, Retour } from "@/ui";
import { ouvrirPaiementDeTest, simulerEcheance, simulerRemboursement } from "./actions";

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
  const [abonnements, paiements] = await Promise.all([paiementDemo.listerAbonnements(), paiementDemo.listerPaiementsAcceptes()]);
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
    </div>
  );
}
