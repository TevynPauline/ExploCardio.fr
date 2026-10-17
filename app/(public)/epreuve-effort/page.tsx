import type { Metadata } from "next";
import { PageCategorie } from "@/ui/catalogue/PageCategorie";

export const metadata: Metadata = { title: "Épreuve & écho d'effort" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function Page({ searchParams }: Props) {
  return <PageCategorie cle="epreuve-effort" parametres={await searchParams} />;
}
