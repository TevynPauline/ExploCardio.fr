import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

type Variante = "principal" | "secondaire";

const classes: Record<Variante, string> = {
  principal: "ec-btn ec-btn--primary",
  secondaire: "ec-btn ec-btn--secondary",
};

type BoutonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variante?: Variante;
};

/** Bouton de la charte (.ec-btn). Zone cliquable d'au moins 44 × 44 px (app/globals.css). */
export function Button({ variante = "principal", className, type = "button", ...props }: BoutonProps) {
  return <button type={type} className={cx(classes[variante], className)} {...props} />;
}

type LienBoutonProps = {
  href: string;
  variante?: Variante;
  className?: string;
  children: ReactNode;
};

/** Lien présenté comme un bouton de la charte. */
export function ButtonLink({ href, variante = "principal", className, children }: LienBoutonProps) {
  return (
    <Link href={href} className={cx(classes[variante], className)}>
      {children}
    </Link>
  );
}
