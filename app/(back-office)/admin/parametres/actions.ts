"use server";

import { redirect } from "next/navigation";
import { definition, modifierParametre, ParametreRefuse, remettreValeur } from "@/domaine/parametres";
import { dbSite } from "@/lib/db/site";
import { auteurAvecDroit, type RoleEquipe } from "@/lib/droits";

// Écran Paramètres (F13, US4) : l'offre de bienvenue est modifiable par le commercial, le
// reste par l'administrateur seul (D2, D3).

const t = (d: FormData, cle: string) => String(d.get(cle) ?? "");

async function auteur(cle: string) {
  const a = await auteurAvecDroit(definition(cle)?.theme === "bienvenue" ? "parametres.bienvenue" : "parametres", "modifier");
  return { auteur: { id: a.id, libelle: a.libelle }, role: a.role as RoleEquipe };
}

function retour(d: FormData, cle: string, r: { ok: string } | { erreur: string }): never {
  const chemin = t(d, "retour").startsWith("/admin/parametres") ? t(d, "retour") : "/admin/parametres";
  const [base, requete] = chemin.split("?");
  const p = new URLSearchParams(requete);
  for (const [k, v] of Object.entries(r)) p.set(k, v);
  redirect(`${base}?${p.toString()}#${cle.replace(/\./g, "-")}`);
}

export async function actionModifierParametre(d: FormData) {
  const cle = t(d, "cle");
  const { auteur: a, role } = await auteur(cle);
  let change: boolean;
  try {
    change = await modifierParametre(cle, (nom) => t(d, nom), t(d, "lue"), a, role);
  } catch (e) {
    if (e instanceof ParametreRefuse) retour(d, cle, { erreur: e.message });
    throw e;
  }
  retour(d, cle, { ok: change ? `${definition(cle)!.libelle} : enregistré.` : `${definition(cle)!.libelle} : valeur inchangée.` });
}

export async function actionRemettreParametre(d: FormData) {
  const ligne = await dbSite().historiqueParametre.findUnique({ where: { id: t(d, "historique") }, select: { cle: true } });
  const cle = ligne?.cle ?? "";
  const { auteur: a, role } = await auteur(cle);
  try {
    const p = await remettreValeur(t(d, "historique"), a, role);
    retour(d, cle, { ok: `${p.libelle} : valeur remise.` });
  } catch (e) {
    if (e instanceof ParametreRefuse) retour(d, cle, { erreur: e.message });
    throw e;
  }
}
