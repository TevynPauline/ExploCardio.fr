import { BandeauDemo } from "@/ui/BandeauDemo";
import { EnTete } from "@/ui/en-tete/EnTete";
import { PageIntrouvable } from "@/ui/PageIntrouvable";
import { PiedDePage } from "@/ui/PiedDePage";

// Page introuvable à la charte, avec l'en-tête et le pied de page du site (R12).
export default function Introuvable() {
  return (
    <>
      <BandeauDemo />
      <EnTete />
      <main id="contenu">
        <PageIntrouvable />
      </main>
      <PiedDePage />
    </>
  );
}
