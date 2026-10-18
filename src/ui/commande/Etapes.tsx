import Link from "next/link";
import { cx } from "../cx";

const ETAPES = [
  { cle: "adresses", libelle: "Adresses" },
  { cle: "livraison", libelle: "Livraison" },
  { cle: "paiement", libelle: "Paiement" },
  { cle: "recapitulatif", libelle: "Récapitulatif" },
  { cle: "confirmation", libelle: "Confirmation" },
] as const;

export type CleEtape = (typeof ETAPES)[number]["cle"];

/** Repère de progression du tunnel (FR-008) : étape courante annoncée, étapes passées cliquables. */
export function Etapes({ courante, atteinte, refCommande, sansLivraison = false }: { courante: CleEtape; atteinte: CleEtape; refCommande: string; sansLivraison?: boolean }) {
  const liste = ETAPES.filter((e) => !(sansLivraison && e.cle === "livraison"));
  const rangAtteint = liste.findIndex((e) => e.cle === atteinte);
  return (
    <nav aria-label="Étapes de la commande">
      <ol className="flex list-none flex-wrap gap-x-4 gap-y-2 p-0 text-small">
        {liste.map((e, i) => {
          const actif = e.cle === courante;
          const accessible = i <= rangAtteint && e.cle !== "confirmation" && !actif;
          return (
            <li key={e.cle} className="flex items-center gap-2">
              <span aria-hidden="true" className={cx("inline-grid size-7 place-items-center rounded-full border", actif ? "border-action bg-action text-white" : "border-line")}>
                {i + 1}
              </span>
              {accessible ? (
                <Link href={`/commande/${e.cle}?ref=${refCommande}`} className="inline-flex min-h-11 items-center">{e.libelle}</Link>
              ) : (
                <span aria-current={actif ? "step" : undefined} className={cx("inline-flex min-h-11 items-center", actif ? "font-semibold text-ink" : "text-muted")}>
                  {e.libelle}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
