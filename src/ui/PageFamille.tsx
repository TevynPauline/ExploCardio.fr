import type { ReactNode } from "react";
import { lireArticlesFamille } from "@/domaine/catalogue";
import { FAMILLES, type CleFamille } from "@/domaine/familles";
import { PagePresentation } from "./PagePresentation";

/** Page d'une famille de produits : texte + articles du catalogue (FR-038). */
export async function PageFamille({ cle, avant }: { cle: CleFamille; avant?: ReactNode }) {
  const famille = FAMILLES[cle];
  const { articles, indisponible } = await lireArticlesFamille(famille.categorie);
  return <PagePresentation texte={famille.texte} surtitre="Catalogue" articles={articles} indisponible={indisponible} avant={avant} />;
}
