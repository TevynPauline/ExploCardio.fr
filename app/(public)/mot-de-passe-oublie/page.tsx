import type { Metadata } from "next";
import { Card, Kicker } from "@/ui";
import { FormulaireMotDePasseOublie } from "@/ui/comptes/FormulaireMotDePasseOublie";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function MotDePasseOublie() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
      <Kicker>Compte</Kicker>
      <h1 className="text-h2 font-light">Mot de passe oublié</h1>
      <Card>
        <FormulaireMotDePasseOublie />
      </Card>
    </div>
  );
}
