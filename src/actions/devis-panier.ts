"use server";

import { redirect } from "next/navigation";
import { compteConnecte, compteCourant } from "@/domaine/comptes/session";
import { commanderDevis, demanderDevis, type ResultatDevis } from "@/domaine/commande/devis-client";

// Devis depuis le panier et commande d'un devis (F16, US6).

export type EtatDevisPanier = { statut: "initial" } | { statut: "cree"; ref: string } | { statut: "refuse"; motif: Exclude<ResultatDevis, { ok: true }>["motif"]; message: string };

export async function actionRecevoirDevis(): Promise<EtatDevisPanier> {
  const compte = await compteConnecte();
  // FR-018 : un visiteur se connecte ou s'inscrit, puis revient au panier.
  if (!compte) redirect("/connexion?retour=%2Fpanier");
  const r = await demanderDevis(compte.id);
  return r.ok ? { statut: "cree", ref: r.ref } : { statut: "refuse", motif: r.motif, message: r.message };
}

export async function actionCommanderDevis(donnees: FormData): Promise<void> {
  const { compte } = await compteCourant("/mon-compte/devis");
  const r = await commanderDevis(compte.id, String(donnees.get("ref") ?? ""));
  if (!r.ok) redirect(`/mon-compte/devis?refus=${r.code}`);
  // Devis valable : tunnel aux prix du devis ; expiré : panier aux prix du jour (FR-021).
  redirect(r.expire ? "/panier?devis=expire" : "/commande/adresses");
}
