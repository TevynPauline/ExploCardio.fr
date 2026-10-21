import type { ReactNode } from "react";
import { exigerDroit } from "@/lib/droits";

// Garde de rubrique (F13, D2) : administrateur et commercial (lecture ; le commercial ne
// modifie que l'offre de bienvenue).
export default async function Garde({ children }: { children: ReactNode }) {
  await exigerDroit("parametres", "voir");
  return children;
}
