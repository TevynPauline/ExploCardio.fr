import { euros } from "@/lib/montants";
import { urlDuSite } from "./charte";
import { BoutonEmail } from "./Gabarit";
import { rendreModele, type TextesModele, type TextesRemplis } from "./textes";

// Emails de F05 (contracts/connecteurs.md) : gabarit de la charte, vouvoiement, ton sobre,
// montants HT puis TTC. Aucune donnée de patient. F10 (D2) : textes modifiables au
// back-office ; boutons fixes.

export const TEXTES_LOCATIONS = {
  location_expediee: {
    objet: "Votre {{appareil}} est en route",
    apercu: "Votre appareil a été expédié",
    blocs: {
      corps: "Bonjour,\n\nVotre {{appareil}} a été expédié.",
      livraison: "Livraison prévue le {{date_livraison}}.",
      serie: "Numéro de série : {{numero_serie}}.",
      suivi: "Suivi du colis : {{transporteur}}, n° {{suivi}}.",
      logiciel: "Votre accès au logiciel Cloud est ouvert : vous recevez vos identifiants de la plateforme séparément.",
      formation:
        "Notre équipe vous contacte dans les prochains jours pour organiser votre formation à la prise en main. Vous pouvez aussi nous écrire sur WhatsApp pour vous faire aider au paramétrage.",
    },
  },
  location_appareil_defectueux: {
    objet: "Votre mise à disposition : choisissez la suite",
    apercu: "Reporter ou annuler sans frais",
    blocs: {
      corps:
        "Bonjour,\n\nEn préparant votre {{appareil}}, nous avons constaté un défaut et aucun autre appareil n'est disponible à la date prévue.\n\nDepuis votre compte, vous pouvez reporter la livraison à une nouvelle date, ou annuler sans frais : vous êtes alors intégralement remboursé.",
    },
  },
  location_date_recalculee: {
    objet: "Votre date de livraison a changé",
    apercu: "Nouvelle date de livraison",
    blocs: { corps: "Bonjour,\n\nVotre compte est validé. Votre {{appareil}} sera livré le {{date_livraison}} : la location commencera ce jour-là." },
  },
  location_annulee_remboursee: {
    objet: "Votre mise à disposition est annulée",
    apercu: "Remboursement intégral",
    blocs: {
      corps: "Bonjour,\n\nVotre mise à disposition ({{appareil}}) est annulée : {{motif}}.\n\nVous êtes intégralement remboursé : {{montant_ttc}} TTC, sur le moyen de paiement utilisé.",
    },
  },
  location_rappel_echeance: {
    objet: "Prochaine échéance de votre location",
    apercu: "Rappel avant prélèvement",
    blocs: {
      corps:
        "Bonjour,\n\nLa prochaine échéance de votre location ({{appareil}}) sera prélevée le {{echeance}} : {{montant_ht}} HT, soit {{montant_ttc}} TTC.\n\nSans engagement : vous pouvez résilier avant cette date depuis votre compte.",
    },
  },
  location_prelevement_echoue: {
    objet: "Le prélèvement de votre location n'a pas abouti",
    apercu: "Régularisation nécessaire",
    blocs: {
      corps:
        "Bonjour,\n\nLe prélèvement de l'échéance de votre location ({{appareil}}) n'a pas abouti. De nouvelles tentatives seront faites dans les prochains jours.\n\nMerci de vérifier votre moyen de paiement. Sans régularisation sous {{delai_jours}} jours, l'accès au logiciel sera suspendu et le retour de l'appareil demandé.",
    },
  },
  location_suspendue: {
    objet: "Votre location est suspendue",
    apercu: "Accès suspendu, retour demandé",
    blocs: {
      corps:
        "Bonjour,\n\nFaute de régularisation de l'échéance impayée, votre location ({{appareil}}) est suspendue : l'accès au logiciel Cloud est suspendu.\n\nMerci de régulariser ou de nous retourner l’appareil. Notre équipe reste à votre disposition.",
    },
  },
  location_resiliee: {
    objet: "Votre résiliation est enregistrée",
    apercu: "Fin de location et retour de l'appareil",
    blocs: {
      corps: "Bonjour,\n\nLa location de votre {{appareil}} prendra fin le {{fin}}. Aucun prélèvement n'aura lieu après cette date.",
      logiciel: "Votre accès au logiciel Cloud sera fermé le {{fin}}. Pensez à récupérer vos données d'ici là.",
      retour:
        "Merci de nous retourner l'appareil avant le {{date_limite_retour}}, avec l'étiquette préaffranchie à télécharger dans votre compte. Vous pouvez encore changer d'avis avec « Prolonger » jusqu'au {{fin}}.",
    },
  },
  location_prolongee: {
    objet: "Votre location continue",
    apercu: "Résiliation annulée",
    blocs: { corps: "Bonjour,\n\nVotre résiliation est annulée : la location de votre {{appareil}} se poursuit au tarif des mois suivants." },
  },
  location_rappel_retour: {
    objet: "Retour de votre appareil attendu",
    apercu: "Rappel de retour",
    blocs: {
      corps:
        "Bonjour,\n\nNous n'avons pas encore reçu votre {{appareil}}, qui était à retourner avant le {{date_limite_retour}}.\n\nSans retour, un mois supplémentaire de location ({{montant_ht}} HT) sera facturé à partir du {{facturation_le}}.",
    },
  },
  location_prelevement_ponctuel: {
    objet: "Prélèvement lié à votre location",
    apercu: "Facture prélevée",
    blocs: { corps: "Bonjour,\n\n{{libelle}} : {{montant_ttc}} TTC, prélevés sur le moyen de paiement de votre location (facture {{facture}})." },
  },
  location_retour_recu: {
    objet: "Nous avons reçu votre appareil",
    apercu: "Location terminée",
    blocs: {
      corps: "Bonjour,\n\nNous avons bien reçu votre {{appareil}}. Votre location est terminée. Merci de votre confiance.",
      degradation: "À la réception, une dégradation a été constatée : {{degradation_ht}} HT vous sont facturés. La facture détaillée est dans votre compte.",
    },
  },
  location_inviter_resiliation: {
    objet: "Votre appareil acheté est livré",
    apercu: "Pensez à résilier la location",
    blocs: {
      corps:
        "Bonjour,\n\nVotre {{appareil}} acheté est livré. Si vous n'avez plus besoin de l'appareil loué, résiliez la location depuis votre compte : elle prendra fin au terme du mois payé.",
    },
  },
} satisfies Record<string, TextesModele>;

