import type { Metadata } from "next";
import Link from "next/link";
import { PageFamille } from "@/ui/PageFamille";

export const metadata: Metadata = { title: "Holter ECG" };

// L'ECG de repos est une sous-famille de Holter ECG (FR-009).
export default function Page() {
  return (
    <PageFamille
      cle="holter-ecg"
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
