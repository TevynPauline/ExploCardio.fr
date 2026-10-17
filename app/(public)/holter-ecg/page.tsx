import type { Metadata } from "next";
import Link from "next/link";
import { PageCategorie } from "@/ui/catalogue/PageCategorie";

export const metadata: Metadata = { title: "Holter ECG" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// L'ECG de repos est une catégorie à part entière, présentée sous Holter ECG (FR-001, I1).
export default async function Page({ searchParams }: Props) {
  return (
    <PageCategorie
      cle="holter-ecg"
      parametres={await searchParams}
      avant={
        <Link href="/holter-ecg/ecg-de-repos" className="ec-card flex items-center justify-between gap-4 no-underline hover:border-action">
          <span>
            <span className="block text-h3 font-semibold text-ink">ECG de repos</span>
            <span className="block text-muted">Pour le dépannage ou un poste supplémentaire.</span>
          </span>
          <span className="ec-btn ec-btn--secondary">Voir</span>
        </Link>
      }
    />
  );
}
