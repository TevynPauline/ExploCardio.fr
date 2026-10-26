"use server";

import { revalidatePath } from "next/cache";
import { changerAbonnement } from "@/domaine/comptes/newsletter";
import {
  SaisieInvalide,
  demanderChangementEmail,
  demanderChangementNumero,
  mettreAJourAdresses,
  mettreAJourInformations,
  type AdresseSaisie,
} from "@/domaine/comptes/profil";
import { compteCourant } from "@/domaine/comptes/session";

// Actions de « Mon compte » (F02, US5). Erreurs renvoyées champ par champ, saisie conservée.

export type EtatFormulaire = { statut: "initial" | "ok" | "erreurs"; message?: string; erreurs: Record<string, string>; saisie: Record<string, string> };

const t = (d: FormData, cle: string) => String(d.get(cle) ?? "");
const saisieDe = (d: FormData) => Object.fromEntries([...d.entries()].filter(([k, v]) => typeof v === "string" && !k.startsWith("$")).map(([k, v]) => [k, String(v)]));

async function executer(d: FormData, succes: string, operation: () => Promise<void>): Promise<EtatFormulaire> {
  try {
    await operation();
  } catch (e) {
    if (e instanceof SaisieInvalide) return { statut: "erreurs", erreurs: e.erreurs, saisie: saisieDe(d), message: "Vos modifications n'ont pas été enregistrées : corrigez les champs signalés." };
    throw e;
  }
  revalidatePath("/mon-compte", "layout");
  return { statut: "ok", erreurs: {}, saisie: saisieDe(d), message: succes };
}

export async function actionInformations(_p: EtatFormulaire, d: FormData): Promise<EtatFormulaire> {
  const { compte } = await compteCourant("/mon-compte/informations");
  return executer(d, "Vos informations sont enregistrées.", () =>
    mettreAJourInformations(compte.id, { civilite: t(d, "civilite"), prenom: t(d, "prenom"), nom: t(d, "nom"), telephone: t(d, "telephone"), specialite: t(d, "specialite") }),
  );
}

export async function actionEmail(_p: EtatFormulaire, d: FormData): Promise<EtatFormulaire> {
  const { compte } = await compteCourant("/mon-compte/informations");
  return executer(d, "Un lien de confirmation a été envoyé à la nouvelle adresse. Votre adresse actuelle reste valable jusqu'à sa confirmation.", () =>
    demanderChangementEmail(compte.utilisateurId, t(d, "nouvelEmail")),
  );
}

export async function actionNumero(_p: EtatFormulaire, d: FormData): Promise<EtatFormulaire> {
  const { compte } = await compteCourant("/mon-compte/informations");
  return executer(d, "Numéro enregistré : notre équipe le vérifiera prochainement.", () => demanderChangementNumero(compte.id, t(d, "numero")));
}

function adresse(d: FormData, prefixe: string): AdresseSaisie {
  return { ligne1: t(d, `${prefixe}.ligne1`), ligne2: t(d, `${prefixe}.ligne2`), codePostal: t(d, `${prefixe}.codePostal`), ville: t(d, `${prefixe}.ville`), pays: t(d, `${prefixe}.pays`) || undefined };
}

export async function actionAdresses(_p: EtatFormulaire, d: FormData): Promise<EtatFormulaire> {
  const { compte } = await compteCourant("/mon-compte/adresses");
  return executer(d, "Vos adresses sont enregistrées.", () =>
    mettreAJourAdresses(compte.id, { cabinet: adresse(d, "cabinet"), livraison: adresse(d, "livraison"), facturation: adresse(d, "facturation") }),
  );
}

export async function actionNewsletter(d: FormData) {
  const { compte } = await compteCourant("/mon-compte/preferences");
  await changerAbonnement(compte.id, d.get("abonne") === "oui");
  revalidatePath("/mon-compte", "layout");
}
