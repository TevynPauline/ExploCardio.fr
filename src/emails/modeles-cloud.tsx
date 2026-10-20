import { urlDuSite } from "./charte";
import { BoutonEmail } from "./Gabarit";
import { rendreModele, type TextesModele } from "./textes";

// Emails de F12 (accès aux logiciels Cloud) : identiques dans les deux sous-modes (SC-006).
// Jamais de mot de passe : la plateforme envoie elle-même l'invitation à créer le sien.
// F10 (D2) : textes modifiables au back-office ; boutons fixes.

export const TEXTES_CLOUD = {
  cloud_ouverture: {
    objet: "Votre accès à {{logiciel}} est ouvert",
    apercu: "Accédez à votre logiciel",
    blocs: {
      corps: "Bonjour,\n\nVotre accès au logiciel {{logiciel}} est ouvert sur la plateforme Cloud hébergée en France (HDS).",
      fin: "Il est ouvert jusqu'au {{fin}}.",
      connexion:
        "Pour votre première connexion, la plateforme vous envoie une invitation à créer votre mot de passe. ExploCardio.fr ne le connaît jamais. Le lien vers la plateforme et l’aide au paramétrage sont dans votre compte.",
    },
  },
  cloud_rappel_periode: {
    objet: "Votre accès à {{logiciel}} inclus avec votre appareil se termine bientôt",
    apercu: "Poursuivre sans interruption",
    blocs: {
      corps:
        "Bonjour,\n\nLa période d'accès à {{logiciel}} incluse avec votre appareil se termine le {{fin}}.\n\nPour continuer sans interruption, souscrivez l’abonnement mensuel, sans engagement, depuis votre compte : il prendra effet à cette date, rien n’est prélevé avant.",
    },
  },
  cloud_rappel_fin: {
    objet: "Votre accès à {{logiciel}} se termine le {{fin}}",
    apercu: "Récupérez vos données",
    blocs: {
      corps: "Bonjour,\n\nVotre accès au logiciel {{logiciel}} se termine le {{fin}}.",
      grace: "Vous disposerez ensuite de {{delai_grace_jours}} jours pour consulter et récupérer vos données (exports depuis la plateforme), puis l'accès sera fermé.",
      sans_grace: "L'accès sera alors fermé : pensez à récupérer vos données (exports depuis la plateforme) avant cette date.",
    },
  },
  cloud_grace: {
    objet: "Votre accès à {{logiciel}} est en délai de grâce",
    apercu: "Récupérez vos données",
    blocs: {
      corps:
        "Bonjour,\n\nVotre accès au logiciel {{logiciel}} est terminé. Jusqu'au {{fin_grace}}, vous pouvez encore consulter et récupérer vos données sur la plateforme ; l'accès sera ensuite fermé.",
    },
  },
  cloud_fermeture: {
    objet: "Votre accès à {{logiciel}} est fermé",
    apercu: "Accès fermé",
    blocs: { corps: "Bonjour,\n\nVotre accès au logiciel {{logiciel}} est fermé. Vos autres logiciels, s'il y en a, restent accessibles." },
  },
  cloud_suspension: {
    objet: "Votre accès à {{logiciel}} est suspendu",
    apercu: "Accès suspendu",
    blocs: { corps: "Bonjour,\n\nVotre accès au logiciel {{logiciel}} est suspendu ({{motif}}). Vos données sont conservées. Contactez-nous pour le rétablir." },
  },
  cloud_retablissement: {
    objet: "Votre accès à {{logiciel}} est rétabli",
    apercu: "Accès rétabli",
    blocs: { corps: "Bonjour,\n\nVotre accès au logiciel {{logiciel}} est rétabli." },
  },
} satisfies Record<string, TextesModele>;

type Code = keyof typeof TEXTES_CLOUD;

const dateFr = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
const MES_LOGICIELS = () => urlDuSite("/mon-compte/logiciels");

function email(modele: Code, variables: Record<string, string | number>, blocs: string[], bouton = "Mes logiciels Cloud") {
  return rendreModele({
    modele,
    defaut: TEXTES_CLOUD[modele],
    variables,
    corps: (t) => (
      <>
        {blocs.map((b) => (
          <span key={b}>{t.bloc(b)}</span>
        ))}
        <BoutonEmail href={MES_LOGICIELS()}>{bouton}</BoutonEmail>
      </>
    ),
  });
}

export const emailsCloud = {
  ouverture: (p: { logiciel: string; fin: Date | null }) =>
    email("cloud_ouverture", { logiciel: p.logiciel, fin: p.fin ? dateFr(p.fin) : "" }, p.fin ? ["corps", "fin", "connexion"] : ["corps", "connexion"]),
  rappelPeriode: (p: { logiciel: string; fin: Date }) => email("cloud_rappel_periode", { logiciel: p.logiciel, fin: dateFr(p.fin) }, ["corps"], "Poursuivre avec l’abonnement"),
  rappelFin: (p: { logiciel: string; fin: Date; delaiGraceJours: number }) =>
    email("cloud_rappel_fin", { logiciel: p.logiciel, fin: dateFr(p.fin), delai_grace_jours: p.delaiGraceJours }, ["corps", p.delaiGraceJours > 0 ? "grace" : "sans_grace"]),
  grace: (p: { logiciel: string; finGrace: Date }) => email("cloud_grace", { logiciel: p.logiciel, fin_grace: dateFr(p.finGrace) }, ["corps"]),
  fermeture: (p: { logiciel: string }) => email("cloud_fermeture", { logiciel: p.logiciel }, ["corps"]),
  suspension: (p: { logiciel: string; motif: string }) => email("cloud_suspension", { logiciel: p.logiciel, motif: p.motif }, ["corps"]),
  retablissement: (p: { logiciel: string }) => email("cloud_retablissement", { logiciel: p.logiciel }, ["corps"]),
};
