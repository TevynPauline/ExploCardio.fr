import type { ArticleFamille } from "@/domaine/catalogue";
import type { EtatDisponibilite } from "@/connecteurs/odoo/interfaces";
import { euros } from "@/lib/montants";
import { Placeholder } from "./Placeholder";

export function libelleDisponibilite(d: EtatDisponibilite): string {
  if (d.etat === "disponible") return "En stock";
  if (d.etat === "delai") return `Expédié sous ${d.delaiJours} jours`;
  return "Indisponible pour le moment";
}

/**
 * Carte d'un article dans une page de famille (FR-038) : prix HT, configurations,
 * disponibilité. Sans lien vers une fiche tant que F03 ne l'a pas livrée (FR-046) ; chaque
 * configuration porte une ancre (destination de la recherche).
 */
export function CarteArticle({ article }: { article: ArticleFamille }) {
  const plusieurs = article.variantes.length > 1;
  return (
    <article id={article.reference} className="ec-card flex scroll-mt-24 flex-col gap-3">
      <Placeholder libelle={`Photo à venir : ${article.nom}`} className="aspect-[4/3]" />
      <div>
        <p className="text-small text-muted">{article.marque}</p>
        <h3 className="text-h3 font-semibold">{article.nom}</h3>
        <p className="mt-1 text-ink">
          {plusieurs ? "À partir de " : ""}
          <span className="font-semibold">{euros(article.prixAPartirDeHt)} HT</span>
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-line text-small">
        {article.variantes.map((v) => (
          <li key={v.defaultCode} id={v.defaultCode !== article.reference ? v.defaultCode : undefined} className="scroll-mt-24 py-2">
            <span className="flex flex-wrap justify-between gap-x-3">
              <span className="font-medium text-ink">{v.configuration ?? "Standard"}</span>
              {plusieurs ? <span className="text-ink">{euros(v.prixHt)} HT</span> : null}
            </span>
            <span className="flex flex-wrap justify-between gap-x-3 text-muted">
              <span>Réf. {v.referenceFabricant ?? v.defaultCode}</span>
              <span>{libelleDisponibilite(v.disponibilite)}</span>
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}
