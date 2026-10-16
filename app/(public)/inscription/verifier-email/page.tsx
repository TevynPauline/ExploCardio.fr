import type { Metadata } from "next";
import { Card, Kicker } from "@/ui";
import { FormulaireRenvoi } from "@/ui/comptes/FormulaireRenvoi";

export const metadata: Metadata = { title: "Confirmez votre adresse" };

export default function VerifierEmail() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10">
      <Kicker>Compte professionnel</Kicker>
      <h1 className="text-display font-light">Consultez votre boîte email</h1>
      <p>
        Nous vous avons envoyé un lien pour confirmer votre adresse. Il est valable 24 heures. Une fois l’adresse
        confirmée, notre équipe vérifie votre compte.
      </p>
      <Card>
        <h2 className="mb-3 text-h3 font-semibold">Vous n’avez rien reçu ?</h2>
        <p className="mb-3 text-small text-muted">Vérifiez vos courriers indésirables, ou demandez un nouvel envoi.</p>
        <FormulaireRenvoi />
      </Card>
    </div>
  );
}
