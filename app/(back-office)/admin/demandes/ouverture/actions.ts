"use server";

import { redirect } from "next/navigation";
import { supprimerInscriptionOuverture } from "@/domaine/ouverture";
import { auteurAvecDroit } from "@/lib/droits";

// Suppression d'une inscription à l'ouverture (F17, FR-008) : demande RGPD, journalisée.
export async function actionSupprimerInscriptionOuverture(d: FormData) {
  const a = await auteurAvecDroit("demandes", "modifier");
  const ok = await supprimerInscriptionOuverture(String(d.get("id") ?? ""), { id: a.id, libelle: a.libelle });
  const p = new URLSearchParams(ok ? { ok: "Inscription supprimée." } : { erreur: "Cette inscription n’existe plus." });
  redirect(`/admin/demandes/ouverture?${p.toString()}`);
}
