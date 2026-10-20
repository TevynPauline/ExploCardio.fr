import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { modeDuSite } from "@/lib/config";
import { ButtonLink, Card, Kicker } from "@/ui";

export const metadata: Metadata = { title: "Plateforme Cloud (démonstration)", robots: { index: false, follow: false } };

// Remplace la plateforme Cloud HDS du partenaire sur le site de démonstration (F12, D6) : aucun
// compte réel n'existe, aucune donnée de patient n'est affichée.
export default function PlateformeCloudDemo() {
  if (modeDuSite() !== "demo") notFound();
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-12">
      <Kicker>Démonstration</Kicker>
      <h1 className="text-h2 font-light">Plateforme Cloud simulée</h1>
      <Card>
        <p>
          Sur le site réel, ce lien ouvre la plateforme Cloud hébergée en France (HDS) de notre partenaire, où le médecin se connecte avec le mot de
          passe qu’il a créé lui-même. Sur le site de démonstration, aucune plateforme n’est contactée et aucun compte réel n’existe.
        </p>
      </Card>
      <div>
        <ButtonLink href="/mon-compte/logiciels" variante="secondaire">Revenir à mes logiciels</ButtonLink>
      </div>
    </main>
  );
}
