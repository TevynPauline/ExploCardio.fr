import { render } from "@react-email/render";
import type { ReactNode } from "react";
import { lireParametre } from "@/lib/parametres";
import { contactEmail } from "./contact";
import { Gabarit, type FamilleGabarit, type PiedPreferences } from "./Gabarit";

// Rendu commun des emails (F10, R12) : gabarit de la charte, version HTML et version texte
// (lecteurs d'écran, clients sans HTML). Tous les modèles passent par ici.

export type EmailRendu = { modele: string; objet: string; rendu: string; texte: string };

export type OptionsRendu = {
  modele: string;
  objet: string;
  apercu: string;
  /** Titre affiché dans la carte ; l'objet par défaut. */
  titre?: string;
  famille?: FamilleGabarit;
  /** Service et commercial : raison de l'envoi et liens de préférences (FR-041, FR-023). */
  pied?: PiedPreferences;
  corps: ReactNode;
};

export async function adresseExpediteur(): Promise<string> {
  return (await lireParametre("contact.adresse"))?.trim() ?? "";
}

export async function rendreEmail(o: OptionsRendu): Promise<EmailRendu> {
  const [contact, adresse, expediteur] = await Promise.all([contactEmail(), adresseExpediteur(), lireParametre("emailing.expediteur_nom")]);
  const element = (
    <Gabarit
      contact={contact}
      apercu={o.apercu}
      titre={o.titre ?? o.objet}
      famille={o.famille ?? "transactionnel"}
      pied={o.pied}
      expediteur={expediteur ?? "ExploCardio.fr"}
      adresse={adresse}
    >
      {o.corps}
    </Gabarit>
  );
  const [rendu, texte] = await Promise.all([render(element), render(element, { plainText: true })]);
  return { modele: o.modele, objet: o.objet, rendu, texte };
}
