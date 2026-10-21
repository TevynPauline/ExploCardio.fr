"use server";

import { redirect } from "next/navigation";
import { reinitialiserDemonstration } from "@/connecteurs/demonstration";
import { exigerDroit } from "@/lib/droits";

export async function reinitialiser(donnees: FormData) {
  const { user } = await exigerDroit("demonstration", "modifier");
  if (donnees.get("confirmation") !== "oui") {
    redirect("/admin/demonstration/reinitialiser?erreur=confirmation");
  }
  const bilan = await reinitialiserDemonstration({ id: user.id, libelle: `${user.name} (${user.email})` });
  // L'administrateur de démonstration est recréé : sa session est fermée, il se reconnecte.
  redirect(`/admin/demonstration/reinitialiser?fait=${bilan.dureeMs}`);
}
