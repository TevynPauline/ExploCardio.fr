import { unstable_cache } from "next/cache";
import { registre } from "@/connecteurs/registre";
import type { ReferenceArticle } from "@/connecteurs/odoo/interfaces";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import { ETIQUETTES } from "@/lib/cache";

// Articles d'une famille pour les pages de présentation (F01, FR-038), lus par le connecteur
// Odoo et mis en cache (étiquettes catalogue, prix, stock). Une ligne par article, avec ses
// configurations (variantes).

export type ArticleFamille = {
  reference: string;
  nom: string;
  marque: string;
  type: ReferenceArticle["type"];
  prixAPartirDeHt: number;
  variantes: ReferenceArticle[];
};

const lireReferences = unstable_cache(() => registre.odoo().catalogue.listerReferences(), ["references"], {
  tags: [ETIQUETTES.catalogue, ETIQUETTES.prix, ETIQUETTES.stock],
  revalidate: 300,
});

export type ResultatFamille = { articles: ArticleFamille[]; indisponible: boolean };

export async function lireArticlesFamille(categorie: string): Promise<ResultatFamille> {
  let references: ReferenceArticle[];
  try {
    references = await lireReferences();
  } catch (e) {
    if (estErreurConnecteur(e)) return { articles: [], indisponible: true };
    throw e;
  }
  const parArticle = new Map<string, ReferenceArticle[]>();
  for (const r of references.filter((x) => x.categorie === categorie)) {
    parArticle.set(r.referenceArticle, [...(parArticle.get(r.referenceArticle) ?? []), r]);
  }
  const articles = [...parArticle.entries()].map(([reference, variantes]) => ({
    reference,
    nom: variantes[0]!.nom,
    marque: variantes[0]!.marque,
    type: variantes[0]!.type,
    prixAPartirDeHt: Math.min(...variantes.map((v) => v.prixHt)),
    variantes,
  }));
  return { articles, indisponible: false };
}
