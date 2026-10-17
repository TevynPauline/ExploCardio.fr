import type { ReactNode } from "react";
import { lireTexte } from "@/domaine/textes";
import { Kicker } from "./Kicker";
import { TexteRiche } from "./TexteRiche";

type Props = {
  texte: string;
  surtitre: string;
  avant?: ReactNode;
  apres?: ReactNode;
};

/** Page de présentation d'un service ou d'une rubrique (F01, FR-038) ; les catégories ont leur page (F03). */
export async function PagePresentation({ texte, surtitre, avant, apres }: Props) {
  const { titre, html } = await lireTexte(texte);
  return (
    <div className="mx-auto flex max-w-page flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-3">
        <Kicker>{surtitre}</Kicker>
        <h1 className="text-display font-light">{titre}</h1>
        <TexteRiche html={html} />
      </header>
      {avant}
      {apres}
    </div>
  );
}
