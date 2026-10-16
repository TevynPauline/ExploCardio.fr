import type { Metadata } from "next";
import Link from "next/link";
import { Card, Kicker } from "@/ui";
import { FormulaireNouveauMotDePasse } from "@/ui/comptes/FormulaireNouveauMotDePasse";

export const metadata: Metadata = { title: "Nouveau mot de passe", robots: { index: false } };

// Arrivée du lien de réinitialisation (Better Auth redirige ici avec ?token= ou ?error=).
export default async function Reinitialiser({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
      <Kicker>Compte</Kicker>
      <h1 className="text-h2 font-light">Choisir un nouveau mot de passe</h1>
      <Card>
        {token && !error ? (
          <FormulaireNouveauMotDePasse jeton={token} />
        ) : (
          <p>
            Ce lien n’est plus valable. <Link href="/mot-de-passe-oublie">Demander un nouveau lien</Link>
          </p>
        )}
      </Card>
    </div>
  );
}
