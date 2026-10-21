"use server";

import { redirect } from "next/navigation";
import { suivreDevis, suivreMessage, SuiviRefuse, type Suivi } from "@/domaine/demandes/suivi";
import { auteurAvecDroit } from "@/lib/droits";

// Suivi des messages de contact et des demandes de devis (F13, US6) : administrateur et commercial.

const t = (d: FormData, cle: string) => String(d.get(cle) ?? "");

function suivi(d: FormData): Suivi {
  return { etat: t(d, "etat"), notes: t(d, "notes"), modifieLeLu: t(d, "modifieLe") };
}

async function executer(d: FormData, chemin: string, operation: (id: string, a: { id: string; libelle: string }) => Promise<void>): Promise<never> {
  const a = await auteurAvecDroit("demandes", "modifier");
  const id = t(d, "id");
  const retour = t(d, "retour").startsWith(chemin) ? t(d, "retour") : chemin;
  const [base, requete] = retour.split("?");
  const p = new URLSearchParams(requete);
  try {
    await operation(id, { id: a.id, libelle: a.libelle });
    p.set("ok", "Suivi enregistré.");
  } catch (e) {
    if (!(e instanceof SuiviRefuse)) throw e;
    p.set("erreur", e.message);
  }
  redirect(`${base}?${p.toString()}#demande-${id}`);
}

export async function actionSuivreMessage(d: FormData) {
  await executer(d, "/admin/demandes/messages", (id, a) => suivreMessage(id, suivi(d), a));
}

export async function actionSuivreDevis(d: FormData) {
  await executer(d, "/admin/devis", (id, a) => suivreDevis(id, suivi(d), a));
}
