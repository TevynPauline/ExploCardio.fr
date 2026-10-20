import { render } from "@react-email/render";
import { urlDuSite } from "./charte";
import { BoutonEmail, Gabarit, Paragraphe } from "./Gabarit";
import type { EmailRendu } from "./modeles";

// Emails de F12 (accès aux logiciels Cloud) : identiques dans les deux sous-modes (SC-006).
// Jamais de mot de passe : la plateforme envoie elle-même l'invitation à créer le sien.

async function email(modele: string, objet: string, apercu: string, corps: React.ReactNode): Promise<EmailRendu> {
  return { modele, objet, rendu: await render(<Gabarit apercu={apercu} titre={objet}>{corps}</Gabarit>) };
}

const dateFr = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
const MES_LOGICIELS = () => urlDuSite("/mon-compte/logiciels");

export const emailsCloud = {
  ouverture: (p: { logiciel: string; fin: Date | null }) =>
    email("cloud_ouverture", `Votre accès à ${p.logiciel} est ouvert`, "Accédez à votre logiciel", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>
          {`Votre accès au logiciel ${p.logiciel} est ouvert sur la plateforme Cloud hébergée en France (HDS)${p.fin ? `, jusqu'au ${dateFr(p.fin)}` : ""}.`}
        </Paragraphe>
        <Paragraphe>
          Pour votre première connexion, la plateforme vous envoie une invitation à créer votre mot de passe. ExploCardio.fr ne le connaît jamais. Le
          lien vers la plateforme et l’aide au paramétrage sont dans votre compte.
        </Paragraphe>
        <BoutonEmail href={MES_LOGICIELS()}>Mes logiciels Cloud</BoutonEmail>
      </>
    )),
  rappelPeriode: (p: { logiciel: string; fin: Date }) =>
    email("cloud_rappel_periode", `Votre accès à ${p.logiciel} inclus avec votre appareil se termine bientôt`, "Poursuivre sans interruption", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>{`La période d'accès à ${p.logiciel} incluse avec votre appareil se termine le ${dateFr(p.fin)}.`}</Paragraphe>
        <Paragraphe>
          Pour continuer sans interruption, souscrivez l’abonnement mensuel, sans engagement, depuis votre compte : il prendra effet à cette date, rien
          n’est prélevé avant.
        </Paragraphe>
        <BoutonEmail href={MES_LOGICIELS()}>Poursuivre avec l’abonnement</BoutonEmail>
      </>
    )),
  rappelFin: (p: { logiciel: string; fin: Date; delaiGraceJours: number }) =>
    email("cloud_rappel_fin", `Votre accès à ${p.logiciel} se termine le ${dateFr(p.fin)}`, "Récupérez vos données", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>{`Votre accès au logiciel ${p.logiciel} se termine le ${dateFr(p.fin)}.`}</Paragraphe>
        <Paragraphe>
          {p.delaiGraceJours > 0
            ? `Vous disposerez ensuite de ${p.delaiGraceJours} jours pour consulter et récupérer vos données (exports depuis la plateforme), puis l'accès sera fermé.`
            : "L'accès sera alors fermé : pensez à récupérer vos données (exports depuis la plateforme) avant cette date."}
        </Paragraphe>
        <BoutonEmail href={MES_LOGICIELS()}>Mes logiciels Cloud</BoutonEmail>
      </>
    )),
  grace: (p: { logiciel: string; finGrace: Date }) =>
    email("cloud_grace", `Votre accès à ${p.logiciel} est en délai de grâce`, "Récupérez vos données", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>
          {`Votre accès au logiciel ${p.logiciel} est terminé. Jusqu'au ${dateFr(p.finGrace)}, vous pouvez encore consulter et récupérer vos données sur la plateforme ; l'accès sera ensuite fermé.`}
        </Paragraphe>
        <BoutonEmail href={MES_LOGICIELS()}>Mes logiciels Cloud</BoutonEmail>
      </>
    )),
  fermeture: (p: { logiciel: string }) =>
    email("cloud_fermeture", `Votre accès à ${p.logiciel} est fermé`, "Accès fermé", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>{`Votre accès au logiciel ${p.logiciel} est fermé. Vos autres logiciels, s'il y en a, restent accessibles.`}</Paragraphe>
        <BoutonEmail href={MES_LOGICIELS()}>Mes logiciels Cloud</BoutonEmail>
      </>
    )),
  suspension: (p: { logiciel: string; motif: string }) =>
    email("cloud_suspension", `Votre accès à ${p.logiciel} est suspendu`, "Accès suspendu", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>{`Votre accès au logiciel ${p.logiciel} est suspendu (${p.motif}). Vos données sont conservées. Contactez-nous pour le rétablir.`}</Paragraphe>
        <BoutonEmail href={MES_LOGICIELS()}>Mes logiciels Cloud</BoutonEmail>
      </>
    )),
  retablissement: (p: { logiciel: string }) =>
    email("cloud_retablissement", `Votre accès à ${p.logiciel} est rétabli`, "Accès rétabli", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>{`Votre accès au logiciel ${p.logiciel} est rétabli.`}</Paragraphe>
        <BoutonEmail href={MES_LOGICIELS()}>Mes logiciels Cloud</BoutonEmail>
      </>
    )),
};
