import type { Metadata } from "next";
import { PageCategorie } from "@/ui/catalogue/PageCategorie";

export const metadata: Metadata = { title: "Holter tensionnel / MAPA" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Page({ searchParams }: Props) {
  return <PageCategorie cle="holter-tensionnel" parametres={await searchParams} />;
}
