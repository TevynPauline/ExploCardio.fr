import type { ReactNode } from "react";
import { exigerEquipe } from "@/lib/roles";

// Commandes du site en lecture seule (F04, US8) : toute l'équipe ; elles se gèrent dans Odoo.
export default async function MiseEnPageCommandes({ children }: { children: ReactNode }) {
  await exigerEquipe(["admin", "commercial", "support"]);
  return <>{children}</>;
}
