"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { Button, Champ } from "@/ui";

export function FormulaireConnexion() {
  const router = useRouter();
  const retour = useSearchParams().get("retour") ?? "/";
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  async function envoyer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnvoi(true);
    setErreur(null);
    const donnees = new FormData(e.currentTarget);
    const { data, error } = await authClient.signIn.email({
      email: String(donnees.get("email")),
      password: String(donnees.get("motDePasse")),
    });
    setEnvoi(false);
    if (error) {
      setErreur("Adresse email ou mot de passe incorrect.");
      return;
    }
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
      router.push(`/connexion/double-authentification?retour=${encodeURIComponent(retour)}`);
      return;
    }
    router.push(retour);
    router.refresh();
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-4" noValidate>
      <Champ id="email" name="email" type="email" libelle="Adresse email" autoComplete="email" required />
      <Champ
        id="motDePasse"
        name="motDePasse"
        type="password"
        libelle="Mot de passe"
        autoComplete="current-password"
        required
        erreur={erreur}
      />
      <Button type="submit" disabled={envoi}>
        {envoi ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
