import { render } from "@react-email/render";
import { euros } from "@/lib/montants";
import { urlDuSite } from "./charte";
import { BoutonEmail, Gabarit, Paragraphe } from "./Gabarit";
import type { EmailRendu } from "./modeles";

// Emails de F05 (contracts/connecteurs.md) : gabarit de la charte, vouvoiement, ton sobre,
// montants HT puis TTC. Aucune donnée de patient.

async function email(modele: string, objet: string, apercu: string, corps: React.ReactNode): Promise<EmailRendu> {
  return { modele, objet, rendu: await render(<Gabarit apercu={apercu} titre={objet}>{corps}</Gabarit>) };
}

function dateFr(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
}

const MES_LOCATIONS = () => urlDuSite("/mon-compte/locations");

export const emailsLocations = {
  expediee: (p: { appareil: string; numeroSerie: string | null; transporteur: string | null; suivi: string | null; dateLivraison: Date | null; whatsapp: string; logiciel: boolean }) =>
    email("location_expediee", `Votre ${p.appareil} est en route`, "Votre appareil a été expédié", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>
          {`Votre ${p.appareil}${p.numeroSerie ? ` (n° de série ${p.numeroSerie})` : ""} a été expédié${p.dateLivraison ? ` pour une livraison le ${dateFr(p.dateLivraison)}` : ""}.`}
        </Paragraphe>
        {p.suivi ? <Paragraphe>{`Suivi du colis : ${p.transporteur ?? "transporteur"}, n° ${p.suivi}.`}</Paragraphe> : null}
        {p.logiciel ? <Paragraphe>Votre accès au logiciel Cloud est ouvert : vous recevez vos identifiants de la plateforme séparément.</Paragraphe> : null}
        <Paragraphe>
          Notre équipe vous contacte dans les prochains jours pour organiser votre formation à la prise en main. Vous pouvez aussi nous écrire sur WhatsApp pour
          vous faire aider au paramétrage.
        </Paragraphe>
        <BoutonEmail href={p.whatsapp.startsWith("http") ? p.whatsapp : urlDuSite(p.whatsapp)}>Nous écrire sur WhatsApp</BoutonEmail>
      </>
    )),
  appareilDefectueux: (p: { appareil: string }) =>
    email("location_appareil_defectueux", "Votre mise à disposition : choisissez la suite", "Reporter ou annuler sans frais", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>
          {`En préparant votre ${p.appareil}, nous avons constaté un défaut et aucun autre appareil n'est disponible à la date prévue.`}
        </Paragraphe>
        <Paragraphe>Depuis votre compte, vous pouvez reporter la livraison à une nouvelle date, ou annuler sans frais : vous êtes alors intégralement remboursé.</Paragraphe>
        <BoutonEmail href={MES_LOCATIONS()}>Choisir dans mon compte</BoutonEmail>
      </>
    )),
  dateRecalculee: (p: { appareil: string; dateLivraison: Date }) =>
    email("location_date_recalculee", "Votre date de livraison a changé", "Nouvelle date de livraison", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>{`Votre compte est validé. Votre ${p.appareil} sera livré le ${dateFr(p.dateLivraison)} : la location commencera ce jour-là.`}</Paragraphe>
        <BoutonEmail href={MES_LOCATIONS()}>Mes locations</BoutonEmail>
      </>
    )),
  annuleeRemboursee: (p: { appareil: string; montantTtc: number; motif: string }) =>
    email("location_annulee_remboursee", "Votre mise à disposition est annulée", "Remboursement intégral", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>{`Votre mise à disposition (${p.appareil}) est annulée : ${p.motif}.`}</Paragraphe>
        <Paragraphe>{`Vous êtes intégralement remboursé : ${euros(p.montantTtc)} TTC, sur le moyen de paiement utilisé.`}</Paragraphe>
      </>
    )),
  rappelEcheance: (p: { appareil: string; echeance: Date; montantHt: number; montantTtc: number }) =>
    email("location_rappel_echeance", "Prochaine échéance de votre location", "Rappel avant prélèvement", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>
          {`La prochaine échéance de votre location (${p.appareil}) sera prélevée le ${dateFr(p.echeance)} : ${euros(p.montantHt)} HT, soit ${euros(p.montantTtc)} TTC.`}
        </Paragraphe>
        <Paragraphe>Sans engagement : vous pouvez résilier avant cette date depuis votre compte.</Paragraphe>
        <BoutonEmail href={MES_LOCATIONS()}>Gérer ma location</BoutonEmail>
      </>
    )),
  prelevementEchoue: (p: { appareil: string; delaiJours: number }) =>
    email("location_prelevement_echoue", "Le prélèvement de votre location n'a pas abouti", "Régularisation nécessaire", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>{`Le prélèvement de l'échéance de votre location (${p.appareil}) n'a pas abouti. De nouvelles tentatives seront faites dans les prochains jours.`}</Paragraphe>
        <Paragraphe>
          {`Merci de vérifier votre moyen de paiement. Sans régularisation sous ${p.delaiJours} jours, l'accès au logiciel sera suspendu et le retour de l'appareil demandé.`}
        </Paragraphe>
        <BoutonEmail href={MES_LOCATIONS()}>Ma location</BoutonEmail>
      </>
    )),
  suspendue: (p: { appareil: string }) =>
    email("location_suspendue", "Votre location est suspendue", "Accès suspendu, retour demandé", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>{`Faute de régularisation de l'échéance impayée, votre location (${p.appareil}) est suspendue : l'accès au logiciel Cloud est suspendu.`}</Paragraphe>
        <Paragraphe>Merci de régulariser ou de nous retourner l’appareil. Notre équipe reste à votre disposition.</Paragraphe>
        <BoutonEmail href={MES_LOCATIONS()}>Ma location</BoutonEmail>
      </>
    )),
  resiliee: (p: { appareil: string; fin: Date; dateLimiteRetour: Date | null; logiciel: boolean }) =>
    email("location_resiliee", "Votre résiliation est enregistrée", "Fin de location et retour de l'appareil", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>{`La location de votre ${p.appareil} prendra fin le ${dateFr(p.fin)}. Aucun prélèvement n'aura lieu après cette date.`}</Paragraphe>
        {p.logiciel ? <Paragraphe>{`Votre accès au logiciel Cloud sera fermé le ${dateFr(p.fin)}. Pensez à récupérer vos données d'ici là.`}</Paragraphe> : null}
        {p.dateLimiteRetour ? (
          <Paragraphe>
            {`Merci de nous retourner l'appareil avant le ${dateFr(p.dateLimiteRetour)}, avec l'étiquette préaffranchie à télécharger dans votre compte. Vous pouvez encore changer d'avis avec « Prolonger » jusqu'au ${dateFr(p.fin)}.`}
          </Paragraphe>
        ) : null}
        <BoutonEmail href={MES_LOCATIONS()}>Instructions et étiquette de retour</BoutonEmail>
      </>
    )),
  prolongee: (p: { appareil: string }) =>
    email("location_prolongee", "Votre location continue", "Résiliation annulée", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>{`Votre résiliation est annulée : la location de votre ${p.appareil} se poursuit au tarif des mois suivants.`}</Paragraphe>
      </>
    )),
  rappelRetour: (p: { appareil: string; dateLimiteRetour: Date; facturationLe: Date; montantHt: number }) =>
    email("location_rappel_retour", "Retour de votre appareil attendu", "Rappel de retour", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>{`Nous n'avons pas encore reçu votre ${p.appareil}, qui était à retourner avant le ${dateFr(p.dateLimiteRetour)}.`}</Paragraphe>
        <Paragraphe>
          {`Sans retour, un mois supplémentaire de location (${euros(p.montantHt)} HT) sera facturé à partir du ${dateFr(p.facturationLe)}.`}
        </Paragraphe>
        <BoutonEmail href={MES_LOCATIONS()}>Télécharger l’étiquette de retour</BoutonEmail>
      </>
    )),
  prelevementPonctuel: (p: { libelle: string; montantTtc: number; facture: string }) =>
    email("location_prelevement_ponctuel", "Prélèvement lié à votre location", "Facture prélevée", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>{`${p.libelle} : ${euros(p.montantTtc)} TTC, prélevés sur le moyen de paiement de votre location (facture ${p.facture}).`}</Paragraphe>
        <BoutonEmail href={urlDuSite("/mon-compte/factures")}>Mes factures</BoutonEmail>
      </>
    )),
  retourRecu: (p: { appareil: string; degradationHt: number | null }) =>
    email("location_retour_recu", "Nous avons reçu votre appareil", "Location terminée", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>{`Nous avons bien reçu votre ${p.appareil}. Votre location est terminée. Merci de votre confiance.`}</Paragraphe>
        {p.degradationHt ? (
          <Paragraphe>
            {`À la réception, une dégradation a été constatée : ${euros(p.degradationHt)} HT vous sont facturés. La facture détaillée est dans votre compte.`}
          </Paragraphe>
        ) : null}
        <BoutonEmail href={MES_LOCATIONS()}>Historique de mes locations</BoutonEmail>
      </>
    )),
  inviterResiliation: (p: { appareil: string }) =>
    email("location_inviter_resiliation", "Votre appareil acheté est livré", "Pensez à résilier la location", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>{`Votre ${p.appareil} acheté est livré. Si vous n'avez plus besoin de l'appareil loué, résiliez la location depuis votre compte : elle prendra fin au terme du mois payé.`}</Paragraphe>
        <BoutonEmail href={MES_LOCATIONS()}>Mes locations</BoutonEmail>
      </>
    )),
};
