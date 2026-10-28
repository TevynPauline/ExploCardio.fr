"use server";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { CHAMP_PIEGE, verifierEnvoi } from "@/domaine/anti-robots";
import { adresseVisiteur, autoriserEnvoi } from "@/domaine/limites";
import { inscrireOuverture, validerOuverture, type ErreursOuverture } from "@/domaine/ouverture";

// Page d'attente (F17) : être prévenu de l'ouverture et, si besoin, être recontacté.

export type EtatOuverture = {
  statut: "initial" | "inscrit" | "erreurs" | "limite" | "refuse";
  erreurs: ErreursOuverture;
  saisie: { nom: string; email: string; telephone: string; commentaire: string };
};

/** Inscriptions à la suite depuis un même appareil (tablette au salon) : limite relevée. */
const LIMITE_OUVERTURE_PAR_HEURE = 30;
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

export async function inscrireOuvertureAction(_precedent: EtatOuverture, donnees: FormData): Promise<EtatOuverture> {
  const saisie = { nom: texte(donnees, "nom"), email: texte(donnees, "email"), telephone: texte(donnees, "telephone"), commentaire: texte(donnees, "commentaire") };
  if (verifierEnvoi(texte(donnees, "jeton"), texte(donnees, CHAMP_PIEGE), 1500) !== "ok") {
    return { statut: "refuse", erreurs: {}, saisie };
  }
  const erreurs = validerOuverture({ ...saisie, consentement: donnees.get("consentement") === "oui" });
  if (Object.keys(erreurs).length) return { statut: "erreurs", erreurs, saisie };
  if (!(await autoriserEnvoi("ouverture", adresseVisiteur(await headers()), await identifiantSession(), new Date(), LIMITE_OUVERTURE_PAR_HEURE))) {
    return { statut: "limite", erreurs: {}, saisie };
  }
  await inscrireOuverture({ ...saisie, consentement: true });
  // Formulaire vidé : la personne suivante peut s'inscrire depuis le même appareil.
  return { statut: "inscrit", erreurs: {}, saisie: { nom: "", email: "", telephone: "", commentaire: "" } };
}
