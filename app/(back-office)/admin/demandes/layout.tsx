import type { ReactNode } from "react";
import { exigerDroit } from "@/lib/droits";

// Garde de rubrique (F13, D2) : demandes de financement, de devis et messages de contact.
export default async function Garde({ children }: { children: ReactNode }) {
  await exigerDroit("demandes", "voir");
  return children;
}
