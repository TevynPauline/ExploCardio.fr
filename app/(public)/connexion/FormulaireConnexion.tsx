"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { Button, Champ } from "@/ui";

export function FormulaireConnexion() {
  const router = useRouter();
  const brut = useSearchParams().get("retour") ?? "/mon-compte";
  // Retour vers une page du site uniquement (jamais vers un autre site).
  const retour = brut.startsWith("/") && !brut.startsWith("//") ? brut : "/mon-compte";
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
      setErreur(
        error.status === 403
          ? "Confirmez d'abord votre adresse email : un lien vous a été envoyé. Vous pouvez en demander un nouveau depuis la page « Consultez votre boîte email »."
          : error.status === 429
            ? "Trop de tentatives rapprochées. Patientez quelques secondes avant de réessayer."
            : "Email ou mot de passe incorrect.",
      );
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