type Code = keyof typeof TEXTES_LOCATIONS;

const dateFr = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
const MES_LOCATIONS = () => urlDuSite("/mon-compte/locations");

function email(modele: Code, variables: Record<string, string | number>, corps: (t: TextesRemplis) => React.ReactNode) {
  return rendreModele({ modele, defaut: TEXTES_LOCATIONS[modele], variables, corps });
}

/** Modèle à un seul bloc « corps » suivi d'un bouton. */
const simple = (modele: Code, variables: Record<string, string | number>, bouton?: { href: string; libelle: string }) =>
  email(modele, variables, (t) => (
    <>
      {t.bloc("corps")}
      {bouton ? <BoutonEmail href={bouton.href}>{bouton.libelle}</BoutonEmail> : null}
    </>
  ));

export const emailsLocations = {
  expediee: (p: { appareil: string; numeroSerie: string | null; transporteur: string | null; suivi: string | null; dateLivraison: Date | null; whatsapp: string; logiciel: boolean }) =>
    email(
      "location_expediee",
      { appareil: p.appareil, numero_serie: p.numeroSerie ?? "", date_livraison: p.dateLivraison ? dateFr(p.dateLivraison) : "", transporteur: p.transporteur ?? "transporteur", suivi: p.suivi ?? "" },
      (t) => (
        <>
          {t.bloc("corps")}
          {p.dateLivraison ? t.bloc("livraison") : null}
          {p.numeroSerie ? t.bloc("serie") : null}
          {p.suivi ? t.bloc("suivi") : null}
          {p.logiciel ? t.bloc("logiciel") : null}
          {t.bloc("formation")}
          <BoutonEmail href={p.whatsapp.startsWith("http") ? p.whatsapp : urlDuSite(p.whatsapp)}>Nous écrire sur WhatsApp</BoutonEmail>
        </>
      ),
    ),
  appareilDefectueux: (p: { appareil: string }) => simple("location_appareil_defectueux", { appareil: p.appareil }, { href: MES_LOCATIONS(), libelle: "Choisir dans mon compte" }),
  dateRecalculee: (p: { appareil: string; dateLivraison: Date }) =>
    simple("location_date_recalculee", { appareil: p.appareil, date_livraison: dateFr(p.dateLivraison) }, { href: MES_LOCATIONS(), libelle: "Mes locations" }),
  annuleeRemboursee: (p: { appareil: string; montantTtc: number; motif: string }) =>
    simple("location_annulee_remboursee", { appareil: p.appareil, motif: p.motif, montant_ttc: euros(p.montantTtc) }),
  rappelEcheance: (p: { appareil: string; echeance: Date; montantHt: number; montantTtc: number }) =>
    simple(
      "location_rappel_echeance",
      { appareil: p.appareil, echeance: dateFr(p.echeance), montant_ht: euros(p.montantHt), montant_ttc: euros(p.montantTtc) },
      { href: MES_LOCATIONS(), libelle: "Gérer ma location" },
    ),
  prelevementEchoue: (p: { appareil: string; delaiJours: number }) =>
    simple("location_prelevement_echoue", { appareil: p.appareil, delai_jours: p.delaiJours }, { href: MES_LOCATIONS(), libelle: "Ma location" }),
  suspendue: (p: { appareil: string }) => simple("location_suspendue", { appareil: p.appareil }, { href: MES_LOCATIONS(), libelle: "Ma location" }),
  resiliee: (p: { appareil: string; fin: Date; dateLimiteRetour: Date | null; logiciel: boolean }) =>
    email("location_resiliee", { appareil: p.appareil, fin: dateFr(p.fin), date_limite_retour: p.dateLimiteRetour ? dateFr(p.dateLimiteRetour) : "" }, (t) => (
      <>
        {t.bloc("corps")}
        {p.logiciel ? t.bloc("logiciel") : null}
        {p.dateLimiteRetour ? t.bloc("retour") : null}
        <BoutonEmail href={MES_LOCATIONS()}>Instructions et étiquette de retour</BoutonEmail>
      </>
    )),
  prolongee: (p: { appareil: string }) => simple("location_prolongee", { appareil: p.appareil }),
  rappelRetour: (p: { appareil: string; dateLimiteRetour: Date; facturationLe: Date; montantHt: number }) =>
    simple(
      "location_rappel_retour",
      { appareil: p.appareil, date_limite_retour: dateFr(p.dateLimiteRetour), facturation_le: dateFr(p.facturationLe), montant_ht: euros(p.montantHt) },
      { href: MES_LOCATIONS(), libelle: "Télécharger l’étiquette de retour" },
    ),
  prelevementPonctuel: (p: { libelle: string; montantTtc: number; facture: string }) =>
    simple("location_prelevement_ponctuel", { libelle: p.libelle, montant_ttc: euros(p.montantTtc), facture: p.facture }, { href: urlDuSite("/mon-compte/factures"), libelle: "Mes factures" }),
  retourRecu: (p: { appareil: string; degradationHt: number | null }) =>
    email("location_retour_recu", { appareil: p.appareil, degradation_ht: p.degradationHt ? euros(p.degradationHt) : "" }, (t) => (
      <>
        {t.bloc("corps")}
        {p.degradationHt ? t.bloc("degradation") : null}
        <BoutonEmail href={MES_LOCATIONS()}>Historique de mes locations</BoutonEmail>
      </>
    )),
  inviterResiliation: (p: { appareil: string }) => simple("location_inviter_resiliation", { appareil: p.appareil }, { href: MES_LOCATIONS(), libelle: "Mes locations" }),
};
