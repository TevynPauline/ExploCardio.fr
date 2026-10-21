import type { ReactNode } from "react";
import { exigerDroit } from "@/lib/droits";

// Garde de rubrique (F13, D2) : équipe, administrateur seulement.
export default async function Garde({ children }: { children: ReactNode }) {
  await exigerDroit("equipe", "voir");
  return children;
}
