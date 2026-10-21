import type { ReactNode } from "react";
import { exigerDroit } from "@/lib/droits";

// Demandes de financement (F04, US8) : administrateur et commercial ; pas le support.
export default async function MiseEnPageFinancements({ children }: { children: ReactNode }) {
  await exigerDroit("demandes", "voir");
  return <>{children}</>;
}
