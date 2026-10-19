"use server";

import { redirect } from "next/navigation";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { compteConnecte } from "@/domaine/comptes/session";
import { ActionLocationRefusee, annuler, passerAlAchat, prolonger, reporter, resilier } from "@/domaine/location/gestion";

// Actions du client sur ses locations (F05, US3, US4, US7). Chaque location est gérée séparément.

const CHEMIN = "/mon-compte/locations";
const t = (d: FormData, n: string) => String(d.get(n) ?? "").trim();

async function compte() {
  const c = await compteConnecte();
  if (!c) redirect(`/connexion?retour=${CHEMIN}`);
  return c;
}

function retour(r: { ok: string } | { erreur: string }, chemin = CHEMIN): never {
  redirect(`${chemin}?${new URLSearchParams(r).toString()}`);
}

async function executer(operation: () => Promise<unknown>, succes: string, cheminErreur = CHEMIN): Promise<never> {
  try {
    await operation();
  } catch (e) {
    if (e instanceof ActionLocationRefusee) retour({ erreur: e.message }, cheminErreur);
    if (estErreurConnecteur(e)) retour({ erreur: "Le service est momentanément indisponible : réessayez dans quelques instants." }, cheminErreur);
    throw e;
  }
  retour({ ok: succes });
}

export async function actionResilier(d: FormData) {
  const c = await compte();
  const ref = t(d, "ref");
  await executer(() => resilier(c.id, ref), "Votre résiliation est enregistrée : vous recevez la confirmation et les instructions de retour par email.", `${CHEMIN}/${encodeURIComponent(ref)}/resilier`);
}

export async function actionProlonger(d: FormData) {
  const c = await compte();
  await executer(() => prolonger(c.id, t(d, "ref")), "Votre location continue : la résiliation est annulée.");
}

export async function actionAnnuler(d: FormData) {
  const c = await compte();
  await executer(() => annuler(c.id, t(d, "ref")), "Votre mise à disposition est annulée et intégralement remboursée.");
}

export async function actionReporter(d: FormData) {
  const c = await compte();
  await executer(() => reporter(c.id, t(d, "ref"), t(d, "date")), "La nouvelle date de livraison est enregistrée.");
}

export async function actionPasserAchat(d: FormData) {
  const c = await compte();
  try {
    await passerAlAchat(c.id, t(d, "ref"));
  } catch (e) {
    if (e instanceof ActionLocationRefusee) retour({ erreur: e.message });
    throw e;
  }
  redirect("/panier?depuis=location");
}
