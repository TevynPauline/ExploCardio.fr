import type { Metadata } from "next";
import Link from "next/link";
import { cheminDeRetour } from "@/lib/retour";
import { Card, Kicker } from "@/ui";
import { FormulaireRenvoi } from "@/ui/comptes/FormulaireRenvoi";

export const metadata: Metadata = { title: "Adresse confirmée" };

// Arrivée du lien de confirmation (Better Auth redirige ici, avec ?error= si le lien est invalide).
export default async function EmailConfirme({ searchParams }: { searchParams: Promise<{ error?: string; retour?: string }> }) {
  const { error, retour: brut } = await searchParams;
  const retour = cheminDeRetour(brut);
  if (error) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10">
        <Kicker>Compte professionnel</Kicker>
        <h1 className="text-display font-light">Ce lien n’est plus valable</h1>
        <p>Le lien a expiré ou a déjà été utilisé. Demandez-en un nouveau.</p>
        <Card>
          <FormulaireRenvoi />
        </Card>
      </div>
    );
  }
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-10">
      <Kicker>Compte professionnel</Kicker>
      <h1 className="text-display font-light">Votre adresse est confirmée</h1>
      <p>
        Merci. Notre équipe vérifie maintenant votre numéro RPPS ou SIRET ; vous recevrez un email dès que votre compte
        sera validé. En attendant, vous pouvez consulter le site et ses prix.
      </p>
      {retour ? (
        <>
          <p>
            Votre panier est conservé. Une mise à disposition peut être payée dès maintenant : l’appareil part dès la validation de votre compte.
          </p>
          <p><Link href={`/connexion?retour=${encodeURIComponent(retour)}`} className="ec-btn ec-btn--primary">Reprendre ma commande</Link></p>
        </>
      ) : (
        <p><Link href="/connexion" className="ec-btn ec-btn--primary">Se connecter</Link></p>
      )}
    </div>
  );
}
