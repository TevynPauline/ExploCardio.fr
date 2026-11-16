import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { pagePaiementDemoDisponible } from "@/connecteurs/demonstration";
import { ButtonLink, Kicker, Logo } from "@/ui";

export const metadata: Metadata = { title: "Moyen de paiement (démonstration)", robots: { index: false, follow: false } };

// F24 (FR-015) : remplace, pendant la démonstration, la page sécurisée de Stripe où le client
// met à jour la carte ou le compte bancaire de ses abonnements. Elle disparaît en mode réel.
export default async function MoyenPaiementDemo({ searchParams }: { searchParams: Promise<{ retour?: string }> }) {
  if (!pagePaiementDemoDisponible()) notFound();
  const { retour } = await searchParams;
  // Seul le chemin de l'adresse de retour est gardé : jamais de redirection vers un autre site.
  let chemin = "/mon-compte/locations";
  try {
    if (retour) chemin = new URL(retour, "http://site.local").pathname;
  } catch {
    // adresse de retour illisible : retour à Mon compte
  }
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-12">
      <Logo />
      <Kicker>Moyen de paiement — démonstration</Kicker>
      <h1 className="text-h2 font-light">Mettre à jour votre carte ou votre compte bancaire</h1>
      <p className="ec-box--info p-4">
        Démonstration : ici, le client mettrait à jour sa carte ou son compte bancaire sur la page sécurisée de Stripe. Aucune donnée
        bancaire n’est demandée.
      </p>
      <ButtonLink href={chemin}>Revenir au site</ButtonLink>
    </main>
  );
}
