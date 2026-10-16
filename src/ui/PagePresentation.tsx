import type { ReactNode } from "react";
import { GROUPES_TYPES } from "@/domaine/familles";
import type { ArticleFamille } from "@/domaine/catalogue";
import { lireTexte } from "@/domaine/textes";
import { modeDuSite } from "@/lib/config";
import { CarteArticle } from "./CarteArticle";
import { Kicker } from "./Kicker";
import { TexteRiche } from "./TexteRiche";

type Props = {
  texte: string;
  surtitre: string;
  articles?: ArticleFamille[];
  indisponible?: boolean;
  avant?: ReactNode;
  apres?: ReactNode;
};

/** Page de présentation d'une famille ou d'un service (FR-038). */
export async function PagePresentation({ texte, surtitre, articles, indisponible, avant, apres }: Props) {
  const { titre, html } = await lireTexte(texte);
  return (
    <div className="mx-auto flex max-w-page flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-3">
        <Kicker>{surtitre}</Kicker>
        <h1 className="text-display font-light">{titre}</h1>
        <TexteRiche html={html} />
      </header>
      {avant}
      {indisponible ? (
        <p role="status" className="ec-box--info p-4">
          Le catalogue est momentanément indisponible. Réessayez dans quelques instants ou contactez-nous.
        </p>
      ) : null}
      {articles?.length ? (
        <>
          {modeDuSite() === "demo" ? (
            <p className="text-small text-muted">Version de démonstration : les prix affichés sont inventés.</p>
          ) : null}
          {GROUPES_TYPES.map((g) => {
            const liste = articles.filter((a) => a.type === g.type);
            if (!liste.length) return null;
            return (
              <section key={g.type} id={g.ancre} aria-labelledby={`titre-${g.ancre}`} className="scroll-mt-24">
                <h2 id={`titre-${g.ancre}`} className="mb-4 text-h2 font-light">{g.libelle}</h2>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {liste.map((a) => (
                    <CarteArticle key={a.reference} article={a} />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      ) : null}
      {apres}
    </div>
  );
}
