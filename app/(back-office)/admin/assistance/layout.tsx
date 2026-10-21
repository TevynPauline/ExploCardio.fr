import type { ReactNode } from "react";
import { exigerDroit } from "@/lib/droits";

// Assistance en lecture seule (F06, US6, D7) : toute l'équipe ; les droits se gèrent dans Odoo.
export default async function MiseEnPageAssistance({ children }: { children: ReactNode }) {
  await exigerDroit("clients", "voir");
  return <>{children}</>;
}
