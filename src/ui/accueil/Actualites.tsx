import Link from "next/link";
import type { Actualite } from "@/domaine/contenus";
import { Badge } from "../Badge";
import { Section } from "./Section";

const TYPES: Record<Actualite["type"], string> = {
  actualite: "Actualité",
  nouveau_produit: "Nouveau produit",
  nouvelle_offre: "Nouvelle offre",
};

/** Actualités (FR-024) : plus récentes d'abord ; section absente sans actualité. */
export function Actualites({ actualites }: { actualites: Actualite[] }) {
  if (!actualites.length) return null;
  return (
    <Section id="actualites" surtitre="Actualités" titre="Nouveautés">
      <ul className="grid gap-6 md:grid-cols-3">
        {actualites.map((a) => {
          const contenu = (
            <>
              {a.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- image téléversée
                <img src={a.image.url} alt={a.image.texteRemplacement} className="aspect-[4/3] w-full rounded-sm object-cover" />
              ) : null}
              <span><Badge>{TYPES[a.type]}</Badge></span>
              <span className="text-h3 font-semibold text-ink">{a.titre}</span>
              <span className="text-muted">{a.texte}</span>
              {a.publieLe ? (
                <time dateTime={a.publieLe} className="text-small text-muted">
                  {new Date(a.publieLe).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </time>
              ) : null}
            </>
          );
          return (
            <li key={a.id}>
              {a.lien ? (
                <Link href={a.lien} className="ec-card flex h-full flex-col gap-2 no-underline hover:border-action">{contenu}</Link>
              ) : (
                <article className="ec-card flex h-full flex-col gap-2">{contenu}</article>
              )}
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
