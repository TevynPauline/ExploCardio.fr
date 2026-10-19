import Link from "next/link";
import { euros } from "@/lib/montants";
import type { Gains } from "@/domaine/fidelite/gains";
import { Dots } from "../Dots";

const date = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" });

/**
 * Ce qu'un achat rapporte (F06, FR-024) : bons d'achat, droits d'assistance, palier suivant.
 * Le motif des trois points illustre le parcours consommables → bons → assistance (FR-036).
 */
export function GainsFidelite({ gains, titre = "Ce que cette commande vous rapporte" }: { gains: Gains; titre?: string }) {
  const { bonsAchatHt, tauxPourcent, palierSuivant, droitsJusquAu, seuilDroitsHt, montantEligibleHt, droitsActifsJusquAu } = gains;
  if (!montantEligibleHt) return null;
  return (
    <section aria-label={titre} className="ec-box--info flex flex-col gap-2 p-4">
      <p className="flex items-center gap-2 font-semibold text-ink">
        <Dots /> {titre}
      </p>
      <p>{bonsAchatHt > 0 ? `${euros(bonsAchatHt)} HT de bons d'achat (${tauxPourcent} % des consommables et accessoires).` : "Pas encore de bons d'achat pour ce montant."}</p>
      {palierSuivant ? <p className="text-small">Encore {euros(palierSuivant.manqueHt)} HT de consommables pour passer à {palierSuivant.tauxPourcent} %.</p> : null}
      <p className="text-small">
        {droitsJusquAu
          ? droitsActifsJusquAu
            ? `Votre assistance gratuite est prolongée jusqu'au ${date(droitsJusquAu)}.`
            : `Elle vous ouvre l'assistance gratuite (hotline et SAV réactif) jusqu'au ${date(droitsJusquAu)}.`
          : droitsActifsJusquAu
            ? `Votre assistance gratuite court jusqu'au ${date(droitsActifsJusquAu)}.`
            : `Encore ${euros(Math.max(0, seuilDroitsHt - montantEligibleHt))} HT de consommables pour ouvrir l'assistance gratuite.`}
      </p>
    </section>
  );
}

export type ResultatFidelite = { bonsHt: number; droitsJusquAu: Date | null; manqueDroitsHt: number };

/** Après la commande (US2, A2) : gains obtenus, ou ce qui manquait pour ouvrir l'assistance. */
export function ResultatCommande({ resultat, enAttente }: { resultat: ResultatFidelite; enAttente: boolean }) {
  const { bonsHt, droitsJusquAu, manqueDroitsHt } = resultat;
  if (enAttente) {
    return (
      <section aria-label="Vos avantages" className="ec-box--info flex flex-col gap-2 p-4">
        <p className="flex items-center gap-2 font-semibold text-ink"><Dots /> Vos avantages</p>
        <p>Vos bons d&apos;achat et vos droits d&apos;assistance seront comptés à la réception de votre virement.</p>
      </section>
    );
  }
  if (!bonsHt && !droitsJusquAu && !manqueDroitsHt) return null;
  return (
    <section aria-label="Vos avantages" className="ec-box--info flex flex-col gap-2 p-4">
      <p className="flex items-center gap-2 font-semibold text-ink"><Dots /> Vos avantages</p>
      {bonsHt > 0 ? <p>{euros(bonsHt)} HT de bons d&apos;achat ont été ajoutés à votre cagnotte.</p> : null}
      {droitsJusquAu ? <p>Votre assistance gratuite (hotline et SAV réactif) court jusqu&apos;au {date(droitsJusquAu)}.</p> : null}
      {manqueDroitsHt > 0 ? <p className="text-small">Il manquait {euros(manqueDroitsHt)} HT de consommables pour ouvrir l&apos;assistance gratuite.</p> : null}
      <p className="text-small"><Link href="/mon-compte/bons-achat" className="underline">Voir mes bons d&apos;achat</Link></p>
    </section>
  );
}
