import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { lireTexte } from "@/domaine/textes";
import { Kicker, TexteRiche } from "@/ui";
import { FilAriane } from "@/ui/FilAriane";

const PAGES = ["mentions-legales", "cgv", "cgu", "confidentialite", "cookies"] as const;
type Page = (typeof PAGES)[number];

export const dynamicParams = false;

export function generateStaticParams() {
  return PAGES.map((legale) => ({ legale }));
}

export async function generateMetadata({ params }: { params: Promise<{ legale: string }> }): Promise<Metadata> {
  const { legale } = await params;
  if (!PAGES.includes(legale as Page)) return {};
  return { title: (await lireTexte(legale)).titre };
}

// Pages légales (FR-027) : textes de contenus/ ; « Texte en cours de validation » en attendant (D5).
export default async function PageLegale({ params }: { params: Promise<{ legale: string }> }) {
  const { legale } = await params;
  if (!PAGES.includes(legale as Page)) notFound();
  const { titre, html } = await lireTexte(legale);
  return (
    <div className="mx-auto flex max-w-page flex-col gap-4 px-4 py-10">
      <FilAriane etapes={[{ libelle: titre }]} />
      <Kicker>Informations</Kicker>
      <h1 className="text-display font-light">{titre}</h1>
      <TexteRiche html={html} />
    </div>
  );
}
