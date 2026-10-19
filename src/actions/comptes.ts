"use server";

import { cheminDeRetour } from "@/lib/retour";
import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { CHAMP_PIEGE, verifierEnvoi } from "@/domaine/anti-robots";
import { inscrire, type AdresseSaisie, type ErreursInscription, type SaisieInscription } from "@/domaine/comptes/inscription";
import { adresseVisiteur, autoriserEnvoi } from "@/domaine/limites";
import { auth } from "@/lib/auth";

// Actions publiques des comptes (F02, US1).

export type EtatInscription = { erreurs: ErreursInscription; message?: string; saisie: Record<string, string> };

const t = (d: FormData, cle: string) => String(d.get(cle) ?? "");

function adresse(d: FormData, prefixe: string): AdresseSaisie {
  return { ligne1: t(d, `${prefixe}.ligne1`), ligne2: t(d, `${prefixe}.ligne2`), codePostal: t(d, `${prefixe}.codePostal`), ville: t(d, `${prefixe}.ville`) };
}

async function session(): Promise<string> {
  const jar = await cookies();
  let id = jar.get("ec_session_formulaire")?.value;
  if (!id) {
    id = randomUUID();
    jar.set("ec_session_formulaire", id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 86_400 });
  }
  return id;
}

export async function actionInscription(_precedent: EtatInscription, d: FormData): Promise<EtatInscription> {
  // Conserve la saisie (sauf le mot de passe) pour la réafficher en cas d'erreur (FR-043).
  const saisie = Object.fromEntries([...d.entries()].filter(([k, v]) => typeof v === "string" && k !== "motDePasse" && !k.startsWith("$")).map(([k, v]) => [k, String(v)]));
  if (verifierEnvoi(t(d, "jeton"), t(d, CHAMP_PIEGE), 3000) !== "ok") {
    return { erreurs: {}, message: "Votre inscription n'a pas pu être enregistrée. Patientez quelques secondes puis réessayez.", saisie };
  }
  if (!(await autoriserEnvoi("inscription", adresseVisiteur(await headers()), await session()))) {
    return { erreurs: {}, message: "Trop de tentatives. Réessayez dans une heure ou contactez-nous.", saisie };
  }
  const s: SaisieInscription = {
    civilite: t(d, "civilite"),
    prenom: t(d, "prenom"),
    nom: t(d, "nom"),
    specialite: t(d, "specialite"),
    type: t(d, "type") === "structure" ? "structure" : "medecin",
    numero: t(d, "numero"),
    cabinet: t(d, "cabinet"),
    telephone: t(d, "telephone"),
    email: t(d, "email"),
    motDePasse: t(d, "motDePasse"),
    adresseCabinet: adresse(d, "adresseCabinet"),
    adresseLivraison: d.get("livraisonIdentique") === "oui" ? "cabinet" : adresse(d, "adresseLivraison"),
    adresseFacturation: d.get("facturationIdentique") === "oui" ? "cabinet" : adresse(d, "adresseFacturation"),
    cguCgv: d.get("cguCgv") === "oui",
    newsletter: d.get("newsletter") === "oui",
  };
  const r = await inscrire(s, cheminDeRetour(t(d, "retour")));
  if (!r.ok) return { erreurs: r.erreurs, message: r.message, saisie };
  redirect("/inscription/verifier-email");
}

export type EtatRenvoi = { statut: "initial" | "envoye" | "limite" };

/** Renvoi de l'email de confirmation : 3 par heure au plus ; même réponse dans tous les cas. */
export async function actionRenvoiConfirmation(_p: EtatRenvoi, d: FormData): Promise<EtatRenvoi> {
  const email = t(d, "email").trim().toLowerCase();
  const adresseIp = adresseVisiteur(await headers());
  if (!(await autoriserEnvoi(`renvoi:${email}`, adresseIp, await session(), new Date(), 3))) {
    return { statut: "limite" };
  }
  try {
    await auth.api.sendVerificationEmail({ body: { email, callbackURL: "/inscription/email-confirme" } });
  } catch {
    // Adresse inconnue ou déjà confirmée : même réponse (SC-012).
  }
  return { statut: "envoye" };
}
