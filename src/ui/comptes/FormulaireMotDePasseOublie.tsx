"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "../Button";
import { Champ } from "../Champ";

/** Demande du lien de réinitialisation : même message que l'email soit connu ou non (FR-031). */
export function FormulaireMotDePasseOublie() {
  const [envoye, setEnvoye] = useState(false);
  const [enCours, setEnCours] = useState(false);

  async function envoyer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnCours(true);
    const email = String(new FormData(e.currentTarget).get("email"));
    await authClient.requestPasswordReset({ email, redirectTo: "/reinitialiser-mot-de-passe" });
    setEnCours(false);
    setEnvoye(true);
  }

  return (
    <form onSubmit={envoyer} className="flex flex-col gap-4" noValidate>
      <Champ id="email" name="email" type="email" libelle="Votre adresse email" autoComplete="email" required />
      <div><Button type="submit" disabled={enCours}>Recevoir un lien</Button></div>
      <p role="status">
        {envoye
          ? "Si un compte correspond à cette adresse, vous allez recevoir un lien pour choisir un nouveau mot de passe. Il est valable une heure."
          : ""}
      </p>
    </form>
  );
}
