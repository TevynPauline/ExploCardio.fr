import { render } from "@react-email/render";
import { BoutonEmail, Gabarit, Paragraphe } from "./Gabarit";

// Modèles d'emails rendus par le site avant l'envoi (contracts/emailing.md).

export type EmailRendu = { modele: string; objet: string; rendu: string };

export async function emailEssai(): Promise<EmailRendu> {
  const objet = "Message d'essai";
  return {
    modele: "essai",
    objet,
    rendu: await render(
      <Gabarit apercu="Message d'essai de la boîte de démonstration" titre={objet}>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>Ce message vérifie l’affichage des emails aux couleurs d’ExploCardio.fr.</Paragraphe>
      </Gabarit>,
    ),
  };
}

export async function emailReinitialisationMotDePasse(lien: string): Promise<EmailRendu> {
  const objet = "Réinitialiser votre mot de passe";
  return {
    modele: "reinitialisation_mot_de_passe",
    objet,
    rendu: await render(
      <Gabarit apercu="Lien pour choisir un nouveau mot de passe" titre={objet}>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>
          Vous avez demandé à réinitialiser votre mot de passe. Ce lien est valable une heure.
        </Paragraphe>
        <BoutonEmail href={lien}>Choisir un nouveau mot de passe</BoutonEmail>
        <Paragraphe>Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.</Paragraphe>
      </Gabarit>,
    ),
  };
}

export async function emailConfirmationAdresse(lien: string): Promise<EmailRendu> {
  const objet = "Confirmez votre adresse email";
  return {
    modele: "confirmation_adresse",
    objet,
    rendu: await render(
      <Gabarit apercu="Un clic pour confirmer votre adresse" titre={objet}>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>Merci de confirmer votre adresse email pour poursuivre votre inscription.</Paragraphe>
        <BoutonEmail href={lien}>Confirmer mon adresse</BoutonEmail>
      </Gabarit>,
    ),
  };
}
