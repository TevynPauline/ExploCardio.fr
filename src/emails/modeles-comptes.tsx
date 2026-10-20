import { render } from "@react-email/render";
import { contactEmail } from "./contact";
import { urlDuSite } from "./charte";
import { BoutonEmail, Gabarit, Paragraphe } from "./Gabarit";
import type { EmailRendu } from "./modeles";

// Emails de F02 (contracts/emails.md) : gabarit de la charte, vouvoiement, aucun mot de passe.

async function email(modele: string, objet: string, apercu: string, corps: React.ReactNode): Promise<EmailRendu> {
  return { modele, objet, rendu: await render(<Gabarit contact={await contactEmail()} apercu={apercu} titre={objet}>{corps}</Gabarit>) };
}

export const emailsComptes = {
  compteValide: () =>
    email("compte_valide", "Votre compte est validé", "Vous pouvez commander", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>Votre compte professionnel ExploCardio.fr est validé : vous pouvez désormais commander.</Paragraphe>
        <BoutonEmail href={urlDuSite("/mon-compte")}>Accéder à mon compte</BoutonEmail>
      </>
    )),
  compteRefuse: () =>
    email("compte_refuse", "Votre demande de compte", "Votre compte n'a pas pu être validé", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>
          Nous n’avons pas pu valider votre compte professionnel. Contactez-nous : nous vous expliquerons ce qui
          manque et comment y remédier.
        </Paragraphe>
        <BoutonEmail href={urlDuSite("/qui-sommes-nous#contact")}>Nous contacter</BoutonEmail>
      </>
    )),
  compteSuspendu: () =>
    email("compte_suspendu", "Votre compte est suspendu", "Les commandes sont suspendues", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>Votre compte est suspendu : vous ne pouvez plus commander pour le moment. Contactez-nous pour le rétablir.</Paragraphe>
        <BoutonEmail href={urlDuSite("/qui-sommes-nous#contact")}>Nous contacter</BoutonEmail>
      </>
    )),
  compteRetabli: () =>
    email("compte_retabli", "Votre compte est rétabli", "Vous pouvez à nouveau commander", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>Votre compte est rétabli : vous pouvez à nouveau commander.</Paragraphe>
      </>
    )),
  motDePasseModifie: () =>
    email("mot_de_passe_modifie", "Votre mot de passe a été modifié", "Modification de votre mot de passe", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>
          Le mot de passe de votre compte vient d’être modifié et vos autres sessions ont été fermées. Si vous n’êtes pas
          à l’origine de ce changement, réinitialisez votre mot de passe et contactez-nous.
        </Paragraphe>
        <BoutonEmail href={urlDuSite("/mot-de-passe-oublie")}>Réinitialiser mon mot de passe</BoutonEmail>
      </>
    )),
  compteBloque: () =>
    email("compte_bloque", "Votre compte est temporairement bloqué", "Plusieurs tentatives de connexion ont échoué", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>
          Plusieurs tentatives de connexion à votre compte ont échoué. Par sécurité, il est bloqué pendant 15 minutes.
          Si ce n’était pas vous, nous vous conseillons de changer votre mot de passe.
        </Paragraphe>
        <BoutonEmail href={urlDuSite("/mot-de-passe-oublie")}>Changer mon mot de passe</BoutonEmail>
      </>
    )),
  confirmerNouvelEmail: (lien: string) =>
    email("confirmer_nouvel_email", "Confirmez votre nouvelle adresse", "Un clic pour confirmer le changement", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>Confirmez cette adresse pour qu’elle remplace l’ancienne sur votre compte ExploCardio.fr.</Paragraphe>
        <BoutonEmail href={lien}>Confirmer ma nouvelle adresse</BoutonEmail>
      </>
    )),
  ancienEmailPrevenu: (nouvelle: string) =>
    email("email_change", "Changement de l'adresse de votre compte", "Une nouvelle adresse a été demandée", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>
          Un changement d’adresse email a été demandé pour votre compte, vers {nouvelle}. Si vous n’êtes pas à l’origine
          de cette demande, contactez-nous sans attendre.
        </Paragraphe>
      </>
    )),
  doubleAuthentification: (active: boolean) =>
    email("double_authentification", `Double authentification ${active ? "activée" : "désactivée"}`, "Sécurité de votre compte", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>
          La double authentification de votre compte vient d’être {active ? "activée" : "désactivée"}. Si vous n’êtes pas
          à l’origine de ce changement, contactez-nous.
        </Paragraphe>
      </>
    )),
  cadeauEnAttente: () =>
    email("cadeau_en_attente", "Votre cadeau de bienvenue arrive bientôt", "Votre tensiomètre sera expédié dès son retour en stock", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>
          Votre commande est partie sans attendre. Votre tensiomètre de bienvenue est momentanément en rupture : il vous
          sera expédié dès son retour en stock.
        </Paragraphe>
      </>
    )),
  compteSupprime: () =>
    email("compte_supprime", "Votre compte a été supprimé", "Confirmation de suppression", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>
          Votre compte ExploCardio.fr a été supprimé et vos données personnelles effacées. Les factures sont conservées
          pendant la durée imposée par la loi. Vous ne recevrez plus la newsletter.
        </Paragraphe>
      </>
    )),
};
