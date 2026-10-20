import { BoutonEmail, Paragraphe } from "./Gabarit";
import type { EmailRendu } from "./rendu";
import { rendreModele, type TextesModele } from "./textes";

// Modèles d'emails rendus par le site avant l'envoi (contracts/emailing.md). F10 (D2) : textes
// modifiables au back-office ; liens et boutons fixes.

export type { EmailRendu };

export const TEXTES_GENERAUX = {
  essai: {
    objet: "Message d'essai",
    apercu: "Message d'essai de la boîte de démonstration",
    blocs: { corps: "Bonjour,\n\nCe message vérifie l’affichage des emails aux couleurs d’ExploCardio.fr." },
  },
  reinitialisation_mot_de_passe: {
    objet: "Réinitialiser votre mot de passe",
    apercu: "Lien pour choisir un nouveau mot de passe",
    blocs: {
      corps: "Bonjour,\n\nVous avez demandé à réinitialiser votre mot de passe. Ce lien est valable une heure.",
      fin: "Si vous n’êtes pas à l’origine de cette demande, ignorez ce message.",
    },
  },
  confirmation_adresse: {
    objet: "Confirmez votre adresse email",
    apercu: "Un clic pour confirmer votre adresse",
    blocs: { corps: "Bonjour,\n\nMerci de confirmer votre adresse email pour poursuivre votre inscription." },
  },
  confirmation_newsletter: {
    objet: "Confirmez votre inscription à la newsletter",
    apercu: "Un clic pour recevoir nos nouveautés",
    blocs: {
      corps: "Bonjour,\n\nPour recevoir la newsletter d’ExploCardio.fr, confirmez votre adresse. Ce lien est valable 7 jours. Sans confirmation, vous ne recevrez rien.",
      fin: "Vous pourrez vous désinscrire à tout moment.",
    },
  },
} satisfies Record<string, TextesModele>;

export async function emailEssai(): Promise<EmailRendu> {
  return rendreModele({ modele: "essai", defaut: TEXTES_GENERAUX.essai, corps: (t) => t.bloc("corps") });
}

export async function emailReinitialisationMotDePasse(lien: string): Promise<EmailRendu> {
  return rendreModele({
    modele: "reinitialisation_mot_de_passe",
    defaut: TEXTES_GENERAUX.reinitialisation_mot_de_passe,
    corps: (t) => (
      <>
        {t.bloc("corps")}
        <BoutonEmail href={lien}>Choisir un nouveau mot de passe</BoutonEmail>
        {t.bloc("fin")}
      </>
    ),
  });
}

export async function emailConfirmationAdresse(lien: string): Promise<EmailRendu> {
  return rendreModele({
    modele: "confirmation_adresse",
    defaut: TEXTES_GENERAUX.confirmation_adresse,
    corps: (t) => (
      <>
        {t.bloc("corps")}
        <BoutonEmail href={lien}>Confirmer mon adresse</BoutonEmail>
      </>
    ),
  });
}

export async function emailConfirmationNewsletter(lien: string): Promise<EmailRendu> {
  const desinscription = lien.replace("/newsletter/confirmation", "/newsletter/desinscription");
  return rendreModele({
    modele: "confirmation_newsletter",
    defaut: TEXTES_GENERAUX.confirmation_newsletter,
    corps: (t) => (
      <>
        {t.bloc("corps")}
        <BoutonEmail href={lien}>Confirmer mon inscription</BoutonEmail>
        {t.bloc("fin")}
        <Paragraphe>
          <a href={desinscription}>Se désinscrire</a>
        </Paragraphe>
      </>
    ),
  });
}
