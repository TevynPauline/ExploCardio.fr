import type { ReactNode } from "react";
import { exigerDroit } from "@/lib/droits";

// Catalogue (F03, US6) : rédaction et publication par l'administrateur ; lecture pour le commercial.
export default async function MiseEnPageCatalogue({ children }: { children: ReactNode }) {
  await exigerDroit("catalogue", "voir");
  return <>{children}</>;
}
