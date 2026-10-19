import type { ReactNode } from "react";
import { exigerEquipe } from "@/lib/roles";

// Locations en lecture seule (F05, US8) : toute l'équipe ; elles se gèrent dans Odoo.
export default async function MiseEnPageLocations({ children }: { children: ReactNode }) {
  await exigerEquipe(["admin", "commercial", "support"]);
  return <>{children}</>;
}
