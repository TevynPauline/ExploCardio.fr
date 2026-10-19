"use server";

import { redirect } from "next/navigation";
import { compteConnecte } from "@/domaine/comptes/session";
import { lancerPaiement } from "@/domaine/commande/paiement";
import {
  SaisieInvalide,
  TunnelRefuse,
  choisirLivraison,
  choisirPaiement,
  commandeDuCompte,
  enregistrerAdresses,
  ouvrirCommande,
  type Adresses,
} from "@/domaine/commande/tunnel";

// Étapes du tunnel de commande (F04, US2) : chaque étape enregistre ses saisies dans la
// commande du site ; en cas d'erreur, la saisie est renvoyée telle quelle (FR-008, FR-021).

export type EtatEtape = { erreurs: Record<string, string>; message?: string; saisie?: Record<string, string> };

const t = (d: FormData, n: string) => String(d.get(n) ?? "");

async function commandeCourante(ref: string) {
  const compte = await compteConnecte();
  if (!compte) redirect("/connexion?retour=/panier");
  const c = ref ? await commandeDuCompte(compte.id, ref) : null;
  if (c) return c;
  try {
    return await ouvrirCommande(compte.id);
  } catch (e) {
    if (e instanceof TunnelRefuse) redirect(e.redirection);
    throw e;
  }
}

export async function actionAdresses(_e: EtatEtape, d: FormData): Promise<EtatEtape> {
  const commande = await commandeCourante(t(d, "ref"));
  const lire = (p: string) => ({ ligne1: t(d, `${p}.ligne1`), ligne2: t(d, `${p}.ligne2`), codePostal: t(d, `${p}.codePostal`), ville: t(d, `${p}.ville`) });
  const adresses: Adresses = { livraison: lire("livraison"), facturation: d.get("identique") === "oui" ? lire("livraison") : lire("facturation") };
  try {
    await enregistrerAdresses(commande, adresses);
  } catch (e) {
    if (e instanceof SaisieInvalide) {
      return { erreurs: e.erreurs, message: "Vos adresses n'ont pas été enregistrées : corrigez les champs signalés.", saisie: Object.fromEntries([...d.entries()].map(([k, v]) => [k, String(v)])) };
    }
    throw e;
  }
  redirect(`/commande/livraison?ref=${commande.ref}`);
}

export async function actionLivraison(d: FormData) {
  const commande = await commandeCourante(t(d, "ref"));
  try {
    const dates = Object.fromEntries([...d.entries()].filter(([k]) => k.startsWith("date.")).map(([k, v]) => [k.slice(5), String(v)]));
    await choisirLivraison(commande, t(d, "mode") || null, dates);
  } catch (e) {
    if (e instanceof SaisieInvalide) redirect(`/commande/livraison?ref=${commande.ref}&erreur=${encodeURIComponent(Object.values(e.erreurs).join(" "))}`);
    throw e;
  }
  redirect(`/commande/paiement?ref=${commande.ref}`);
}

export async function actionPaiement(d: FormData) {
  const commande = await commandeCourante(t(d, "ref"));
  const moyen = (n: string) => (["carte", "sepa", "virement"].includes(t(d, n)) ? (t(d, n) as "carte" | "sepa" | "virement") : null);
  try {
    await choisirPaiement(commande, moyen("achat"), moyen("abonnement"));
  } catch (e) {
    if (e instanceof SaisieInvalide) redirect(`/commande/paiement?ref=${commande.ref}&erreur=${encodeURIComponent(Object.values(e.erreurs).join(" "))}`);
    throw e;
  }
  redirect(`/commande/recapitulatif?ref=${commande.ref}`);
}

export async function actionPayer(_e: EtatEtape, d: FormData): Promise<EtatEtape> {
  const commande = await commandeCourante(t(d, "ref"));
  let lancement;
  try {
    lancement = await lancerPaiement(commande, d.get("cgv") === "oui", d.get("conditions") === "oui");
  } catch (e) {
    if (e instanceof SaisieInvalide) return { erreurs: e.erreurs, message: Object.values(e.erreurs).join(" ") };
    throw e;
  }
  if (lancement.type === "redirection" && lancement.message) {
    redirect(`${lancement.url}${lancement.url.includes("?") ? "&" : "?"}alerte=${encodeURIComponent(lancement.message)}`);
  }
  redirect(lancement.url);
}
