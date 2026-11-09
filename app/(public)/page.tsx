import { Fragment, type ReactNode } from "react";
import { lireOrganisation, lireParametresPublics, lireRaisons, lireTuiles } from "@/domaine/contenus";
import { blocsAffiches, cibleApresAnimation, type BlocAccueil } from "@/domaine/organisation-accueil";
import { lireAnimation, lireVignettes } from "@/domaine/vignettes";
import { liensContact } from "@/lib/contact-whatsapp";
import { BlocContact } from "@/ui/accueil/BlocContact";
import { Carrousel } from "@/ui/accueil/Carrousel";
import { GammesPhares } from "@/ui/accueil/GammesPhares";
import { OffreDigitale } from "@/ui/accueil/OffreDigitale";
import { Pourquoi } from "@/ui/accueil/pourquoi/Pourquoi";
import { TroisTemps } from "@/ui/accueil/trois-temps/TroisTemps";

// Page d'accueil (F01, US1 ; F16 ; F20 ; F23) : blocs déplaçables dans l'ordre enregistré au
// back-office (animation, gammes phares, « Pourquoi choisir », offre digitale, carrousel), puis
// le bloc contact, toujours en dernier. Un seul titre principal (F23, FR-012).
export default async function Accueil() {
  const [organisation, animation, tuiles, raisons, vignettes, parametres, contact] = await Promise.all([
    lireOrganisation(),
    lireAnimation(),
    lireTuiles(),
    lireRaisons(),
    lireVignettes(),
    lireParametresPublics(),
    liensContact(),
  ]);
  const blocs = blocsAffiches(organisation, (b) => (b === "offres" ? vignettes.length > 0 : b === "gammes" ? tuiles.length > 0 : true));
  const animationEnTete = blocs[0] === "animation";

  const rendu: Record<BlocAccueil, () => ReactNode> = {
    animation: () => <TroisTemps textes={animation} titrePrincipal={animationEnTete} differee={!animationEnTete} cible={cibleApresAnimation(blocs)} />,
    gammes: () => <GammesPhares tuiles={tuiles} />,
    pourquoi: () => <Pourquoi raisons={raisons} />,
    "offre-digitale": () => (
      <OffreDigitale badgeLogicielCloud={parametres.badgeLogicielCloud} whatsapp={contact?.ecrire ?? "/qui-sommes-nous#contact"} />
    ),
    offres: () => <Carrousel vignettes={vignettes} />,
  };

  return (
    <>
      {animationEnTete ? null : <h1 className="sr-only">{animation.accroche}</h1>}
      {blocs.map((b) => (
        <Fragment key={b}>{rendu[b]()}</Fragment>
      ))}
      <BlocContact parametres={parametres} />
    </>
  );
}
