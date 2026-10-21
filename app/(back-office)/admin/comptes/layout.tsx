import type { ReactNode } from "react";
import { exigerDroit } from "@/lib/droits";

// Comptes professionnels (F02, US2) : rubrique « Clients » (F13, D2) ; le support y est en lecture seule.
export default async function MiseEnPageComptes({ children }: { children: ReactNode }) {
  await exigerDroit("clients", "voir");
  return <>{children}</>;
}
