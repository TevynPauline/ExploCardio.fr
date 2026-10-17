import type { Metadata } from "next";
import { Fiche, metadonneesFiche } from "@/ui/catalogue/Fiche";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return metadonneesFiche("epreuve-effort", (await params).slug);
}

export default async function Page({ params, searchParams }: Props) {
  return <Fiche cle="epreuve-effort" slug={(await params).slug} parametres={await searchParams} />;
}
