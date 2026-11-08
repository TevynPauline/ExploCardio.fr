import type { MetadataRoute } from "next";
import type { PolitiqueIndexation } from "./politique";

// Plan du site (F21, R7, contrats § 2). Lu depuis la base du site seulement (jamais Odoo) :
// il reste servi si le catalogue est injoignable.

export type AdressePlan = { chemin: string; modifieLe?: Date | null };
/** Pages publiées du site ouvert ; une erreur de lecture ne vide pas le plan. */
export type LecturePlan = () => Promise<AdressePlan[]>;

export async function adressesPlanDuSite(politique: PolitiqueIndexation, origine: string, lire?: LecturePlan): Promise<MetadataRoute.Sitemap> {
  if (politique === "ferme") return [];
  const accueil = { url: `${origine}/` };
  if (politique === "attente" || !lire) return [accueil];
  let pages: AdressePlan[] = [];
  try {
    pages = await lire();
  } catch {
    pages = [];
  }
  const vues = new Set<string>(["/"]);
  const autres = pages.filter((p) => !vues.has(p.chemin) && vues.add(p.chemin));
  return [accueil, ...autres.map((p) => ({ url: `${origine}${p.chemin}`, ...(p.modifieLe ? { lastModified: p.modifieLe } : {}) }))];
}
