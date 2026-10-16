import Link from "next/link";
import { confirmerChangementEmail } from "@/domaine/comptes/profil";
import { Kicker } from "@/ui";

export const metadata = { title: "Confirmation de la nouvelle adresse" };

// Lien reçu à la nouvelle adresse (US5-4) : il suffit à confirmer le changement.
export default async function ConfirmerEmail({ searchParams }: { searchParams: Promise<{ u?: string; jeton?: string }> }) {
  const { u, jeton } = await searchParams;
  const ok = u && jeton ? await confirmerChangementEmail(u, jeton) : false;
  return (
    <>
      <Kicker>Mon compte</Kicker>
      <h1 className="text-h2 font-light">{ok ? "Nouvelle adresse confirmée" : "Ce lien n’est plus valable"}</h1>
      <p>{ok ? "Votre nouvelle adresse email remplace l'ancienne. Utilisez-la pour vous connecter." : "Le lien a expiré ou a déjà été utilisé. Vous pouvez refaire la demande depuis « Mon compte »."}</p>
      <p><Link href="/mon-compte" className="ec-btn ec-btn--secondary">Mon compte</Link></p>
    </>
  );
}
