import { montantsAffiches, type MontantAffichable } from "@/domaine/catalogue/prix";
import { euros } from "@/lib/montants";
import { cx } from "../cx";

/**
 * Prix de la charte (F22, constitution 2.3.0) : TTC en caractères principaux, en Semibold ;
 * HT juste en dessous, moins appuyé, toujours présent. Un seul paragraphe : les lecteurs d'écran
 * lisent « … TTC, soit … HT » d'une traite. `periode` (« / mois », « le lot de 10 ») suit
 * chacun des deux montants. Montant nul : « Offert ».
 */
export function Prix({
  aPartirDe = false,
  periode,
  taille = "normal",
  className,
  ...montant
}: MontantAffichable & {
  aPartirDe?: boolean;
  periode?: string;
  taille?: "normal" | "grand";
  className?: string;
}) {
  const { ttc, ht } = montantsAffiches(montant.ttc === undefined ? { ht: montant.ht, tauxTva: montant.tauxTva ?? 20 } : montant);
  const p = periode ? ` ${periode}` : "";
  if (ttc === 0 && ht === 0) {
    return <p className={cx("font-semibold text-ink", taille === "grand" ? "text-h2" : "", className)}>Offert</p>;
  }
  return (
    <p className={cx("flex flex-col", className)} data-prix-ttc={ttc} data-prix-ht={ht}>
      <span className={cx("font-semibold text-ink", taille === "grand" ? "text-h2" : "")}>
        {aPartirDe ? "À partir de " : ""}
        {euros(ttc)} TTC{p}
      </span>{" "}
      <span className="text-small text-muted">
        soit {euros(ht)} HT{p}
      </span>
    </p>
  );
}
