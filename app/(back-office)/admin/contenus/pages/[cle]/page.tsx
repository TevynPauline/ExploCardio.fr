import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { etatPage, PAGES_TEXTE } from "@/domaine/pages";
import { exigerDroit, peut } from "@/lib/droits";
import { ApercuCadres } from "@/ui/ApercuCadres";
import { Button, Card, Kicker, Retour } from "@/ui";
import { actionOriginePage, actionPublierPage } from "../actions";
import { EditeurTexte } from "./EditeurTexte";

export const metadata: Metadata = { title: "Texte d’une page" };

// Texte d'une page (F13, US2, D7 à D9) : brouillon en Markdown simple, aperçu (ordinateur et
// mobile), publication, retour au texte d'origine ; verrou contre les modifications simultanées.
export default async function TexteDePage({ params, searchParams }: { params: Promise<{ cle: string }>; searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const { role } = await exigerDroit("contenus", "voir");
  const { cle } = await params;
  const page = PAGES_TEXTE[cle];
  if (!page) notFound();
  const r = await searchParams;
  const e = await etatPage(cle);
  const modifiable = peut(role, "contenus", "modifier");
  const modifieLe = e.modifieLe?.toISOString() ?? "";
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Contenus · Textes des pages</Kicker>
      <h1 className="text-h2 font-light">{page.libelle}</h1>
      <p className="text-muted">
        {page.chemin} · {e.publie ? `texte modifié, publié le ${e.publieLe?.toLocaleDateString("fr-FR")}` : "texte d’origine"}
        {e.brouillon ? " · brouillon non publié" : ""} · <Link href="/admin/contenus/pages">toutes les pages</Link>
      </p>
      <Retour {...r} />
      {modifiable ? (
        <Card className="flex flex-col gap-3">
          <p className="ec-box--info p-3 text-small">N’indiquez aucune donnée de patient dans les textes du site.</p>
          <p className="text-small text-muted">
            Markdown simple : la première ligne « # Titre » ; « ## Sous-titre » ; une ligne vide entre deux paragraphes ; « - » pour une liste ; **gras** ; [texte du lien](/chemin).
          </p>
          <EditeurTexte nom={cle} modifieLe={modifieLe} texte={e.brouillon ?? e.enVigueur} />
          <div className="flex flex-wrap gap-3">
            {e.brouillon ? (
              <form action={actionPublierPage}>
                <input type="hidden" name="nom" value={cle} />
                <input type="hidden" name="modifieLe" value={modifieLe} />
                <Button type="submit">Publier</Button>
              </form>
            ) : null}
            {e.publie || e.brouillon ? (
              <form action={actionOriginePage}>
                <input type="hidden" name="nom" value={cle} />
                <Button type="submit" variante="secondaire">Revenir au texte d’origine</Button>
              </form>
            ) : null}
          </div>
        </Card>
      ) : null}
      <Card>
        <h2 className="text-h3 font-semibold">Aperçu {e.brouillon ? "du brouillon" : "du texte en vigueur"}</h2>
        <ApercuCadres chemin={page.chemin} />
      </Card>
    </div>
  );
}
