"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { compteCourant } from "@/domaine/comptes/session";
import { executerDesinscription, objetConnu } from "@/domaine/emailing/desinscription";
import { lireJeton } from "@/domaine/emailing/jetons";
import { changerPreference } from "@/domaine/emailing/preferences";

// Préférences d'emails (F10, US4) : depuis « Mon compte », ou par le lien signé d'un email,
// sans connexion. Chaque changement est prouvé (date, origine) par le module des préférences.

const t = (d: FormData, cle: string) => String(d.get(cle) ?? "");

export async function actionPreferenceCompte(d: FormData) {
  const { compte } = await compteCourant("/mon-compte/preferences");
  const type = t(d, "type");
  if (objetConnu(type) && type !== "newsletter") await changerPreference(compte.utilisateur.email, type, t(d, "actif") === "oui", "mon_compte");
  revalidatePath("/mon-compte/preferences");
  redirect("/mon-compte/preferences?ok=Votre%20pr%C3%A9f%C3%A9rence%20est%20enregistr%C3%A9e.");
}

export async function actionPreferenceJeton(d: FormData) {
  const jeton = t(d, "jeton");
  const email = lireJeton(jeton);
  const type = t(d, "type");
  if (!email || !objetConnu(type) || type === "newsletter") redirect(`/preferences/${encodeURIComponent(jeton)}?erreur=lien`);
  await changerPreference(email, type, t(d, "actif") === "oui", "lien_email");
  redirect(`/preferences/${encodeURIComponent(jeton)}?ok=preference`);
}

export async function actionDesinscriptionJeton(d: FormData) {
  const jeton = t(d, "jeton");
  const ok = await executerDesinscription(jeton, t(d, "objet"), "lien_email");
  redirect(`/preferences/${encodeURIComponent(jeton)}?ok=${ok ? "desinscription" : ""}${ok ? "" : "&erreur=lien"}`);
}
