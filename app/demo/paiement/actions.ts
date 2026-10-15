"use server";

import { redirect } from "next/navigation";
import { paiementDemo } from "@/connecteurs/demonstration";
import type { MoyenPaiement, TypeCarte } from "@/connecteurs/stripe/interfaces";

export async function payer(donnees: FormData) {
  const session = String(donnees.get("session"));
  const moyenBrut = String(donnees.get("moyen"));
  const moyen: MoyenPaiement = moyenBrut === "sepa" ? "sepa" : "carte";
  const carte = (["visa", "mastercard", "amex"].includes(moyenBrut) ? moyenBrut : null) as TypeCarte | null;
  const issueBrute = String(donnees.get("issue"));
  const issue = issueBrute === "refuse" ? "refuse" : issueBrute === "authentification" ? "authentification" : "accepte";
  const { redirection } = await paiementDemo.choisirIssue(session, {
    issue,
    moyen,
    carte,
    repete: donnees.get("repete") === "oui",
    tardif: donnees.get("tardif") === "oui",
  });
  redirect(redirection);
}

/** Étape d'authentification forte simulée (3-D Secure). */
export async function authentifier(donnees: FormData) {
  const session = String(donnees.get("session"));
  const reussie = donnees.get("resultat") === "reussie";
  const { redirection } = await paiementDemo.choisirIssue(session, {
    issue: reussie ? "accepte" : "refuse",
    moyen: "carte",
    carte: null,
    repete: false,
    tardif: false,
  });
  redirect(redirection);
}
