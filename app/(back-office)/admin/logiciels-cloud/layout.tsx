import type { ReactNode } from "react";
import { exigerEquipe } from "@/lib/roles";

// Accès aux logiciels Cloud (F12, US4, D4) : administrateur et support ; pas les commerciaux.
export default async function MiseEnPageLogicielsCloud({ children }: { children: ReactNode }) {
  await exigerEquipe(["admin", "support"]);
  return <>{children}</>;
}
