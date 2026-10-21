import type { ReactNode } from "react";
import { exigerDroit } from "@/lib/droits";

// Locations en lecture seule (F05, US8) : toute l'équipe ; elles se gèrent dans Odoo.
export default async function MiseEnPageLocations({ children }: { children: ReactNode }) {
  await exigerDroit("commandes", "voir");
  return <>{children}</>;
}
