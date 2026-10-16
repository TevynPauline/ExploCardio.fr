import type { Metadata } from "next";
import Link from "next/link";
import { desinscrire } from "@/domaine/newsletter";
import { Kicker } from "@/ui";

export const metadata: Metadata = { title: "Désinscription", robots: { index: false } };

export default async function Desinscription({ searchParams }: { searchParams: Promise<{ jeton?: string }> }) {
  const { jeton } = await searchParams;
  const ok = jeton ? await desinscrire(jeton) : false;
  return (
    <div className="mx-auto flex max-w-page flex-col gap-4 px-4 py-10">
      <Kicker>Newsletter</Kicker>
      <h1 className="text-display font-light">{ok ? "Vous êtes désinscrit" : "Ce lien n'est pas valable"}</h1>
      <p>{ok ? "Vous ne recevrez plus la newsletter d'ExploCardio.fr." : "Ce lien de désinscription n'est pas reconnu."}</p>
      <p><Link href="/" className="ec-btn ec-btn--secondary">Revenir à l’accueil</Link></p>
    </div>
  );
}
