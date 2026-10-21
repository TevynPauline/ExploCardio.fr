import type { ReactNode } from "react";
import { exigerDroit } from "@/lib/droits";

// Commandes du site en lecture seule (F04, US8) : toute l'équipe ; elles se gèrent dans Odoo.
export default async function MiseEnPageCommandes({ children }: { children: ReactNode }) {
  await exigerDroit("commandes", "voir");
  return <>{children}</>;
}
