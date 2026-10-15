import type { Metadata } from "next";
import { Button, Card, Kicker } from "@/ui";
import { reinitialiser } from "./actions";

export const metadata: Metadata = { title: "Réinitialiser la démonstration" };

export default async function Reinitialiser({
  searchParams,
}: {
  searchParams: Promise<{ fait?: string; erreur?: string }>;
}) {
  const { fait, erreur } = await searchParams;
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Kicker>Démonstration</Kicker>
      <h1 className="text-h2 font-light">Réinitialiser la démonstration</h1>

      {fait ? (
        <p role="status" className="ec-box--info p-4">
          La démonstration a été réinitialisée en {(Number(fait) / 1000).toFixed(1)} s. Les cinq comptes
          de démonstration ont été recréés avec leurs identifiants habituels.
        </p>
      ) : null}

      <Card>
        <h2 className="text-h3 font-semibold">Ce qui est remis à l’état de départ</h2>
        <ul className="mt-2 list-disc pl-6">
          <li>toute la base de démonstration : produits, prix, stocks, clients fictifs, commandes, factures, locations, bons d’achat ;</li>
          <li>les comptes clients créés pendant les séances, les demandes de financement et de devis, les messages de contact ;</li>
          <li>la boîte de démonstration et les pannes simulées ;</li>
          <li>les cinq comptes de démonstration, recréés.</li>
        </ul>
        <h2 className="mt-6 text-h3 font-semibold">Ce qui est conservé</h2>
        <ul className="mt-2 list-disc pl-6">
          <li>les contenus (pages, bandeau, FAQ, tutoriels) et les contenus produits ;</li>
          <li>les paramètres du site et leur historique, le journal des actions ;</li>
          <li>les comptes de l’équipe créés dans le back-office.</li>
        </ul>
      </Card>

      <form action={reinitialiser} className="flex flex-col gap-4">
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="confirmation" value="oui" required className="size-5" />
          <span>Je confirme la réinitialisation. Elle ne peut pas être annulée.</span>
        </label>
        {erreur === "confirmation" ? (
          <p role="alert" className="font-medium">
            Cochez la case de confirmation pour réinitialiser.
          </p>
        ) : null}
        <div>
          <Button type="submit">Réinitialiser la démonstration</Button>
        </div>
      </form>
    </div>
  );
}
