"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { Button, Champ } from "@/ui";

type Etape = { uri: string; codesSecours: string[] } | null;

function secretDepuisUri(uri: string): string {
  return new URL(uri).searchParams.get("secret") ?? "";
}

export function FormulaireActivation({ retour = "/admin" }: { retour?: string }) {
  const router = useRouter();
  const [etape, setEtape] = useState<Etape>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function demarrer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    const password = String(new FormData(e.currentTarget).get("motDePasse"));
    const { data, error } = await authClient.twoFactor.enable({ password });
    if (error || !data || data.method !== "totp") {
      setErreur("Mot de passe incorrect.");
      return;
    }
    setEtape({ uri: data.totpURI, codesSecours: data.backupCodes });
  }

  async function verifier(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    const code = String(new FormData(e.currentTarget).get("code")).replace(/\s/g, "");
    const { error } = await authClient.twoFactor.verifyTotp({ code });
    if (error) {
      setErreur("Ce code n'est pas valide. Vérifiez l'heure de votre téléphone et réessayez.");
      return;
    }
    router.push(retour);
    router.refresh();
  }

  if (!etape) {
    return (
      <form onSubmit={demarrer} className="flex flex-col gap-4" noValidate>
        <Champ id="motDePasse" name="motDePasse" type="password" libelle="Votre mot de passe" autoComplete="current-password" required erreur={erreur} />
        <Button type="submit">Continuer</Button>
      </form>
    );
  }

  return (
    <form onSubmit={verifier} className="flex flex-col gap-4" noValidate>
      <p>
        Dans votre application d’authentification, ajoutez un compte avec cette clé :
      </p>
      <p className="break-all rounded-sm bg-pale p-3 font-medium tracking-wide">{secretDepuisUri(etape.uri)}</p>
      <p className="text-small text-muted">
        Codes de secours, à conserver en lieu sûr (chacun ne sert qu’une fois) :
      </p>
      <ul className="grid grid-cols-2 gap-1 text-small" aria-label="Codes de secours">
        {etape.codesSecours.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <Champ id="code" name="code" libelle="Code à 6 chiffres affiché par l'application" inputMode="numeric" autoComplete="one-time-code" required erreur={erreur} />
      <Button type="submit">Activer la double authentification</Button>
    </form>
  );
}
