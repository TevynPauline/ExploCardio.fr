import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { compteCourant } from "@/domaine/comptes/session";
import { commandeDuCompte } from "@/domaine/commande/tunnel";
import { Kicker } from "@/ui";
import { Actualiser } from "@/ui/commande/Actualiser";

export const metadata: Metadata = { title: "Paiement" };

// Retour de la page de paiement (US3) : l'état réel de la commande, jamais une supposition.
export default async function RetourPaiement({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const { ref } = await searchParams;
  const { compte } = await compteCourant("/panier");
  const c = ref ? await commandeDuCompte(compte.id, ref) : null;
  if (!c) redirect("/panier");
  const enCours = c.etatAchat === "paiement_en_cours" || c.etatAbonnement === "paiement_en_cours";
  const refuse = c.etatAchat === "refusee" || c.etatAbonnement === "refusee";
  if (c.etape === "terminee") redirect(`/commande/confirmation/${c.ref}`);
  // Achat réglé, abonnement d'un panier mixte à autoriser (D1).
  if (["payee", "en_attente_virement", "a_enregistrer"].includes(c.etatAchat) && c.etatAbonnement === "a_payer") {
    return (
      <div className="mx-auto flex max-w-page flex-col gap-4 px-4 py-10">
        <Kicker>Commande {c.ref}</Kicker>
        <h1 className="text-display font-light">Vos achats sont réglés</h1>
        <p role="status" className="ec-box--info p-4">Il reste à autoriser le prélèvement mensuel de votre mise à disposition.</p>
        <p><Link href={`/commande/recapitulatif?ref=${c.ref}`} className="ec-btn ec-btn--primary">Autoriser le prélèvement mensuel</Link></p>
      </div>
    );
  }
  return (
    <div className="mx-auto flex max-w-page flex-col gap-4 px-4 py-10">
      <Kicker>Commande {c.ref}</Kicker>
      {refuse ? (
        <>
          <h1 className="text-display font-light">Paiement refusé</h1>
          <p role="alert" className="ec-box--promo p-4 font-medium">
            {c.motifRefus ?? "Le paiement n'a pas abouti."} Votre panier et vos saisies sont conservés : vous pouvez réessayer ou changer de moyen de paiement.
          </p>
          <p className="flex flex-wrap gap-3">
            <Link href={`/commande/recapitulatif?ref=${c.ref}`} className="ec-btn ec-btn--primary">Réessayer</Link>
            <Link href={`/commande/paiement?ref=${c.ref}`} className="ec-btn ec-btn--secondary">Changer de moyen de paiement</Link>
          </p>
        </>
      ) : enCours ? (
        <>
          <h1 className="text-display font-light">Paiement en cours de confirmation</h1>
          <p role="status" className="ec-box--info p-4">
            Nous attendons la confirmation de votre banque. Cette page se met à jour toute seule ; vous pouvez aussi la fermer : vous recevrez un email dès que la commande sera confirmée.
          </p>
          <Actualiser secondes={2} />
        </>
      ) : c.etatAchat === "a_enregistrer" ? (
        <>
          <h1 className="text-display font-light">Paiement reçu</h1>
          <p role="status" className="ec-box--info p-4">Votre paiement est bien reçu ; l’enregistrement de la commande prend quelques instants. Vous recevrez un email de confirmation.</p>
        </>
      ) : (
        <>
          <h1 className="text-display font-light">Paiement non finalisé</h1>
          <p><Link href={`/commande/recapitulatif?ref=${c.ref}`} className="ec-btn ec-btn--primary">Revenir au récapitulatif</Link></p>
        </>
      )}
    </div>
  );
}
