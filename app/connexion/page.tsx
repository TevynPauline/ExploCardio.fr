import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, Logo } from "@/ui";
import { FormulaireConnexion } from "./FormulaireConnexion";

export const metadata: Metadata = { title: "Connexion" };

// Page de connexion minimale (F11) ; F02 la complétera (inscription, mot de passe oublié).
export default function Connexion() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <Logo priority />
      <h1 className="text-h2 font-light">Connexion</h1>
      <Card>
        <Suspense>
          <FormulaireConnexion />
        </Suspense>
      </Card>
    </main>
  );
}
