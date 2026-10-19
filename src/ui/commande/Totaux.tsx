import type { Devis } from "@/connecteurs/odoo/interfaces";
import { euros } from "@/lib/montants";

function Ligne({
  libelle,
  montant,
  fort = false,
  negatif = false,
}: {
  libelle: string;
  montant: number;
  fort?: boolean;
  negatif?: boolean;
}) {
  return (
    <div
      className={`flex justify-between gap-4 py-1 ${fort ? "border-t border-line pt-2 font-semibold text-ink" : ""}`}
    >
      <dt>{libelle}</dt>
      <dd>
        {negatif && montant > 0 ? "− " : ""}
        {euros(montant)}
      </dd>
    </div>
  );
}

/** Bloc « Paiement unique » (FR-002) : HT, remises, bons, port, TVA, TTC. */
export function TotauxAchat({
  achat,
  regleCumul,
}: {
  achat: NonNullable<Devis["achat"]>;
  regleCumul: string;
}) {
  return (
    <div>
      <dl className="flex flex-col">
        <Ligne libelle="Sous-total HT" montant={achat.sousTotalHt} />
        {achat.remisesAutomatiquesHt ? (
          <Ligne libelle="Remises en cours" montant={achat.remisesAutomatiquesHt} negatif />
        ) : null}
        {achat.remiseCodePromoHt ? (
          <Ligne libelle="Code promo" montant={achat.remiseCodePromoHt} negatif />
        ) : null}
        {achat.bonsHt ? <Ligne libelle="Bons d'achat" montant={achat.bonsHt} negatif /> : null}
        <Ligne libelle="Livraison HT" montant={achat.fraisPortHt} />
        {achat.fraisSpecifiquesHt ? (
          <Ligne
            libelle="Livraison et installation des équipements volumineux HT"
            montant={achat.fraisSpecifiquesHt}
          />
        ) : null}
        <Ligne libelle="Total HT" montant={achat.totalHt} fort />
        <Ligne libelle="TVA" montant={achat.tva} />
        <Ligne libelle="Total TTC" montant={achat.totalTtc} fort />
      </dl>
      {achat.remisesAutomatiquesHt || achat.remiseCodePromoHt ? (
        <p className="mt-2 text-small text-muted">{regleCumul}</p>
      ) : null}
    </div>
  );
}

/** Bloc « Abonnement mensuel » (FR-003) : premier mois et mois suivants, HT et TTC. */
/**
 * Montants de l'abonnement mensuel. `prochaineEcheance` (AAAA-MM-JJ) : première échéance après
 * la livraison, connue au récapitulatif (F05 : la location commence à la livraison).
 */
export function TotauxAbonnement({ abonnement, prochaineEcheance = null }: { abonnement: NonNullable<Devis["abonnement"]>; prochaineEcheance?: string | null }) {
  const echeance = prochaineEcheance ? new Date(`${prochaineEcheance}T12:00:00Z`) : null;
  return (
    <div>
      <dl className="flex flex-col">
        <Ligne libelle="Premier mois HT" montant={abonnement.premierMoisHt} />
        <Ligne libelle="Premier mois TTC" montant={abonnement.premierMoisTtc} fort />
        <Ligne libelle="Mois suivants HT" montant={abonnement.moisSuivantsHt} />
        <Ligne libelle="Mois suivants TTC" montant={abonnement.moisSuivantsTtc} fort />
      </dl>
      <p className="mt-2 text-small text-muted">
        {echeance
          ? `Premier mois réglé aujourd’hui ; la location commence à la livraison, puis prélèvement le ${echeance.getUTCDate()} de chaque mois (prochaine échéance : le ${echeance.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}).`
          : "Premier mois réglé à la commande, puis prélèvement chaque mois à la date anniversaire de la livraison."}{" "}
        Sans engagement de durée : arrêtable à tout moment.
      </p>
    </div>
  );
}
