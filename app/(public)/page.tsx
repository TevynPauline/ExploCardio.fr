import { lireParametresPublics, lireTuiles } from "@/domaine/contenus";
import { lireAnimation, lireVignettes } from "@/domaine/vignettes";
import { AccesRapide } from "@/ui/accueil/AccesRapide";
import { BlocContact } from "@/ui/accueil/BlocContact";
import { Carrousel } from "@/ui/accueil/Carrousel";
import { TroisTemps } from "@/ui/accueil/trois-temps/TroisTemps";

// Page d'accueil (F01, US1 ; F16 ; F20, FR-015) : animation « Les trois temps » (dont la phrase
// d'accroche est le titre de la page), six cartes, carrousel, contact.
export default async function Accueil() {
  const [animation, tuiles, vignettes, parametres] = await Promise.all([lireAnimation(), lireTuiles(), lireVignettes(), lireParametresPublics()]);
  return (
    <>
      <TroisTemps textes={animation} />
      <AccesRapide tuiles={tuiles} />
      <Carrousel vignettes={vignettes} />
      <BlocContact parametres={parametres} />
    </>
  );
}
