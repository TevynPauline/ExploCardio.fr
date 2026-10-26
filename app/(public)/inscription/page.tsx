import type { Metadata } from "next";
import Link from "next/link";
import { jetonAffichage } from "@/domaine/anti-robots";
import { numeroExige, specialites } from "@/domaine/comptes/inscription";
import { offreActive } from "@/domaine/comptes/bienvenue";
import { lireParametresPublics } from "@/domaine/contenus";
import { cheminDeRetour } from "@/lib/retour";
import { Card, Kicker } from "@/ui";
import { FormulaireInscription } from "@/ui/comptes/FormulaireInscription";
import { FilAriane } from "@/ui/FilAriane";

export const metadata: Metadata = { title: "Créer un compte professionnel" };
export const dynamic = "force-dynamic";

// Inscription (F02, US1 ; F16 : sans RPPS, SIRET ou SIREN facultatif selon le paramètre).
export default async function Inscription({ searchParams }: { searchParams: Promise<{ retour?: string }> }) {
  // F05 (FR-008) : un médecin qui commande une mise à disposition crée son compte sans perdre ses choix.
  const retour = cheminDeRetour((await searchParams).retour);
  const [liste, active, p, exige] = await Promise.all([specialites(), offreActive(), lireParametresPublics(), numeroExige()]);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <FilAriane etapes={[{ libelle: "Créer un compte" }]} />
      <Kicker>Compte professionnel</Kicker>
      <h1 className="text-display font-light">Créer votre compte</h1>
      <p>
        Le site est réservé aux professionnels de santé de France métropolitaine. Dès la confirmation de votre email, vous
        pouvez commander ; notre équipe vérifie ensuite le numéro SIRET ou SIREN de votre cabinet.
      </p>
      <p className="text-small">
        Déjà inscrit ? <Link href={retour ? `/connexion?retour=${encodeURIComponent(retour)}` : "/connexion"}>Se connecter</Link>
      </p>
      <Card>
        <FormulaireInscription specialites={liste} offreBienvenue={active ? p.offreBienvenue : null} jeton={jetonAffichage()} retour={retour} numeroObligatoire={exige === "inscription"} />
      </Card>
    </div>
  );
}
