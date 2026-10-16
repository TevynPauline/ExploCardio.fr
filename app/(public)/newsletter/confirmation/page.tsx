import type { Metadata } from "next";
import Link from "next/link";
import { confirmerInscription } from "@/domaine/newsletter";
import { Kicker } from "@/ui";

export const metadata: Metadata = { title: "Confirmation de l'inscription", robots: { index: false } };

export default async function Confirmation({ searchParams }: { searchParams: Promise<{ jeton?: string }> }) {
  const { jeton } = await searchParams;
  const resultat = jeton ? await confirmerInscription(jeton) : "inconnue";
  return (
    <div className="mx-auto flex max-w-page flex-col gap-4 px-4 py-10">
      <Kicker>Newsletter</Kicker>
      <h1 className="text-display font-light">
        {resultat === "confirmee" ? "Inscription confirmée" : "Ce lien n'est plus valable"}
      </h1>
      <p>
        {resultat === "confirmee"
          ? "Merci, vous recevrez désormais la newsletter d'ExploCardio.fr. Chaque envoi contient un lien de désinscription."
          : "Le lien a expiré ou a déjà été utilisé. Vous pouvez vous inscrire à nouveau depuis le bas de chaque page."}
      </p>
      <p><Link href="/" className="ec-btn ec-btn--secondary">Revenir à l’accueil</Link></p>
    </div>
  );
}
