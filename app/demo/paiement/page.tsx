import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pagePaiementDemoDisponible, paiementDemo } from "@/connecteurs/demonstration";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { euros } from "@/lib/montants";
import { Button, Card, Kicker, Logo } from "@/ui";
import { authentifier, payer } from "./actions";

export const metadata: Metadata = { title: "Paiement de démonstration", robots: { index: false, follow: false } };

// Page de paiement de démonstration (T075, FR-028) : remplace la page Stripe tant que le
// connecteur Stripe est en mode démonstration ; elle disparaît en mode réel. AUCUN champ de
// numéro de carte : le testeur choisit seulement le moyen de paiement et l'issue.

const MOYENS = [
  { valeur: "visa", libelle: "Carte Visa", moyen: "carte" },
  { valeur: "mastercard", libelle: "Carte Mastercard", moyen: "carte" },
  { valeur: "amex", libelle: "Carte American Express", moyen: "carte" },
  { valeur: "sepa", libelle: "Prélèvement SEPA", moyen: "sepa" },
] as const;

const ISSUES = [
  { valeur: "accepte", libelle: "Paiement accepté" },
  { valeur: "refuse", libelle: "Paiement refusé" },
  { valeur: "authentification", libelle: "Authentification forte demandée (3-D Secure)" },
] as const;

const radio = "flex min-h-11 items-center gap-3 rounded-sm border border-line bg-surface px-3 has-[:checked]:border-action";

export default async function PaiementDemo({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; etape?: string }>;
}) {
  if (!pagePaiementDemoDisponible()) notFound();
  const { session: id, etape } = await searchParams;
  if (!id) notFound();
  let session;
  try {
    session = await paiementDemo.lireSession(id);
  } catch (e) {
    if (estErreurConnecteur(e) && e.code === "NOT_FOUND") notFound();
    throw e;
  }

  const moyens = MOYENS.filter((m) => session.moyens.includes(m.moyen));
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-12">
      <Logo />
      <Kicker>Paiement de démonstration</Kicker>
      <h1 className="text-h2 font-light">
        {session.nature === "abonnement" ? "Abonnement mensuel" : "Paiement"} de {euros(session.montantTtcCentimes)} TTC
      </h1>
      {session.montantMensuelTtcCentimes ? (
        <p className="text-muted">Puis {euros(session.montantMensuelTtcCentimes)} TTC par mois.</p>
      ) : null}
      <p className="ec-box--info p-4">
        Cette page remplace la page de paiement Stripe pendant la démonstration. Aucun numéro de carte
        n’est demandé et aucun paiement n’est réel.
      </p>

      {etape === "authentification" ? (
        <Card>
          <h2 className="text-h3 font-semibold">Authentification forte (simulée)</h2>
          <p className="mt-2">La banque du porteur demande de confirmer le paiement.</p>
          <form action={authentifier} className="mt-4 flex flex-wrap gap-3">
            <input type="hidden" name="session" value={session.id} />
            <Button type="submit" name="resultat" value="reussie">Confirmer le paiement</Button>
            <Button type="submit" name="resultat" value="echouee" variante="secondaire">Refuser</Button>
          </form>
        </Card>
      ) : session.etat === "payee" || session.etat === "refusee" ? (
        <Card>
          <p role="status">Ce paiement est déjà {session.etat === "payee" ? "accepté" : "refusé"}.</p>
        </Card>
      ) : (
        <form action={payer} className="flex flex-col gap-6">
          <input type="hidden" name="session" value={session.id} />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-h3 font-semibold">Moyen de paiement</legend>
            {moyens.map((m, i) => (
              <label key={m.valeur} className={radio}>
                <input type="radio" name="moyen" value={m.valeur} defaultChecked={i === 0} required className="size-5" />
                {m.libelle}
              </label>
            ))}
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-h3 font-semibold">Issue du paiement</legend>
            {ISSUES.map((issue, i) => (
              <label key={issue.valeur} className={radio}>
                <input type="radio" name="issue" value={issue.valeur} defaultChecked={i === 0} required className="size-5" />
                {issue.libelle}
              </label>
            ))}
          </fieldset>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-h3 font-semibold">Options de test</legend>
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" name="tardif" value="oui" className="size-5" />
              Confirmation tardive (envoyée environ 20 secondes plus tard)
            </label>
            <label className="flex min-h-11 items-center gap-3">
              <input type="checkbox" name="repete" value="oui" className="size-5" />
              Confirmation répétée (le même événement est envoyé deux fois)
            </label>
          </fieldset>
          <div>
            <Button type="submit">Valider</Button>
          </div>
        </form>
      )}
    </main>
  );
}
