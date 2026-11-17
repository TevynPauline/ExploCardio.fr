"use server";

import { redirect } from "next/navigation";
import { reinitialiserDemonstration } from "@/connecteurs/demonstration";
import { ETIQUETTES, invaliderDepuisAction } from "@/lib/cache";
import { exigerDroit } from "@/lib/droits";

export async function reinitialiser(donnees: FormData) {
  const { user } = await exigerDroit("demonstration", "modifier");
  if (donnees.get("confirmation") !== "oui") {
    redirect("/admin/demonstration/reinitialiser?erreur=confirmation");
  }
  const bilan = await reinitialiserDemonstration({ id: user.id, libelle: `${user.name} (${user.email})` });
  // Toutes les données mises en cache (catalogue, menu, prix, stock, fidélité, contenus) sont
  // relues aussitôt : sans cela, le menu et les pages gardaient l'ancien état jusqu'à 5 minutes.
  invaliderDepuisAction(...Object.values(ETIQUETTES));
  // L'administrateur de démonstration est recréé : sa session est fermée, il se reconnecte.
  redirect(`/admin/demonstration/reinitialiser?fait=${bilan.dureeMs}`);
}
