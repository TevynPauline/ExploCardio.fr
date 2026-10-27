import type { ReactNode } from "react";
import { BandeauDemo } from "@/ui/BandeauDemo";

// Pages propres à la démonstration (accès, paiement simulé, plateforme Cloud simulée…).
export default function MiseEnPageDemo({ children }: { children: ReactNode }) {
  return (
    <>
      <BandeauDemo />
      {children}
    </>
  );
}
