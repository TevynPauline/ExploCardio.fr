import { render } from "@react-email/render";
import { euros } from "@/lib/montants";
import { urlDuSite } from "./charte";
import { BoutonEmail, Gabarit, Paragraphe } from "./Gabarit";
import type { EmailRendu } from "./modeles";

// Emails de F04 (contracts/emails.md) : gabarit de la charte, vouvoiement, montants HT puis
// TTC, aucun nom d'organisme de financement.

async function email(modele: string, objet: string, apercu: string, corps: React.ReactNode): Promise<EmailRendu> {
  return { modele, objet, rendu: await render(<Gabarit apercu={apercu} titre={objet}>{corps}</Gabarit>) };
}

export type LigneEmail = { libelle: string; quantite: number; totalHt: number };
export type Rib = { titulaire: string; iban: string; bic: string };

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

function dateFr(d: Date): string {
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export const emailsCommandes = {
  confirmation: (p: { ref: string; lignes: LigneEmail[]; totalHt: number; totalTtc: number; virement?: { rib: Rib; echeance: Date } | null }) =>
    email("commande_confirmee", `Votre commande ${p.ref}`, p.virement ? "En attente de votre virement" : "Merci pour votre commande", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>
          {p.virement ? "Votre commande est enregistrée et attend votre virement." : "Votre commande est confirmée. Merci de votre confiance."}
        </Paragraphe>
        <Lignes lignes={p.lignes} />
        <Paragraphe>
          Total : {euros(p.totalHt)} HT, soit {euros(p.totalTtc)} TTC.
        </Paragraphe>
        {p.virement ? (
          <>
            <Paragraphe>
              Merci de régler {euros(p.totalTtc)} TTC avant le {dateFr(p.virement.echeance)}, en rappelant la référence {p.ref}.
            </Paragraphe>
            <Paragraphe>
              Titulaire : {p.virement.rib.titulaire}
              <br />
              IBAN : {p.virement.rib.iban}
              <br />
              BIC : {p.virement.rib.bic}
            </Paragraphe>
          </>
        ) : null}
        <BoutonEmail href={urlDuSite("/mon-compte/commandes")}>Suivre ma commande</BoutonEmail>
      </>
    )),
  rappelVirement: (p: { ref: string; totalTtc: number; echeance: Date; rib: Rib }) =>
    email("rappel_virement", `Rappel : virement attendu pour la commande ${p.ref}`, "Votre commande est réservée jusqu'à l'échéance", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>
          Nous n’avons pas encore reçu votre virement de {euros(p.totalTtc)} TTC pour la commande {p.ref}. Les articles restent réservés
          jusqu’au {dateFr(p.echeance)} ; sans virement à cette date, la commande sera annulée.
        </Paragraphe>
        <Paragraphe>
          IBAN : {p.rib.iban} — BIC : {p.rib.bic} — référence à rappeler : {p.ref}
        </Paragraphe>
      </>
    )),
  annulation: (p: { ref: string; motif: string }) =>
    email("commande_annulee", `Commande ${p.ref} annulée`, "Votre commande a été annulée", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>
          Votre commande {p.ref} a été annulée : {p.motif}. Si vous souhaitez toujours ces articles, vous pouvez commander à nouveau
          depuis le site, ou nous contacter.
        </Paragraphe>
        <BoutonEmail href={urlDuSite("/catalogue")}>Voir le catalogue</BoutonEmail>
      </>
    )),
  paiementRecu: (p: { ref: string }) =>
    email("virement_recu", `Paiement reçu pour la commande ${p.ref}`, "Votre facture est disponible", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>Nous avons bien reçu votre virement. Votre commande {p.ref} est en préparation ; votre facture est disponible dans votre compte.</Paragraphe>
        <BoutonEmail href={urlDuSite("/mon-compte/factures")}>Mes factures</BoutonEmail>
      </>
    )),
  expedition: (p: { ref: string; transporteur: string | null; suivi: string | null }) =>
    email("commande_expediee", `Votre commande ${p.ref} est expédiée`, "Suivez votre colis", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>
          Votre commande {p.ref} est expédiée{p.transporteur ? ` par ${p.transporteur}` : ""}.
          {p.suivi ? ` Numéro de suivi : ${p.suivi}.` : ""}
        </Paragraphe>
        <BoutonEmail href={urlDuSite(`/mon-compte/commandes/${encodeURIComponent(p.ref)}`)}>Suivre ma commande</BoutonEmail>
      </>
    )),
  remboursement: (p: { ref: string; montantTtc: number; total: boolean }) =>
    email("remboursement", `Remboursement de la commande ${p.ref}`, "Votre avoir est disponible", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>
          Nous avons {p.total ? "remboursé" : "remboursé en partie"} votre commande {p.ref} : {euros(p.montantTtc)} TTC. L’avoir
          correspondant est disponible dans votre compte.
        </Paragraphe>
        <BoutonEmail href={urlDuSite("/mon-compte/factures")}>Mes factures et avoirs</BoutonEmail>
      </>
    )),
  abonnement: (p: { ref: string; premierMoisTtc: number; moisSuivantsTtc: number }) =>
    email("abonnement_souscrit", `Votre mise à disposition (${p.ref})`, "Votre abonnement mensuel est en place", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>
          Votre mise à disposition est souscrite : {euros(p.premierMoisTtc)} TTC le premier mois, puis {euros(p.moisSuivantsTtc)} TTC par
          mois, prélevés à la même date chaque mois. Sans engagement de durée : vous pouvez l’arrêter à tout moment.
        </Paragraphe>
        <BoutonEmail href={urlDuSite("/mon-compte/locations")}>Mes locations</BoutonEmail>
      </>
    )),
  echeance: (p: { montantTtc: number }) =>
    email("echeance_payee", "Votre échéance mensuelle", "Votre facture du mois est disponible", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>Votre échéance de {euros(p.montantTtc)} TTC a bien été prélevée. La facture est disponible dans votre compte.</Paragraphe>
        <BoutonEmail href={urlDuSite("/mon-compte/factures")}>Mes factures</BoutonEmail>
      </>
    )),
  financementRecu: (p: { equipements: string[]; dureeMois: number; mensualiteHt: number | null; mention: string }) =>
    email("financement_recu", "Votre demande de financement", "Nous étudions votre demande", (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>
          {`Nous avons bien reçu votre demande de financement sur ${p.dureeMois} mois pour : ${p.equipements.join(", ")}.`}
        </Paragraphe>
        {p.mensualiteHt ? (
          <Paragraphe>
            {`Mensualité indicative : ${euros(p.mensualiteHt)} HT par mois. ${p.mention}`}
          </Paragraphe>
        ) : null}
        <Paragraphe>Nous revenons vers vous rapidement. Vous suivez l’avancement de votre demande dans votre compte.</Paragraphe>
        <BoutonEmail href={urlDuSite("/mon-compte/financements")}>Suivre ma demande</BoutonEmail>
      </>
    )),
  statutFinancement: (p: { statut: string }) =>
    email("financement_statut", "Votre demande de financement", `Statut : ${p.statut}`, (
      <>
        <Paragraphe>Bonjour,</Paragraphe>
        <Paragraphe>{`Votre demande de financement est désormais : ${p.statut}.`}</Paragraphe>
        <BoutonEmail href={urlDuSite("/mon-compte/financements")}>Voir ma demande</BoutonEmail>
      </>
    )),
};
