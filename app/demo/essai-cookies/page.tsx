import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { modeDuSite } from "@/lib/config";
import { PanneauCookies } from "@/ui/PanneauCookies";

export const metadata: Metadata = { title: "Essai du consentement aux cookies", robots: { index: false } };

// Démonstration seulement : montre le bandeau en mode « consentement », tel qu'il apparaîtra
// le jour où un usage soumis au consentement sera ajouté (tests de US3, décision D3).
export default function EssaiCookies() {
  if (modeDuSite() !== "demo") notFound();
  return (
    <main className="mx-auto max-w-page px-4 py-16">
      <h1 className="text-h2 font-light">Essai du consentement aux cookies</h1>
      <p>Cette page de démonstration simule un usage soumis au consentement.</p>
      <PanneauCookies
        finalites={[{ cle: "audience", libelle: "Mesure d'audience", description: "Statistiques de fréquentation anonymes (exemple)." }]}
      />
    </main>
  );
}
