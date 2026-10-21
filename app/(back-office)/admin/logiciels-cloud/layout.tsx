import type { ReactNode } from "react";
import { exigerDroit } from "@/lib/droits";

// Accès aux logiciels Cloud (F12, US4, D4) : administrateur et support ; pas les commerciaux.
export default async function MiseEnPageLogicielsCloud({ children }: { children: ReactNode }) {
  await exigerDroit("cloud", "voir");
  return <>{children}</>;
}
