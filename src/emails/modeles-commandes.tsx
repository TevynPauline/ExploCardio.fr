import { euros } from "@/lib/montants";
import { urlDuSite } from "./charte";
import { BoutonEmail, Paragraphe } from "./Gabarit";
import { rendreModele, type TextesModele, type TextesRemplis } from "./textes";

// Emails de F04 (contracts/emails.md) : gabarit de la charte, vouvoiement, montants HT puis
// TTC, aucun nom d'organisme de financement. F10 (D2) : textes modifiables au back-office ;
// lignes de commande, RIB et boutons fixes.

export type LigneEmail = { libelle: string; quantite: number; totalHt: number };
export type Rib = { titulaire: string; iban: string; bic: string };

export const TEXTES_COMMANDES = {
  commande_confirmee: {
    objet: "Votre commande {{ref}}",
    apercu: "Merci pour votre commande",
    blocs: {
      intro_carte: "Bonjour,\n\nVotre commande est confirmée. Merci de votre confiance.",
      intro_virement: "Bonjour,\n\nVotre commande est enregistrée et attend votre virement.",
      total: "Total : {{total_ht}} HT, soit {{total_ttc}} TTC.",
      virement: "Merci de régler {{total_ttc}} TTC avant le {{echeance}}, en rappelant la référence {{ref}}.",
      facture: "Votre facture est disponible dans votre compte, rubrique « Mes factures ».",
    },
  },
  commande_annulee: {
    objet: "Commande {{ref}} annulée",
    apercu: "Votre commande a été annulée",
    blocs: { corps: "Bonjour,\n\nVotre commande {{ref}} a été annulée : {{motif}}. Si vous souhaitez toujours ces articles, vous pouvez commander à nouveau depuis le site, ou nous contacter." },
  },
  virement_recu: {
    objet: "Paiement reçu pour la commande {{ref}}",
    apercu: "Votre facture est disponible",
    blocs: { corps: "Bonjour,\n\nNous avons bien reçu votre virement. Votre commande {{ref}} est en préparation ; votre facture est disponible dans votre compte." },
  },
  commande_expediee: {
    objet: "Votre commande {{ref}} est expédiée",
    apercu: "Suivez votre colis",
    blocs: {
      corps: "Bonjour,\n\nVotre commande {{ref}} est expédiée.",
      suivi: "Transporteur : {{transporteur}}. Numéro de suivi : {{suivi}}.",
    },
  },
  remboursement: {
    objet: "Remboursement de la commande {{ref}}",
    apercu: "Votre avoir est disponible",
    blocs: { corps: "Bonjour,\n\nNous avons {{nature}} votre commande {{ref}} : {{montant_ttc}} TTC. L’avoir correspondant est disponible dans votre compte." },
  },
  abonnement_logiciel_souscrit: {
    objet: "Votre abonnement au logiciel Cloud ({{ref}})",
    apercu: "Votre abonnement mensuel est en place",
    blocs: {
      differe:
        "Bonjour,\n\nVotre abonnement prend effet le {{prise_effet}}, à la fin de votre période incluse : votre accès continue sans interruption. Rien n'est prélevé avant cette date, puis {{mois_suivants_ttc}} TTC par mois.",
      immediat: "Bonjour,\n\nVotre abonnement est en place : {{premier_mois_ttc}} TTC le premier mois, puis {{mois_suivants_ttc}} TTC par mois.",
      engagement: "Sans engagement de durée : vous pouvez le résilier à tout moment depuis votre compte.",
    },
  },
  abonnement_souscrit: {
    objet: "Votre mise à disposition ({{ref}})",
    apercu: "Votre abonnement mensuel est en place",
    blocs: {
      corps:
        "Bonjour,\n\nVotre mise à disposition est souscrite : {{premier_mois_ttc}} TTC le premier mois, puis {{mois_suivants_ttc}} TTC par mois, prélevés à la même date chaque mois. Sans engagement de durée : vous pouvez l’arrêter à tout moment.",
    },
  },
  echeance_payee: {
    objet: "Votre échéance mensuelle",
    apercu: "Votre facture du mois est disponible",
    blocs: { corps: "Bonjour,\n\nVotre échéance de {{montant_ttc}} TTC a bien été prélevée. La facture est disponible dans votre compte." },
  },
  financement_recu: {
    objet: "Votre demande de financement",
    apercu: "Nous étudions votre demande",
    blocs: {
      corps: "Bonjour,\n\nNous avons bien reçu votre demande de financement sur {{duree_mois}} mois pour : {{equipements}}.",
      mensualite: "Mensualité indicative : {{mensualite_ht}} HT par mois. {{mention}}",
      suite: "Nous revenons vers vous rapidement. Vous suivez l’avancement de votre demande dans votre compte.",
    },
  },
  financement_statut: {
    objet: "Votre demande de financement",
    apercu: "Statut : {{statut}}",
    blocs: { corps: "Bonjour,\n\nVotre demande de financement est désormais : {{statut}}." },
  },
} satisfies Record<string, TextesModele>;

type Code = keyof typeof TEXTES_COMMANDES;

function Lignes({ lignes }: { lignes: LigneEmail[] }) {
  return (
    <>
      {lignes.map((l, i) => (
        <Paragraphe key={i}>
          {l.quantite} × {l.libelle} — {euros(l.totalHt)} HT
        </Paragraphe>
      ))}
    </>
  );
}

