import type { ReactNode } from "react";
import { exigerEquipe } from "@/lib/roles";

// Catalogue (F03, US6) : rédaction et publication par l'administrateur ; lecture pour le commercial.
export default async function MiseEnPageCatalogue({ children }: { children: ReactNode }) {
  await exigerEquipe(["admin", "commercial"]);
  return <>{children}</>;
}
