import { cx } from "./cx";

/** Emplacement d'une photo à venir (.ec-placeholder). */
export function Placeholder({ libelle, className }: { libelle: string; className?: string }) {
  return (
    <div className={cx("ec-placeholder", className)} role="img" aria-label={libelle}>
      {libelle}
    </div>
  );
}
