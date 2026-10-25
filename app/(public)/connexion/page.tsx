import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { cheminDeRetour } from "@/lib/retour";
import { Card } from "@/ui";
import { FormulaireConnexion } from "./FormulaireConnexion";
import { FilAriane } from "@/ui/FilAriane";

export const metadata: Metadata = { title: "Connexion" };

// Page de connexion (F02, US3), dans la mise en page publique.
export default async function Connexion({ searchParams }: { searchParams: Promise<{ retour?: string; raison?: string }> }) {
  const p = await searchParams;
  const retour = cheminDeRetour(p.retour);
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
      <FilAriane etapes={[{ libelle: "Connexion" }]} />
      <h1 className="text-h2 font-light">Connexion</h1>
      {/* F13 (D5) : session de l'équipe fermée après inactivité. */}
      {p.raison === "inactivite" ? (
        <p role="status" className="ec-box--promo p-4">Votre session a été fermée après une période d’inactivité. Reconnectez-vous pour continuer.</p>
      ) : null}
      <Card>
        <Suspense>
          <FormulaireConnexion />
        </Suspense>
        <p className="mt-4 text-small">
          <Link href="/mot-de-passe-oublie">Mot de passe oublié ?</Link>
        </p>
      </Card>
      <p>
        Pas encore de compte ? <Link href={retour ? `/inscription?retour=${encodeURIComponent(retour)}` : "/inscription"}>Créer un compte professionnel</Link>
      </p>
    </div>
  );
}
