import type { ReactNode } from "react";
import { exigerEquipe } from "@/lib/roles";

// Assistance en lecture seule (F06, US6, D7) : toute l'équipe ; les droits se gèrent dans Odoo.
export default async function MiseEnPageAssistance({ children }: { children: ReactNode }) {
  await exigerEquipe(["admin", "commercial", "support"]);
  return <>{children}</>;
}
