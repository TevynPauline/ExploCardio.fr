"use server";

import { exigerDroit } from "@/lib/droits";
import { redirect } from "next/navigation";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { confirmerTache, fermerAcces, ouvrirAcces, retablirAcces, suspendreAcces } from "@/domaine/cloud/acces";
import { dbSite } from "@/lib/db/site";

// Actions de l'équipe sur les accès Cloud (F12, FR-015, FR-018, FR-020) : motif obligatoire,
// journalisées avec leur auteur par le domaine ; le client est prévenu.

const CHEMIN = "/admin/logiciels-cloud";
const t = (d: FormData, n: string) => String(d.get(n) ?? "").trim();

async function auteur() {
  const { user } = await exigerDroit("cloud.agir", "modifier");
  return { id: user.id, libelle: `${user.name} (${user.email})` };
}

function retour(q: string, r: { ok: string } | { erreur: string }): never {
  redirect(`${CHEMIN}?${new URLSearchParams({ ...(q ? { q } : {}), ...r }).toString()}`);
}

async function executer(d: FormData, succes: string, operation: (motif: string) => Promise<unknown>): Promise<never> {
  const q = t(d, "q");
  const motif = t(d, "motif");
  if (motif.length < 3) retour(q, { erreur: "Indiquez le motif de l'action." });
  try {
    await operation(motif);
  } catch (e) {
    if (estErreurConnecteur(e)) retour(q, { erreur: `La plateforme Cloud n'a pas répondu : ${e.message}` });
    throw e;
  }
  retour(q, { ok: succes });
}

async function acces(d: FormData) {
  return dbSite().accesLogiciel.findUniqueOrThrow({ where: { id: t(d, "acces") } });
}

export async function actionOuvrir(d: FormData) {
  const a = await auteur();
  await executer(d, "Accès ouvert (ou tâche créée) : le client est prévenu à l'ouverture.", async () => {
    await ouvrirAcces({ compteId: t(d, "compte"), logiciel: t(d, "logiciel"), origine: "manuel", sourceRef: `manuel:${t(d, "compte")}:${t(d, "logiciel")}:${Date.now()}`, debut: new Date(), finPrevue: null }, a);
  });
}

export async function actionSuspendre(d: FormData) {
  const a = await auteur();
  await executer(d, "Accès suspendu : le client est prévenu.", async (motif) => suspendreAcces(await acces(d), motif, a));
}

export async function actionRetablir(d: FormData) {
  const a = await auteur();
  await executer(d, "Accès rétabli : le client est prévenu.", async (motif) => retablirAcces(await acces(d), motif, a));
}

export async function actionFermer(d: FormData) {
  const a = await auteur();
  await executer(d, "Accès fermé (ou tâche de fermeture créée) : le client est prévenu.", async (motif) => fermerAcces(await acces(d), motif, a));
}

export async function actionConfirmerTache(d: FormData) {
  const a = await auteur();
  const q = t(d, "q");
  try {
    await confirmerTache(t(d, "tache"), a);
  } catch (e) {
    if (estErreurConnecteur(e)) retour(q, { erreur: `La plateforme Cloud n'a pas répondu : ${e.message}` });
    throw e;
  }
  retour(q, { ok: "Tâche confirmée : l'accès est à jour et le client est prévenu." });
}
