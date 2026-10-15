import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { modeDuSite } from "@/lib/config";
import { ButtonLink, Card, Kicker } from "@/ui";

export const metadata: Metadata = { title: "Contact (démonstration)", robots: { index: false, follow: false } };

// Remplace l'appel et la discussion WhatsApp sur le site de démonstration (FR-033).
export default async function ContactDemo({ searchParams }: { searchParams: Promise<{ moyen?: string }> }) {
  if (modeDuSite() !== "demo") notFound();
  const { moyen } = await searchParams;
  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-12">
      <Kicker>Démonstration</Kicker>
      <h1 className="text-h2 font-light">
        {moyen === "appel" ? "Appel" : "Discussion WhatsApp"} non lancé
      </h1>
      <Card>
        <p>
          Sur le site réel, ce bouton {moyen === "appel" ? "lance un appel vers" : "ouvre une discussion WhatsApp avec"} la
          hotline ExploCardio.fr. Sur le site de démonstration, le numéro est fictif et personne n’est contacté.
        </p>
      </Card>
      <div>
        <ButtonLink href="/" variante="secondaire">Revenir à l’accueil</ButtonLink>
      </div>
    </main>
  );
}
