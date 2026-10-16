import Link from "next/link";
import type { EtatBienvenue } from "@/domaine/comptes/bienvenue";

/** Offre de bienvenue dans « Mon compte » (US4-1, US4-5, US4-7, FR-018). */
export function EncartBienvenue({ etat, texte }: { etat: EtatBienvenue; texte: string }) {
  if (etat.etat === "inactive") return null;
  const contenu: Record<Exclude<EtatBienvenue["etat"], "inactive">, React.ReactNode> = {
    beneficiaire: <>Votre tensiomètre de bienvenue sera joint gratuitement à votre première commande.</>,
    en_attente_stock: <>Votre tensiomètre de bienvenue est momentanément en rupture : il vous sera expédié dès son retour en stock.</>,
    recu: <>Vous avez reçu votre tensiomètre de bienvenue. Merci de votre confiance.</>,
    non_abonne: (
      <>
        {texte} Pour en bénéficier, <Link href="/mon-compte/preferences">abonnez-vous à la newsletter</Link>.
      </>
    ),
    non_valide: <>{texte} Votre droit sera ouvert dès la validation de votre compte, si vous êtes abonné à la newsletter.</>,
  };
  return (
    <section aria-labelledby="titre-bienvenue" className="ec-box--promo p-5">
      <h2 id="titre-bienvenue" className="mb-1 text-h3 font-semibold">Offre de bienvenue</h2>
      <p>{contenu[etat.etat]}</p>
    </section>
  );
}
