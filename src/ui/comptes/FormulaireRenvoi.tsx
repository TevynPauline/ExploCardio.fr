"use client";

import { useActionState } from "react";
import { actionRenvoiConfirmation, type EtatRenvoi } from "@/actions/comptes";
import { Button } from "../Button";
import { Champ } from "../Champ";

/** Renvoi de l'email de confirmation (3 par heure) ; même réponse que l'adresse existe ou non. */
export function FormulaireRenvoi() {
  const [etat, action, enCours] = useActionState<EtatRenvoi, FormData>(actionRenvoiConfirmation, { statut: "initial" });
  return (
    <form action={action} className="flex flex-col gap-3">
      <Champ id="email-renvoi" name="email" type="email" libelle="Votre adresse email" autoComplete="email" required />
      <div><Button type="submit" variante="secondaire" disabled={enCours}>Renvoyer l’email</Button></div>
      <p role="status" className="text-small">
        {etat.statut === "envoye" ? "Si un compte attend la confirmation de cette adresse, un nouvel email vient de lui être envoyé." : null}
        {etat.statut === "limite" ? "Vous avez déjà demandé plusieurs envois. Réessayez dans une heure." : null}
      </p>
    </form>
  );
}
