"use server";

import { redirect } from "next/navigation";
import { changerRole, desactiver, EquipeRefusee, inviter, reactiver, renvoyerInvitation } from "@/domaine/equipe";
import { auteurAvecDroit, type RoleEquipe } from "@/lib/droits";

// Actions de Back-office → Équipe (F13, US9, D4) : administrateur seulement, journalisées.

const t = (d: FormData, cle: string) => String(d.get(cle) ?? "");

function retour(r: { ok: string } | { erreur: string }): never {
  redirect(`/admin/equipe?${new URLSearchParams(r).toString()}`);
}

async function executer(succes: string, operation: (a: { id: string; libelle: string }) => Promise<unknown>): Promise<never> {
  const a = await auteurAvecDroit("equipe", "modifier");
  try {
    await operation(a);
  } catch (e) {
    if (e instanceof EquipeRefusee) retour({ erreur: e.message });
    throw e;
  }
  retour({ ok: succes });
}

export async function actionInviter(d: FormData) {
  const email = t(d, "email").trim().toLowerCase();
  await executer(`Invitation envoyée à ${email}.`, (a) => inviter({ nom: t(d, "nom"), email, role: t(d, "role") as RoleEquipe }, a));
}

export async function actionRenvoyer(d: FormData) {
  await executer("Invitation renvoyée.", (a) => renvoyerInvitation(t(d, "id"), a));
}

export async function actionRole(d: FormData) {
  await executer("Rôle modifié.", (a) => changerRole(t(d, "id"), t(d, "role") as RoleEquipe, a));
}

export async function actionDesactiver(d: FormData) {
  await executer("Accès désactivé : la personne ne peut plus se connecter.", (a) => desactiver(t(d, "id"), a));
}

export async function actionReactiver(d: FormData) {
  await executer("Accès réactivé.", (a) => reactiver(t(d, "id"), a));
}
