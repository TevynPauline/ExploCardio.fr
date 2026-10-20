import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { modeDuSite } from "@/lib/config";
import { messageDuVisiteur } from "@/domaine/contact/contact";
import { ButtonLink, Card, Kicker } from "@/ui";

export const metadata: Metadata = { title: "Contact (démonstration)", robots: { index: false, follow: false } };

// Remplace l'appel et la discussion WhatsApp sur le site de démonstration (FR-033).
export default async function ContactDemo({ searchParams }: { searchParams: Promise<{ moyen?: string }> }) {
  if (modeDuSite() !== "demo") notFound();
  const { moyen } = await searchParams;
  // F09 (US2) : le message qui aurait été pré-rempli, recalculé ici (rien de personnel dans l'adresse).
  const message = moyen === "appel" ? null : await messageDuVisiteur();
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
      {message ? (
        <Card>
          <p className="font-semibold text-ink">Message pré-rempli dans WhatsApp</p>
          <p data-testid="message-prerempli">{message}</p>
          <p className="text-small text-muted">Vous pourriez le modifier avant de l’envoyer.</p>
        </Card>
      ) : null}
      <div>
        <ButtonLink href="/" variante="secondaire">Revenir à l’accueil</ButtonLink>
      </div>
    </main>
  );
}
