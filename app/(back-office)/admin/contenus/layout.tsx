import type { ReactNode } from "react";
import { exigerAdministrateur } from "@/lib/roles";

// Mini back-office des contenus (F01, US6) : administrateurs uniquement, double
// authentification obligatoire (F11). F13 reprendra et étendra ces écrans.
export default async function MiseEnPageContenus({ children }: { children: ReactNode }) {
  await exigerAdministrateur();
  return <>{children}</>;
}
