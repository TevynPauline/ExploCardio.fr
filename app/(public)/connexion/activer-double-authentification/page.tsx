import type { Metadata } from "next";
import { Card } from "@/ui";
import { FormulaireActivation } from "./FormulaireActivation";

export const metadata: Metadata = { title: "Activer la double authentification" };

// Obligatoire pour l'équipe avant tout accès au back-office (F13).
export default function ActiverDoubleAuthentification() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
      <h1 className="text-h2 font-light">Activer la double authentification</h1>
      <p className="text-muted">
        L’accès au back-office exige un code à usage unique, fourni par une application
        d’authentification sur votre téléphone.
      </p>
      <Card>
        <FormulaireActivation />
      </Card>
    </div>
  );
}
