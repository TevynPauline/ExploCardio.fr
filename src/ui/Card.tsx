import type { HTMLAttributes } from "react";
import { cx } from "./cx";

/** Carte blanche bordée de la charte (.ec-card). */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("ec-card", className)} {...props} />;
}
