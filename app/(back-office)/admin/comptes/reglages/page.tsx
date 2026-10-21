import { redirect } from "next/navigation";

// Ancienne adresse (F02) : la validation et les spécialités sont dans Paramètres › Comptes,
// l'offre de bienvenue dans Paramètres › Offre de bienvenue (F13, D3).
export default function Reglages() {
  redirect("/admin/parametres?theme=comptes");
}
