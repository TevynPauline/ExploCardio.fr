import type { ReactNode } from "react";
import { BandeauApercu } from "@/ui/BandeauApercu";
import { BandeauPromo } from "@/ui/BandeauPromo";
import { EnTete } from "@/ui/en-tete/EnTete";
import { PanneauCookies } from "@/ui/PanneauCookies";
import { jetonAffichage } from "@/domaine/anti-robots";
import { FormulaireNewsletter } from "@/ui/FormulaireNewsletter";
import { PiedDePage } from "@/ui/PiedDePage";

// Mise en page de toutes les pages publiques (F01) : bandeau promotionnel (en période de
// promotion), en-tête fixe, contenu, pied de page, information ou consentement aux cookies.
// Le bandeau de démonstration de F11 reste au-dessus (app/layout.tsx).
export default function MiseEnPagePublique({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-surface focus:p-3">
        Aller au contenu
      </a>
      <BandeauApercu />
      <BandeauPromo />
      <EnTete />
      <main id="contenu" tabIndex={-1} className="min-h-[60vh] focus:outline-none">
        {children}
      </main>
      <PiedDePage newsletter={<FormulaireNewsletter jeton={jetonAffichage()} />} />
      <PanneauCookies />
    </>
  );
}
