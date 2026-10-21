import type { Metadata } from "next";
import Link from "next/link";
import { PAGES_TEXTE } from "@/domaine/pages";
import { dbSite } from "@/lib/db/site";
import { Card, Kicker } from "@/ui";

export const metadata: Metadata = { title: "Textes des pages" };

// Textes des pages (F13, US2, D8) : chaque page garde son texte d'origine ; un texte modifié se
// prépare en brouillon, se prévisualise puis se publie.
export default async function TextesDesPages() {
  const lignes = await dbSite().contenu.findMany({ where: { type: "page" }, select: { cle: true, etat: true, brouillon: true, publieLe: true } });
  const etat = (nom: string) => {
    const l = lignes.find((x) => x.cle === nom);
    if (!l) return "Texte d’origine";
    return [l.etat === "publie" ? `Modifié, publié le ${l.publieLe?.toLocaleDateString("fr-FR")}` : "Texte d’origine", l.brouillon ? "brouillon en cours" : null].filter(Boolean).join(" · ");
  };
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Contenus</Kicker>
      <h1 className="text-h2 font-light">Textes des pages</h1>
      <Card>
        <ul className="flex list-none flex-col gap-1 p-0">
          {Object.entries(PAGES_TEXTE).map(([nom, p]) => (
            <li key={nom} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-1">
              <Link href={`/admin/contenus/pages/${nom}`} className="inline-flex min-h-11 items-center font-medium">{p.libelle}</Link>
              <span className="text-small text-muted">{p.chemin} · {etat(nom)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
