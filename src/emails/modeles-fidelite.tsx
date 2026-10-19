import { render } from "@react-email/render";
import { euros } from "@/lib/montants";
import { urlDuSite } from "./charte";
import { BoutonEmail, Gabarit, Paragraphe } from "./Gabarit";
import type { EmailRendu } from "./modeles";

// Emails de F06 : gabarit de la charte, vouvoiement, montants HT, ton sobre.

async function email(modele: string, objet: string, apercu: string, corps: React.ReactNode): Promise<EmailRendu> {
  return { modele, objet, rendu: await render(<Gabarit apercu={apercu} titre={objet}>{corps}</Gabarit>) };
}

const dateFr = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });
const MES_BONS = () => urlDuSite("/mon-compte/bons-achat");
const MES_DROITS = () => urlDuSite("/mon-compte/assistance");

export const emailsFidelite = {
  credit: (p: { montantHt: number; commandeRef: string | null; validiteFin: Date | null }) =>
    email("fidelite_credit", `${euros(p.montantHt)} de bons d'achat crédités`, "Votre cagnotte augmente", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>
          {`Votre commande${p.commandeRef ? ` ${p.commandeRef}` : ""} vous rapporte ${euros(p.montantHt)} HT de bons d'achat, utilisables sur vos prochains achats${p.validiteFin ? ` jusqu'au ${dateFr(p.validiteFin)}` : ""}.`}
        </Paragraphe>
        <BoutonEmail href={MES_BONS()}>Voir ma cagnotte</BoutonEmail>
      </>
    )),
  retrait: (p: { montantHt: number; commandeRef: string | null }) =>
    email("fidelite_retrait", "Bons d'achat retirés", "Suite à une annulation ou un remboursement", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>{`Suite à l'annulation ou au remboursement de la commande ${p.commandeRef ?? ""}, ${euros(p.montantHt)} HT de bons d'achat qu'elle vous avait apportés sont retirés de votre cagnotte.`}</Paragraphe>
        <BoutonEmail href={MES_BONS()}>Voir ma cagnotte</BoutonEmail>
      </>
    )),
  restitution: (p: { montantHt: number; commandeRef: string | null; validiteFin: Date | null }) =>
    email("fidelite_restitution", "Bons d'achat rendus", "Vos bons sont de nouveau disponibles", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>
          {`Les ${euros(p.montantHt)} HT de bons d'achat utilisés pour la commande ${p.commandeRef ?? ""} vous sont rendus${p.validiteFin ? `, utilisables jusqu'au ${dateFr(p.validiteFin)}` : ""}.`}
        </Paragraphe>
        <BoutonEmail href={MES_BONS()}>Voir ma cagnotte</BoutonEmail>
      </>
    )),
  ajustement: (p: { montantHt: number; motif: string | null }) =>
    email("fidelite_ajustement", "Votre cagnotte a été ajustée", "Ajustement de votre cagnotte", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>{`Notre équipe a ajusté votre cagnotte de ${p.montantHt > 0 ? "+" : ""}${euros(p.montantHt)} HT${p.motif ? ` : ${p.motif}` : ""}.`}</Paragraphe>
        <BoutonEmail href={MES_BONS()}>Voir ma cagnotte</BoutonEmail>
      </>
    )),
  droits: (p: { type: "ouverture" | "prolongation" | "retrait" | "ajustement"; fin: Date; motif: string | null }) =>
    email(
      `droits_${p.type}`,
      p.type === "retrait" ? "Vos droits d'assistance ont changé" : "Votre assistance est offerte",
      "Droits d'assistance",
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>
          {p.type === "ouverture"
            ? `Votre commande vous ouvre l'assistance gratuite : hotline et SAV réactif, jusqu'au ${dateFr(p.fin)}.`
            : p.type === "prolongation"
              ? `Votre commande prolonge votre assistance gratuite jusqu'au ${dateFr(p.fin)}.`
              : p.type === "retrait"
                ? `Suite à l'annulation ou au remboursement d'une commande, vos droits d'assistance vont désormais jusqu'au ${dateFr(p.fin)}.`
                : `Notre équipe a ajusté vos droits d'assistance : ils vont jusqu'au ${dateFr(p.fin)}${p.motif ? ` (${p.motif})` : ""}.`}
        </Paragraphe>
        <BoutonEmail href={MES_DROITS()}>Mes droits d’assistance</BoutonEmail>
      </>,
    ),
  rappelFinDroits: (p: { fin: Date; seuilHt: number }) =>
    email("droits_rappel_fin", "Votre assistance gratuite se termine bientôt", "Comment la prolonger", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>{`Votre assistance gratuite se termine le ${dateFr(p.fin)}. Une commande de consommables d'au moins ${euros(p.seuilHt)} HT la prolonge.`}</Paragraphe>
        <BoutonEmail href={urlDuSite("/accessoires-consommables")}>Voir les consommables</BoutonEmail>
      </>
    )),
  rappelExpiration: (p: { montantHt: number; date: Date }) =>
    email("bons_rappel_expiration", "Des bons d'achat expirent bientôt", "Pensez à les utiliser", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>{`${euros(p.montantHt)} HT de bons d'achat expirent le ${dateFr(p.date)}. Utilisez-les dans votre panier lors de votre prochaine commande.`}</Paragraphe>
        <BoutonEmail href={MES_BONS()}>Voir ma cagnotte</BoutonEmail>
      </>
    )),
  interventionClose: () =>
    email("intervention_cloturee", "Votre intervention d'assistance est terminée", "Intervention close", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>Votre intervention d’assistance à l’acte est terminée. Merci de votre confiance.</Paragraphe>
        <BoutonEmail href={MES_DROITS()}>Mes droits d’assistance</BoutonEmail>
      </>
    )),
};
