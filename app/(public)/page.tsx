import { lireParametresPublics, lireTuiles } from "@/domaine/contenus";
import { lireArguments, lireVignettes } from "@/domaine/vignettes";
import { liensContact } from "@/lib/contact-whatsapp";
import { AccesRapide } from "@/ui/accueil/AccesRapide";
import { BlocContact } from "@/ui/accueil/BlocContact";
import { Carrousel } from "@/ui/accueil/Carrousel";
import { OffreDigitale } from "@/ui/accueil/OffreDigitale";
import { Pourquoi } from "@/ui/accueil/Pourquoi";
import { ServiceFidelite } from "@/ui/accueil/ServiceFidelite";

// Page d'accueil (F01, US1 ; F16, FR-009) : carrousel, accès rapides, « Pourquoi préférer
// ExploCardio.fr », service et fidélité, offre digitale, contact.
export default async function Accueil() {
  const [vignettes, tuiles, argumentsAccueil, parametres, contact] = await Promise.all([
    lireVignettes(),
    lireTuiles(),
    lireArguments(),
    lireParametresPublics(),
    liensContact(),
  ]);
  return (
    <>
      {/* Titre de la page (accessibilité, référencement), sans grand bandeau (F16, FR-011). */}
      <h1 className="sr-only">ExploCardio.fr — Le spécialiste des explorations fonctionnelles cardiaques</h1>
      <Carrousel vignettes={vignettes} />
      <AccesRapide tuiles={tuiles} />
      <Pourquoi argumentsAccueil={argumentsAccueil} />
      <ServiceFidelite engagements={parametres.engagementsReactivite} />
      <OffreDigitale badgeLogicielCloud={parametres.badgeLogicielCloud} whatsapp={contact?.ecrire ?? "/qui-sommes-nous#contact"} />
      <BlocContact parametres={parametres} />
    </>
  );
}
