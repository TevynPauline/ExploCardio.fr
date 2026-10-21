"use server";

import { exigerDroit } from "@/lib/droits";
import { redirect } from "next/navigation";
import type { StatutDemandeFinancement } from "@generated/site/client";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { ActionRefusee, ajouterNote, changerStatut, creerCommandeFinancee } from "@/domaine/financement/administration";

// Actions sur une demande de financement (FR-036, FR-038, FR-039), journalisées par le domaine.

async function auteur() {
  const { user } = await exigerDroit("demandes", "modifier");
  return { id: user.id, libelle: `${user.name} (${user.email})` };
}

function retour(id: string, r: { ok: string } | { erreur: string }): never {
  redirect(`/admin/financements/${id}?${new URLSearchParams(r).toString()}`);
}

async function executer(id: string, succes: string, operation: () => Promise<unknown>): Promise<never> {
  try {
    await operation();
  } catch (e) {
    if (e instanceof ActionRefusee || estErreurConnecteur(e)) retour(id, { erreur: e.message });
    throw e;
  }
  retour(id, { ok: succes });
}

export async function actionStatut(d: FormData) {
  const a = await auteur();
  const id = String(d.get("id"));
  await executer(id, "Statut enregistré : le client a été prévenu par email.", () => changerStatut(id, String(d.get("statut")) as StatutDemandeFinancement, a));
}

export async function actionNote(d: FormData) {
  const a = await auteur();
  const id = String(d.get("id"));
  await executer(id, "Note interne ajoutée.", () => ajouterNote(id, String(d.get("note") ?? ""), a));
}

export async function actionCommandeFinancee(d: FormData) {
  const a = await auteur();
  const id = String(d.get("id"));
  await executer(id, "Commande financée créée dans Odoo : visible par le client dans « Mon compte ».", () => creerCommandeFinancee(id, a));
}
