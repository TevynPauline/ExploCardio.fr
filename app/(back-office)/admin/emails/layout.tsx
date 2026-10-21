import type { ReactNode } from "react";
import { exigerDroit } from "@/lib/droits";

// Garde de rubrique (F13, D2) : la page ne s'ouvre pas sans le droit de voir « emails ».
export default async function Garde({ children }: { children: ReactNode }) {
  await exigerDroit("emails", "voir");
  return children;
}
