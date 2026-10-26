import { urlDuSite } from "./charte";
import { BoutonEmail } from "./Gabarit";
import { rendreModele, type TextesModele } from "./textes";

// Emails de F02 (contracts/emails.md) : gabarit de la charte, vouvoiement, aucun mot de passe.
// F10 (D2) : textes modifiables au back-office ; mise en page et boutons fixes.

export const TEXTES_COMPTES = {
  compte_valide: {
    objet: "Votre compte est validé",
    apercu: "Vous pouvez commander",
    blocs: { corps: "Bonjour,\n\nVotre compte professionnel ExploCardio.fr est validé : vous pouvez désormais commander." },
  },
  compte_refuse: {
    objet: "Votre demande de compte",
    apercu: "Votre compte n'a pas pu être validé",
    blocs: { corps: "Bonjour,\n\nNous n’avons pas pu valider votre compte professionnel. Contactez-nous : nous vous expliquerons ce qui manque et comment y remédier." },
  },
  compte_suspendu: {
    objet: "Votre compte est suspendu",
    apercu: "Les commandes sont suspendues",
    blocs: { corps: "Bonjour,\n\nVotre compte est suspendu : vous ne pouvez plus commander pour le moment. Contactez-nous pour le rétablir." },
  },
  compte_retabli: {
    objet: "Votre compte est rétabli",
    apercu: "Vous pouvez à nouveau commander",
    blocs: { corps: "Bonjour,\n\nVotre compte est rétabli : vous pouvez à nouveau commander." },
  },
  mot_de_passe_modifie: {
    objet: "Votre mot de passe a été modifié",
    apercu: "Modification de votre mot de passe",
    blocs: {
      corps:
        "Bonjour,\n\nLe mot de passe de votre compte vient d’être modifié et vos autres sessions ont été fermées. Si vous n’êtes pas à l’origine de ce changement, réinitialisez votre mot de passe et contactez-nous.",
    },
  },
  compte_bloque: {
    objet: "Votre compte est temporairement bloqué",
    apercu: "Plusieurs tentatives de connexion ont échoué",
    blocs: {
      corps:
        "Bonjour,\n\nPlusieurs tentatives de connexion à votre compte ont échoué. Par sécurité, il est bloqué pendant 15 minutes. Si ce n’était pas vous, nous vous conseillons de changer votre mot de passe.",
    },
  },
  confirmer_nouvel_email: {
    objet: "Confirmez votre nouvelle adresse",
    apercu: "Un clic pour confirmer le changement",
    blocs: { corps: "Bonjour,\n\nConfirmez cette adresse pour qu’elle remplace l’ancienne sur votre compte ExploCardio.fr." },
  },
  email_change: {
    objet: "Changement de l'adresse de votre compte",
    apercu: "Une nouvelle adresse a été demandée",
    blocs: {
      corps:
        "Bonjour,\n\nUn changement d’adresse email a été demandé pour votre compte, vers {{nouvelle_adresse}}. Si vous n’êtes pas à l’origine de cette demande, contactez-nous sans attendre.",
    },
  },
  double_authentification: {
    objet: "Double authentification {{etat}}",
    apercu: "Sécurité de votre compte",
    blocs: { corps: "Bonjour,\n\nLa double authentification de votre compte vient d’être {{etat}}. Si vous n’êtes pas à l’origine de ce changement, contactez-nous." },
  },
  cadeau_en_attente: {
    objet: "Votre cadeau de bienvenue arrive bientôt",
    apercu: "Votre tensiomètre sera expédié dès son retour en stock",
    blocs: {
      corps:
        "Bonjour,\n\nVotre commande est partie sans attendre. Votre tensiomètre de bienvenue est momentanément en rupture : il vous sera expédié dès son retour en stock.",
    },
  },
  invitation_equipe: {
    objet: "Votre accès au back-office d'ExploCardio.fr",
    apercu: "Choisissez votre mot de passe",
    blocs: {
      corps:
        "Bonjour,\n\nUn accès au back-office d'ExploCardio.fr vient d'être créé pour vous. Choisissez votre mot de passe avec le bouton ci-dessous : le lien est valable une heure.\n\nÀ votre première connexion, vous activerez la double authentification avec une application de votre téléphone.",
      fin: "Lien expiré ? Demandez à l'administrateur de vous renvoyer l'invitation.",
    },
  },
  numero_refuse: {
    objet: "Votre numéro d'entreprise",
    apercu: "Nous n'avons pas pu vérifier votre numéro",
    blocs: {
      corps:
        "Bonjour,\n\nNous n'avons pas pu vérifier le numéro d'entreprise (SIRET ou SIREN) de votre compte ExploCardio.fr : {{motif}}\n\nVos prochaines commandes sont suspendues en attendant. Contactez-nous : nous vous expliquerons comment régulariser votre compte.",
    },
  },
  compte_supprime: {
    objet: "Votre compte a été supprimé",
    apercu: "Confirmation de suppression",
    blocs: {
      corps:
        "Bonjour,\n\nVotre compte ExploCardio.fr a été supprimé et vos données personnelles effacées. Les factures sont conservées pendant la durée imposée par la loi. Vous ne recevrez plus la newsletter.",
    },
  },
} satisfies Record<string, TextesModele>;

type Code = keyof typeof TEXTES_COMPTES;

function email(modele: Code, bouton?: { href: string; libelle: string }, variables?: Record<string, string>) {
  return rendreModele({
    modele,
    defaut: TEXTES_COMPTES[modele],
    variables,
    corps: (t) => (
      <>
        {t.bloc("corps")}
        {bouton ? <BoutonEmail href={bouton.href}>{bouton.libelle}</BoutonEmail> : null}
      </>
    ),
  });
}

const CONTACT = () => ({ href: urlDuSite("/qui-sommes-nous#contact"), libelle: "Nous contacter" });

export const emailsComptes = {
  compteValide: () => email("compte_valide", { href: urlDuSite("/mon-compte"), libelle: "Accéder à mon compte" }),
  compteRefuse: () => email("compte_refuse", CONTACT()),
  compteSuspendu: () => email("compte_suspendu", CONTACT()),
  compteRetabli: () => email("compte_retabli"),
  motDePasseModifie: () => email("mot_de_passe_modifie", { href: urlDuSite("/mot-de-passe-oublie"), libelle: "Réinitialiser mon mot de passe" }),
  compteBloque: () => email("compte_bloque", { href: urlDuSite("/mot-de-passe-oublie"), libelle: "Changer mon mot de passe" }),
  confirmerNouvelEmail: (lien: string) => email("confirmer_nouvel_email", { href: lien, libelle: "Confirmer ma nouvelle adresse" }),
  ancienEmailPrevenu: (nouvelle: string) => email("email_change", undefined, { nouvelle_adresse: nouvelle }),
  doubleAuthentification: (active: boolean) => email("double_authentification", undefined, { etat: active ? "activée" : "désactivée" }),
  cadeauEnAttente: () => email("cadeau_en_attente"),
  compteSupprime: () => email("compte_supprime"),
  /** F16 (FR-035) : numéro d'entreprise refusé par l'équipe, avec le motif. */
  numeroRefuse: (motif: string) => email("numero_refuse", CONTACT(), { motif }),
  invitationEquipe: (lien: string) =>
    rendreModele({
      modele: "invitation_equipe",
      defaut: TEXTES_COMPTES.invitation_equipe,
      corps: (t) => (
        <>
          {t.bloc("corps")}
          <BoutonEmail href={lien}>Choisir mon mot de passe</BoutonEmail>
          {t.bloc("fin")}
        </>
      ),
    }),
};
