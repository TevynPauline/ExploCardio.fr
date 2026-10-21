"use server";

import { redirect } from "next/navigation";
import { enregistrerBrouillon, PageRefusee, publierPage, revenirOrigine } from "@/domaine/pages";
import { auteurAvecDroit } from "@/lib/droits";

// Textes des pages (F13, US2, D8, D9) : administrateur et commercial, journalisés.

const t = (d: FormData, cle: string) => String(d.get(cle) ?? "");

async function executer(nom: string, succes: string, operation: (a: { id: string; libelle: string }) => Promise<void>): Promise<never> {
  const a = await auteurAvecDroit("contenus", "modifier");
  const chemin = `/admin/contenus/pages/${encodeURIComponent(nom)}`;
  try {
    await operation(a);
  } catch (e) {
    if (e instanceof PageRefusee) redirect(`${chemin}?${new URLSearchParams({ erreur: e.message }).toString()}`);
    throw e;
  }
  redirect(`${chemin}?${new URLSearchParams({ ok: succes }).toString()}`);
}

export type EtatBrouillon = { erreur?: string; texte?: string };

/** Brouillon refusé (titre manquant, version périmée) : la saisie est renvoyée, rien n'est perdu. */
export async function actionBrouillonPage(_etat: EtatBrouillon, d: FormData): Promise<EtatBrouillon> {
  const a = await auteurAvecDroit("contenus", "modifier");
  const nom = t(d, "nom");
  try {
    await enregistrerBrouillon(nom, t(d, "texte"), t(d, "modifieLe") || null, a);
  } catch (e) {
    if (e instanceof PageRefusee) return { erreur: e.message, texte: t(d, "texte") };
    throw e;
  }
  redirect(`/admin/contenus/pages/${encodeURIComponent(nom)}?${new URLSearchParams({ ok: "Brouillon enregistré : vérifiez l’aperçu, puis publiez." }).toString()}`);
}

export async function actionPublierPage(d: FormData) {
  const nom = t(d, "nom");
  await executer(nom, "Texte publié : la page du site est à jour.", (a) => publierPage(nom, t(d, "modifieLe") || null, a));
}

export async function actionOriginePage(d: FormData) {
  const nom = t(d, "nom");
  await executer(nom, "Texte d’origine rétabli.", (a) => revenirOrigine(nom, a));
}
