import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { outilsDemonstrationDisponibles } from "@/connecteurs/demonstration";
import { exigerDroit } from "@/lib/droits";

// Outils de démonstration : administrateur uniquement, et seulement quand le connecteur Odoo est
// en mode démonstration (FR-024, FR-027). En mode réel, ces réglages se font dans Odoo.
export default async function MiseEnPageDemonstration({ children }: { children: ReactNode }) {
  if (!outilsDemonstrationDisponibles()) notFound();
  await exigerDroit("demonstration", "voir");
  return <>{children}</>;
}
