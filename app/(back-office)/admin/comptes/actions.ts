"use server";

import { redirect } from "next/navigation";
import { refuser, retablir, suspendre, valider } from "@/domaine/comptes/validation";
import { exigerAdministrateur, exigerEquipe } from "@/lib/roles";
import { ecrireParametre } from "@/lib/parametres";
import { invaliderDepuisAction } from "@/lib/cache";
import { dbSite } from "@/lib/db/site";

// Décisions sur les comptes (FR-012 à FR-016). Chaque décision est journalisée par le domaine.

async function auteur() {
  const { user } = await exigerEquipe(["admin", "commercial"]);
  return { id: user.id, libelle: `${user.name} (${user.email})` };
}

function retour(chemin: string, r: { ok: string } | { erreur: string }): never {
  redirect(`${chemin}?${new URLSearchParams(r).toString()}`);
}

export async function decider(d: FormData) {
  const a = await auteur();
  const id = String(d.get("id"));
  const decision = String(d.get("decision"));
  const motif = String(d.get("motif") ?? "");
  const chemin = `/admin/comptes/${id}`;
  try {
    if (decision === "valider") await valider(id, a);
    else if (decision === "refuser") await refuser(id, a, motif);
    else if (decision === "suspendre") await suspendre(id, a, motif);
    else if (decision === "retablir") await retablir(id, a);
    else retour(chemin, { erreur: "Décision inconnue." });
  } catch (e) {
    if (e instanceof Error && !("digest" in e)) retour(chemin, { erreur: e.message });
    throw e;
  }
  retour(chemin, { ok: "Décision enregistrée. Le professionnel a été prévenu par email." });
}

export async function enregistrerReglages(d: FormData) {
  const { user } = await exigerAdministrateur();
  const specialites = String(d.get("specialites") ?? "").split("\n").map((x) => x.trim()).filter(Boolean);
  if (!specialites.length) retour("/admin/comptes/reglages", { erreur: "Indiquez au moins une spécialité (une par ligne)." });
  const valeurs: Record<string, string> = {
    "comptes.validation_auto": d.get("validationAuto") === "oui" ? "true" : "false",
    "bienvenue.active": d.get("bienvenueActive") === "oui" ? "true" : "false",
    "comptes.specialites": JSON.stringify(specialites),
  };
  for (const [cle, valeur] of Object.entries(valeurs)) {
    const avant = await dbSite().parametre.findUnique({ where: { cle } });
    if (avant?.valeur === valeur) continue;
    await ecrireParametre(cle, valeur, user.id);
    await dbSite().journalAction.create({
      data: { auteurId: user.id, auteur: `${user.name} (${user.email})`, action: "comptes.reglage", objet: cle, detail: { avant: avant?.valeur ?? null, apres: valeur } },
    });
  }
  invaliderDepuisAction("contenus");
  retour("/admin/comptes/reglages", { ok: "Réglages enregistrés." });
}
