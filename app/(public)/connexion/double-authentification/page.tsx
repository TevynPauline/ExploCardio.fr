import type { Metadata } from "next";
import { Suspense } from "react";
import { Card } from "@/ui";
import { FormulaireCode } from "./FormulaireCode";

export const metadata: Metadata = { title: "Double authentification" };

export default function DoubleAuthentification() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
      <h1 className="text-h2 font-light">Double authentification</h1>
      <p className="text-muted">Saisissez le code affiché par votre application d’authentification.</p>
      <Card>
        <Suspense>
          <FormulaireCode />
        </Suspense>
      </Card>
    </div>
  );
}
