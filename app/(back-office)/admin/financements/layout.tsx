import type { ReactNode } from "react";
import { exigerEquipe } from "@/lib/roles";

// Demandes de financement (F04, US8) : administrateur et commercial ; pas le support.
export default async function MiseEnPageFinancements({ children }: { children: ReactNode }) {
  await exigerEquipe(["admin", "commercial"]);
  return <>{children}</>;
}
