import type { ReactNode } from "react";
import { exigerEquipe } from "@/lib/roles";

// Comptes professionnels (F02, US2) : administrateur et commercial (D5).
export default async function MiseEnPageComptes({ children }: { children: ReactNode }) {
  await exigerEquipe(["admin", "commercial"]);
  return <>{children}</>;
}