const dateFr = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

function email(modele: Code, variables: Record<string, string | number>, corps: (t: TextesRemplis) => React.ReactNode) {
  return rendreModele({ modele, defaut: TEXTES_COMMANDES[modele], variables, corps });
}

export const emailsCommandes = {
  confirmation: (p: { ref: string; lignes: LigneEmail[]; totalHt: number; totalTtc: number; virement?: { rib: Rib; echeance: Date } | null }) =>
    email(
      "commande_confirmee",
      { ref: p.ref, total_ht: euros(p.totalHt), total_ttc: euros(p.totalTtc), echeance: p.virement ? dateFr(p.virement.echeance) : "" },
      (t) => (
        <>
          {t.bloc(p.virement ? "intro_virement" : "intro_carte")}
          <Lignes lignes={p.lignes} />
          {t.bloc("total")}
          {p.virement ? (
            <>
              {t.bloc("virement")}
              <Paragraphe>
                Titulaire : {p.virement.rib.titulaire}
                <br />
                IBAN : {p.virement.rib.iban}
                <br />
                BIC : {p.virement.rib.bic}
              </Paragraphe>
            </>
          ) : (
            <>
              {t.bloc("facture")}
              <Paragraphe>
                <a href={urlDuSite("/mon-compte/factures")}>Mes factures</a>
              </Paragraphe>
            </>
          )}
          <BoutonEmail href={urlDuSite("/mon-compte/commandes")}>Suivre ma commande</BoutonEmail>
        </>
      ),
    ),
  annulation: (p: { ref: string; motif: string }) =>
    email("commande_annulee", { ref: p.ref, motif: p.motif }, (t) => (
      <>
        {t.bloc("corps")}
        <BoutonEmail href={urlDuSite("/catalogue")}>Voir le catalogue</BoutonEmail>
      </>
    )),
  paiementRecu: (p: { ref: string }) =>
    email("virement_recu", { ref: p.ref }, (t) => (
      <>
        {t.bloc("corps")}
        <BoutonEmail href={urlDuSite("/mon-compte/factures")}>Mes factures</BoutonEmail>
      </>
    )),
  expedition: (p: { ref: string; transporteur: string | null; suivi: string | null }) =>
    email("commande_expediee", { ref: p.ref, transporteur: p.transporteur ?? "—", suivi: p.suivi ?? "" }, (t) => (
      <>
        {t.bloc("corps")}
        {p.suivi ? t.bloc("suivi") : null}
        <BoutonEmail href={urlDuSite(`/mon-compte/commandes/${encodeURIComponent(p.ref)}`)}>Suivre ma commande</BoutonEmail>
      </>
    )),
  remboursement: (p: { ref: string; montantTtc: number; total: boolean }) =>
    email("remboursement", { ref: p.ref, montant_ttc: euros(p.montantTtc), nature: p.total ? "remboursé" : "remboursé en partie" }, (t) => (
      <>
        {t.bloc("corps")}
        <BoutonEmail href={urlDuSite("/mon-compte/factures")}>Mes factures et avoirs</BoutonEmail>
      </>
    )),
  abonnement: (p: { ref: string; premierMoisTtc: number; moisSuivantsTtc: number; logiciel?: boolean; priseEffet?: Date | null }) => {
    const variables = { ref: p.ref, premier_mois_ttc: euros(p.premierMoisTtc), mois_suivants_ttc: euros(p.moisSuivantsTtc), prise_effet: p.priseEffet ? dateFr(p.priseEffet) : "" };
    return p.logiciel
      ? email("abonnement_logiciel_souscrit", variables, (t) => (
          <>
            {t.bloc(p.priseEffet ? "differe" : "immediat")}
            {t.bloc("engagement")}
            <BoutonEmail href={urlDuSite("/mon-compte/logiciels")}>Mes logiciels Cloud</BoutonEmail>
          </>
        ))
      : email("abonnement_souscrit", variables, (t) => (
          <>
            {t.bloc("corps")}
            <BoutonEmail href={urlDuSite("/mon-compte/locations")}>Mes locations</BoutonEmail>
          </>
        ));
  },
  echeance: (p: { montantTtc: number }) =>
    email("echeance_payee", { montant_ttc: euros(p.montantTtc) }, (t) => (
      <>
        {t.bloc("corps")}
        <BoutonEmail href={urlDuSite("/mon-compte/factures")}>Mes factures</BoutonEmail>
      </>
    )),
  financementRecu: (p: { equipements: string[]; dureeMois: number; mensualiteHt: number | null; mention: string }) =>
    email(
      "financement_recu",
      { duree_mois: p.dureeMois, equipements: p.equipements.join(", "), mensualite_ht: p.mensualiteHt ? euros(p.mensualiteHt) : "", mention: p.mention },
      (t) => (
        <>
          {t.bloc("corps")}
          {p.mensualiteHt ? t.bloc("mensualite") : null}
          {t.bloc("suite")}
          <BoutonEmail href={urlDuSite("/mon-compte/financements")}>Suivre ma demande</BoutonEmail>
        </>
      ),
    ),
  statutFinancement: (p: { statut: string }) =>
    email("financement_statut", { statut: p.statut }, (t) => (
      <>
        {t.bloc("corps")}
        <BoutonEmail href={urlDuSite("/mon-compte/financements")}>Voir ma demande</BoutonEmail>
      </>
    )),
};
