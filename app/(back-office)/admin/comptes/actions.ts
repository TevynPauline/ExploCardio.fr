"use server";

import { redirect } from "next/navigation";
import { refuser, retablir, suspendre, valider } from "@/domaine/comptes/validation";
import { refuserNumero, verifierNumero } from "@/domaine/comptes/verification-numero";
import { exigerDroit } from "@/lib/droits";

// Décisions sur les comptes (FR-012 à FR-016). Chaque décision est journalisée par le domaine.

async function auteur(droit: "comptes.valider" | "comptes.suspendre") {
  const { user } = await exigerDroit(droit, "modifier");
  return { id: user.id, libelle: `${user.name} (${user.email})` };
}

function retour(chemin: string, r: { ok: string } | { erreur: string }): never {
  redirect(`${chemin}?${new URLSearchParams(r).toString()}`);
}

export async function decider(d: FormData) {
  const decision = String(d.get("decision"));
  // Valider ou refuser, vérifier ou refuser un numéro : administrateur et commercial ; suspendre ou
  // rétablir : administrateur (F13, D2). F16 : le refus d'un numéro suspend le compte, y compris
  // quand il est décidé par le commercial ; le rétablissement reste à l'administrateur.
  const a = await auteur(["suspendre", "retablir"].includes(decision) ? "comptes.suspendre" : "comptes.valider");
  const id = String(d.get("id"));
  const motif = String(d.get("motif") ?? "");
  const chemin = `/admin/clients/${id}`;
  try {
    if (decision === "valider") await valider(id, a);
    else if (decision === "refuser") await refuser(id, a, motif);
    else if (decision === "suspendre") await suspendre(id, a, motif);
    else if (decision === "retablir") await retablir(id, a);
    else if (decision === "numero_verifie") await verifierNumero(id, a);
    else if (decision === "numero_refuse") await refuserNumero(id, a, motif);
    else retour(chemin, { erreur: "Décision inconnue." });
  } catch (e) {
    if (e instanceof Error && !("digest" in e)) retour(chemin, { erreur: e.message });
    throw e;
  }
  retour(chemin, { ok: "Décision enregistrée. Le professionnel a été prévenu par email." });
}
