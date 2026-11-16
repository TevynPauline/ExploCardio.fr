"use server";

import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { verifierEnvoi } from "@/domaine/anti-robots";
import { coordonneesDuCompte, enregistrerDemandeInformatique } from "@/domaine/informatique/demandes";
import { validerQuestionnaire, type ErreursQuestionnaire, type SaisieQuestionnaire } from "@/domaine/informatique/questionnaire";
import { adresseVisiteur, autoriserEnvoi } from "@/domaine/limites";
import { sessionCourante } from "@/lib/roles";

// Envoi du questionnaire Informatique médicale (F27, contracts/questionnaire.md) : ouvert à tous,
// sans compte ; anti-robots et limites des formulaires publics.

export type ReponseQuestionnaire =
  | { ok: true }
  | { ok: false; erreurs: ErreursQuestionnaire; etape: 0 | 1 | 2 }
  | { ok: false; motif: "robot" | "limite" };

const DELAI_MINIMAL_MS = 5000;
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

export async function envoyerDemandeInformatique(saisie: SaisieQuestionnaire, jeton: string, piege: string): Promise<ReponseQuestionnaire> {
  if (verifierEnvoi(jeton, piege, DELAI_MINIMAL_MS) !== "ok") return { ok: false, motif: "robot" };
  const { erreurs, etape } = validerQuestionnaire(saisie);
  if (etape !== null) return { ok: false, erreurs, etape };
  if (!(await autoriserEnvoi("informatique", adresseVisiteur(await headers()), await identifiantSession()))) {
    return { ok: false, motif: "limite" };
  }
  const session = await sessionCourante().catch(() => null);
  const compte = session ? await coordonneesDuCompte(session.user.id) : null;
  await enregistrerDemandeInformatique(saisie, compte?.compteId ?? null);
  return { ok: true };
}
