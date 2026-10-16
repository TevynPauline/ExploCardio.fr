"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { Button, Champ } from "@/ui";

export function FormulaireCode() {
  const router = useRouter();
  const brut = useSearchParams().get("retour") ?? "/mon-compte";
  const retour = brut.startsWith("/") && !brut.startsWith("//") ? brut : "/mon-compte";
  const [erreur, setErreur] = useState<string | null>(null);
  const [secours, setSecours] = useState(false);

  async function envoyer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    const code = String(new FormData(e.currentTarget).get("code")).replace(/\s/g, "");
    const { error } = secours
      ? await authClient.twoFactor.verifyBackupCode({ code })
      : await authClient.twoFactor.verifyTotp({ code });
    if (error) {
      setErreur("Ce code n'est pas valide. Vérifiez-le et réessayez.");
      return;
    }
    router.push(retour);
    router.refresh();
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-4" noValidate>
      <Champ
        id="code"
        name="code"
        libelle={secours ? "Code de secours" : "Code à 6 chiffres de votre application"}
        inputMode={secours ? "text" : "numeric"}
        autoComplete="one-time-code"
        required
        erreur={erreur}
      />
      <Button type="submit">Valider</Button>
      <Button variante="secondaire" onClick={() => setSecours(!secours)}>
        {secours ? "Utiliser le code de l'application" : "Utiliser un code de secours"}
      </Button>
    </form>
  );
}
