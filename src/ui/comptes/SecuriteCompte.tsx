"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { FormulaireActivation } from "@app/(public)/connexion/activer-double-authentification/FormulaireActivation";
import { MESSAGE_MOT_DE_PASSE, motDePasseConforme } from "@/domaine/comptes/motdepasse";
import { authClient } from "@/lib/auth-client";
import { Button } from "../Button";
import { Champ } from "../Champ";
import { ReglesMotDePasse } from "./ReglesMotDePasse";

/** Changement de mot de passe et double authentification (US3, FR-033). */
export function SecuriteCompte({ doubleAuthActive }: { doubleAuthActive: boolean }) {
  const router = useRouter();
  const [nouveau, setNouveau] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [activer, setActiver] = useState(false);

  async function changer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const actuel = String(new FormData(e.currentTarget).get("actuel"));
    if (!motDePasseConforme(nouveau)) return setMessage({ ok: false, texte: MESSAGE_MOT_DE_PASSE });
    const { error } = await authClient.changePassword({ currentPassword: actuel, newPassword: nouveau, revokeOtherSessions: true });
    setMessage(error ? { ok: false, texte: "Le mot de passe actuel est incorrect." } : { ok: true, texte: "Mot de passe modifié. Vos autres sessions ont été fermées." });
  }

  async function desactiver(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const password = String(new FormData(e.currentTarget).get("mdp-2fa"));
    const { error } = await authClient.twoFactor.disable({ password });
    if (error) return setMessage({ ok: false, texte: "Mot de passe incorrect." });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      {message ? <p role={message.ok ? "status" : "alert"} className={message.ok ? "ec-box--info p-3" : "ec-box--promo p-3 font-medium"}>{message.texte}</p> : null}
      <form onSubmit={changer} className="flex max-w-md flex-col gap-3" noValidate>
        <h2 className="text-h3 font-semibold">Changer de mot de passe</h2>
        <Champ id="actuel" name="actuel" type="password" libelle="Mot de passe actuel" autoComplete="current-password" required />
        <Champ id="nouveau-mdp" name="nouveau" type="password" libelle="Nouveau mot de passe" autoComplete="new-password" value={nouveau} onChange={(e) => setNouveau(e.target.value)} aria-describedby="regles-securite" />
        <ReglesMotDePasse id="regles-securite" motDePasse={nouveau} />
        <div><Button type="submit">Changer de mot de passe</Button></div>
      </form>
      <section className="flex max-w-md flex-col gap-3" aria-labelledby="titre-2fa">
        <h2 id="titre-2fa" className="text-h3 font-semibold">Double authentification</h2>
        {doubleAuthActive ? (
          <form onSubmit={desactiver} className="flex flex-col gap-3">
            <p>La double authentification est <strong>activée</strong> : un code de votre application vous est demandé à chaque connexion.</p>
            <Champ id="mdp-2fa" name="mdp-2fa" type="password" libelle="Votre mot de passe" autoComplete="current-password" required />
            <div><Button type="submit" variante="secondaire">Désactiver la double authentification</Button></div>
          </form>
        ) : activer ? (
          <FormulaireActivation retour="/mon-compte/securite" />
        ) : (
          <>
            <p>Facultative pour votre compte : elle ajoute un code à usage unique, fourni par une application sur votre téléphone, après votre mot de passe.</p>
            <div><Button type="button" onClick={() => setActiver(true)}>Activer la double authentification</Button></div>
          </>
        )}
      </section>
    </div>
  );
}
