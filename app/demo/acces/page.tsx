import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button, Card, Champ, Logo } from "@/ui";
import { entrer } from "./actions";

export const metadata: Metadata = { title: "Accès au site de démonstration", robots: { index: false, follow: false } };

// Saisie du mot de passe du site de démonstration (T084, FR-034).
export default async function AccesDemo({
  searchParams,
}: {
  searchParams: Promise<{ retour?: string; erreur?: string }>;
}) {
  if (process.env.SITE_MODE === "prod") notFound();
  const { retour = "/", erreur } = await searchParams;
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <Logo priority />
      <h1 className="text-h2 font-light">Site de démonstration</h1>
      <p className="text-muted">
        Ce site présente ExploCardio.fr avec des données fictives. Il est réservé aux personnes
        qui ont reçu le mot de passe.
      </p>
      <Card>
        <form action={entrer} className="flex flex-col gap-4">
          <input type="hidden" name="retour" value={retour} />
          <Champ
            id="motDePasse"
            name="motDePasse"
            type="password"
            libelle="Mot de passe de démonstration"
            autoComplete="current-password"
            required
            erreur={erreur ? "Mot de passe incorrect." : null}
          />
          <Button type="submit">Entrer</Button>
        </form>
      </Card>
    </main>
  );
}
