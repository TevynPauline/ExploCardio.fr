import type { ReactNode } from "react";
import { exigerDroit } from "@/lib/droits";

// Garde de rubrique (F13, D2) : clients ; le support y est en lecture seule.
export default async function Garde({ children }: { children: ReactNode }) {
  await exigerDroit("clients", "voir");
  return children;
}
