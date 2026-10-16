"use server";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { CHAMP_PIEGE, verifierEnvoi } from "@/domaine/anti-robots";
import { DELAI_MINIMAL_MS, enregistrerMessage, validerContact, type ErreursContact, type SaisieContact } from "@/domaine/contact";
import { lireParametresPublics } from "@/domaine/contenus";
import { adresseVisiteur, autoriserEnvoi } from "@/domaine/limites";
import { demanderInscription } from "@/domaine/newsletter";

// Actions des formulaires publics de F01 (US5) : contact et newsletter.

export type EtatContact = {
  statut: "initial" | "erreurs" | "envoye" | "limite" | "refuse";
  erreurs: ErreursContact;
  saisie: SaisieContact;
};

const COOKIE_SESSION = "ec_session_formulaire";

async function identifiantSession(): Promise<string> {
  const jar = await cookies();
  let id = jar.get(COOKIE_SESSION)?.value;
  if (!id) {
    id = randomUUID();
    jar.set(COOKIE_SESSION, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 86_400 });
  }
  return id;
}

const texte = (d: FormData, cle: string) => String(d.get(cle) ?? "");

export async function envoyerContact(_precedent: EtatContact, donnees: FormData): Promise<EtatContact> {
  const saisie: SaisieContact = {
    motif: texte(donnees, "motif"),
    nom: texte(donnees, "nom"),
    email: texte(donnees, "email"),
    telephone: texte(donnees, "telephone"),
    cabinet: texte(donnees, "cabinet"),
    message: texte(donnees, "message"),
  };
  const robot = verifierEnvoi(texte(donnees, "jeton"), texte(donnees, CHAMP_PIEGE), DELAI_MINIMAL_MS);
  if (robot === "suspect") return { statut: "refuse", erreurs: {}, saisie };
  if (robot === "trop-rapide") return { statut: "refuse", erreurs: {}, saisie };

  const { motifs } = await lireParametresPublics();
  const erreurs = validerContact(saisie, motifs);
  if (Object.keys(erreurs).length) return { statut: "erreurs", erreurs, saisie };

  if (!(await autoriserEnvoi("contact", adresseVisiteur(await headers()), await identifiantSession()))) {
    return { statut: "limite", erreurs: {}, saisie };
  }
  await enregistrerMessage(saisie);
  return { statut: "envoye", erreurs: {}, saisie: { ...saisie, message: "" } };
}

export type EtatNewsletter = { statut: "initial" | "envoye" | "erreur" | "limite"; message?: string; email: string };

export async function inscrireNewsletter(_precedent: EtatNewsletter, donnees: FormData): Promise<EtatNewsletter> {
  const email = texte(donnees, "email").trim();
  if (verifierEnvoi(texte(donnees, "jeton"), texte(donnees, CHAMP_PIEGE), 1500) !== "ok") {
    return { statut: "erreur", message: "L'inscription n'a pas pu être enregistrée. Réessayez dans un instant.", email };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { statut: "erreur", message: "Indiquez une adresse email valide.", email };
  }
  if (donnees.get("consentement") !== "oui") {
    return { statut: "erreur", message: "Cochez la case pour accepter de recevoir la newsletter.", email };
  }
  if (!(await autoriserEnvoi("newsletter", adresseVisiteur(await headers()), await identifiantSession()))) {
    return { statut: "limite", message: "Trop de demandes. Réessayez dans une heure.", email };
  }
  await demanderInscription(email);
  // Même réponse que l'adresse soit déjà inscrite ou non (R7).
  return { statut: "envoye", email: "" };
}
