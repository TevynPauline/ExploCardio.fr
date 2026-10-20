import type { ReactNode } from "react";
import { exigerEquipe } from "@/lib/roles";

// Demandes de devis et d'intérêt (F03, F12) : administrateur et commerciaux ; F13 complétera le suivi.
export default async function MiseEnPageDevis({ children }: { children: ReactNode }) {
  await exigerEquipe(["admin", "commercial"]);
  return <>{children}</>;
}
