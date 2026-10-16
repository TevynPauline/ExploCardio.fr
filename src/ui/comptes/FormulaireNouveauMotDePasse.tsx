"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { MESSAGE_MOT_DE_PASSE, motDePasseConforme } from "@/domaine/comptes/motdepasse";
import { authClient } from "@/lib/auth-client";
import { Button } from "../Button";
import { Champ } from "../Champ";
import { ReglesMotDePasse } from "./ReglesMotDePasse";

/** Choix d'un nouveau mot de passe à partir du lien reçu (FR-030). */
export function FormulaireNouveauMotDePasse({ jeton }: { jeton: string }) {
  const [mdp, setMdp] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState(false);

  async function envoyer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!motDePasseConforme(mdp)) {
      setErreur(MESSAGE_MOT_DE_PASSE);
      return;
    }
    const { error } = await authClient.resetPassword({ newPassword: mdp, token: jeton });
    if (error) {
      setErreur("Ce lien n'est plus valable. Demandez-en un nouveau.");
      return;
    }
    setFait(true);
  }

  if (fait) {
    return (
      <div role="status" className="flex flex-col gap-3">
        <p>Votre mot de passe est modifié. Vos autres sessions ont été fermées.</p>
        <p><Link href="/connexion" className="ec-btn ec-btn--primary">Se connecter</Link></p>
      </div>
    );
  }
  return (
    <form onSubmit={envoyer} className="flex flex-col gap-3" noValidate>
      <Champ
        id="nouveau"
        name="nouveau"
        type="password"
        libelle="Nouveau mot de passe"
        autoComplete="new-password"
        value={mdp}
        onChange={(e) => setMdp(e.target.value)}
        aria-describedby="regles-nouveau"
        erreur={erreur}
      />
      <ReglesMotDePasse id="regles-nouveau" motDePasse={mdp} />
      <div><Button type="submit">Enregistrer le mot de passe</Button></div>
    </form>
  );
}
