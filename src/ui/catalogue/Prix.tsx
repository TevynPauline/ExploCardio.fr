import { prixTtc } from "@/domaine/catalogue/prix";
import { euros } from "@/lib/montants";
import { cx } from "../cx";

/**
 * Prix de la charte (FR-027, FR-041) : HT en premier, en Semibold ; TTC en complément, moins
 * appuyé. `periode` : « / mois » pour une mensualité.
 */
export function Prix({
  ht,
  tauxTva = 20,
  aPartirDe = false,
  periode,
  taille = "normal",
  className,
}: {
  ht: number;
  tauxTva?: number;
  aPartirDe?: boolean;
  periode?: string;
  taille?: "normal" | "grand";
  className?: string;
}) {
  return (
    <p className={cx("flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={cx("font-semibold text-ink", taille === "grand" ? "text-h2" : "")}>
        {aPartirDe ? "À partir de " : ""}
        {euros(ht)} HT{periode ? ` ${periode}` : ""}
      </span>
      <span className="text-small text-muted">
        soit {euros(prixTtc(ht, tauxTva))} TTC{periode ? ` ${periode}` : ""}
      </span>
    </p>
  );
}
