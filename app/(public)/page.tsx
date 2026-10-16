import {
  lireActualites,
  lireMarques,
  lireParametresPublics,
  lireTuiles,
} from "@/domaine/contenus";
import { liensContact } from "@/lib/contact-whatsapp";
import { AccesRapide } from "@/ui/accueil/AccesRapide";
import { Actualites } from "@/ui/accueil/Actualites";
import { BlocContact } from "@/ui/accueil/BlocContact";
import { Equipements } from "@/ui/accueil/Equipements";
import { Heros } from "@/ui/accueil/Heros";
import { OffreBienvenue } from "@/ui/accueil/OffreBienvenue";
import { OffreDigitale } from "@/ui/accueil/OffreDigitale";
import { ServiceFidelite } from "@/ui/accueil/ServiceFidelite";

// Page d'accueil (US1, FR-015) : les 8 sections dans l'ordre.
export default async function Accueil() {
  const [tuiles, marques, actualites, parametres, contact] = await Promise.all([
    lireTuiles(),
    lireMarques(),
    lireActualites(),
    lireParametresPublics(),
    liensContact(),
  ]);
  return (
    <>
      <Heros />
      <AccesRapide tuiles={tuiles} />
      <Equipements marques={marques} />
      <OffreDigitale badgeLogicielCloud={parametres.badgeLogicielCloud} whatsapp={contact.ecrire} />
      <OffreBienvenue texte={parametres.offreBienvenue} />
      <ServiceFidelite engagements={parametres.engagementsReactivite} />
      <Actualites actualites={actualites} />
      <BlocContact parametres={parametres} />
    </>
  );
}
