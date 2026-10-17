"use server";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { CHAMP_PIEGE, verifierEnvoi } from "@/domaine/anti-robots";
import { envoyerDemandeDevis, validerDevis, type ErreursDevis, type SaisieDevis } from "@/domaine/catalogue/devis";
import { DELAI_MINIMAL_MS } from "@/domaine/contact";
import { adresseVisiteur, autoriserEnvoi } from "@/domaine/limites";

// Demande de devis de l'ECG de repos (F03, US7) : protections et limites des formulaires de F01.

export type EtatDevis = { statut: "initial" | "erreurs" | "envoye" | "limite" | "refuse"; erreurs: ErreursDevis; saisie: SaisieDevis };

const COOKIE_SESSION = "ec_session_formulaire";
const t = (d: FormData, cle: string) => String(d.get(cle) ?? "");

async function identifiantSession(): Promise<string> {
  const jar = await cookies();
  let id = jar.get(COOKIE_SESSION)?.value;
  if (!id) {
    id = randomUUID();
    jar.set(COOKIE_SESSION, id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 86_400 });
  }
  return id;
}

export async function actionDemandeDevis(_e: EtatDevis, d: FormData): Promise<EtatDevis> {
  const saisie: SaisieDevis = {
    besoin: t(d, "besoin"),
    nom: t(d, "nom"),
    email: t(d, "email"),
    telephone: t(d, "telephone"),
    cabinet: t(d, "cabinet"),
    message: t(d, "message"),
  };
  if (verifierEnvoi(t(d, "jeton"), t(d, CHAMP_PIEGE), DELAI_MINIMAL_MS) !== "ok") return { statut: "refuse", erreurs: {}, saisie };
  // Validation avant les limites : une saisie à corriger ne compte pas comme un envoi.
  const erreurs = validerDevis(saisie);
  if (Object.keys(erreurs).length) return { statut: "erreurs", erreurs, saisie };
  if (!(await autoriserEnvoi("devis", adresseVisiteur(await headers()), await identifiantSession()))) {
    return { statut: "limite", erreurs: {}, saisie };
  }
  const r = await envoyerDemandeDevis(saisie);
  if (!r.ok) return { statut: "erreurs", erreurs: r.erreurs, saisie };
  return { statut: "envoye", erreurs: {}, saisie: { ...saisie, besoin: "", message: "" } };
}
