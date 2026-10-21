import type { ReactNode } from "react";
import { exigerDroit } from "@/lib/droits";

// Demandes de devis et d'intérêt (F03, F12) : administrateur et commerciaux ; F13 complétera le suivi.
export default async function MiseEnPageDevis({ children }: { children: ReactNode }) {
  await exigerDroit("demandes", "voir");
  return <>{children}</>;
}
