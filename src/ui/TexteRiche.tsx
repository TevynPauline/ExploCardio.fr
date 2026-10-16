import { cx } from "./cx";

/** Affiche un texte Markdown déjà rendu et nettoyé (src/domaine/textes.ts) aux styles de la charte. */
export function TexteRiche({ html, className }: { html: string; className?: string }) {
  return <div className={cx("texte-riche", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
