import type { Metadata } from "next";
import Link from "next/link";
import { compteCourant } from "@/domaine/comptes/session";
import { DemandeRefusee, peutDemander, preparerDemande } from "@/domaine/financement/demande";
import { Card, Kicker } from "@/ui";
import { FormulaireFinancement } from "@/ui/financement/FormulaireFinancement";

export const metadata: Metadata = { title: "Demander mon financement" };

// Demande de financement longue durée (F04, US6) depuis une fiche (?article=) ou le panier
// (?depuis=panier) : équipements et coordonnées préremplis, aucun paiement en ligne.
export default async function DemandeFinancement({ searchParams }: { searchParams: Promise<{ article?: string; depuis?: string }> }) {
  const { article, depuis } = await searchParams;
  const panier = depuis === "panier";
  const retour = panier ? "/financement/demande?depuis=panier" : `/financement/demande${article ? `?article=${encodeURIComponent(article)}` : ""}`;
  const { compte } = await compteCourant(retour);

  const autorise = peutDemander(compte.statut);
  let preparation: Awaited<ReturnType<typeof preparerDemande>> | null = null;
  let indisponible: string | null = null;
  if (autorise) {
    try {
      preparation = await preparerDemande(compte.id, { article, panier });
    } catch (e) {
      if (!(e instanceof DemandeRefusee)) throw e;
      indisponible = e.message;
    }
  }

  let contenu: React.ReactNode;
  if (!autorise) {
    contenu = (
      <Card>
        <p>Votre compte ne permet pas encore de demander un financement. Confirmez votre email ou <Link href="/qui-sommes-nous#contact">contactez-nous</Link>.</p>
      </Card>
    );
  } else if (indisponible || !preparation) {
    contenu = <p role="status" className="ec-box--info p-4">{indisponible}</p>;
  } else if (!preparation.equipements.length) {
    contenu = (
      <Card>
        <p>
          Aucun équipement finançable n’est sélectionné. Choisissez « Financement longue durée » sur la fiche d’un équipement, ou{" "}
          <Link href="/financement">découvrez le financement</Link>.
        </p>
      </Card>
    );
  } else {
    contenu = (
      <FormulaireFinancement
        source={panier ? "panier" : "fiche"}
        equipements={preparation.equipements}
        durees={preparation.durees}
        mention={preparation.mention}
        cabinet={preparation.cabinet}
        telephone={compte.utilisateur.telephone ?? ""}
      />
    );
  }
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <Kicker>Financement</Kicker>
      <h1 className="text-display font-light">Demander mon financement</h1>
      <p className="text-muted">Étalez l’investissement sur la durée de votre choix. Nous étudions votre demande et vous répondons rapidement.</p>
      {contenu}
    </div>
  );
}
