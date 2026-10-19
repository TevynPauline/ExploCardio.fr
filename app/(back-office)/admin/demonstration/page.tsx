import type { Metadata } from "next";
import Link from "next/link";
import { ecranDemonstration } from "@/connecteurs/demonstration";
import { Card, Kicker } from "@/ui";

export const metadata: Metadata = { title: "Démonstration" };

const OUTILS = [
  { href: "/admin/demonstration/prix", titre: "Prix", texte: "Prix HT et offres de mise à disposition des articles fictifs." },
  { href: "/admin/demonstration/stocks", titre: "Stocks", texte: "Quantités, délais et ruptures." },
  { href: "/admin/demonstration/parametres-commerciaux", titre: "Paramètres commerciaux", texte: "Bons d'achat, droits d'assistance, promotions." },
  { href: "/admin/demonstration/paiements", titre: "Paiements", texte: "Échéances mensuelles et remboursements simulés." },
  { href: "/admin/demonstration/fidelite", titre: "Fidélité", texte: "Ajustements de cagnottes et de droits, interventions à clore, expiration des bons, promotions." },
  { href: "/admin/demonstration/locations", titre: "Locations", texte: "Expédier, livrer, retours, impayés et actions planifiées des mises à disposition." },
  { href: "/admin/demonstration/pannes", titre: "Pannes simulées", texte: "Rendre un connecteur indisponible pour montrer les cas d'erreur." },
  { href: "/admin/demonstration/boite", titre: "Boîte de démonstration", texte: "Emails et notifications qui auraient été envoyés." },
  { href: "/admin/demonstration/acces", titre: "Accès au site de démonstration", texte: "Mot de passe partagé avec les testeurs." },
  { href: "/admin/demonstration/reinitialiser", titre: "Réinitialiser", texte: "Revenir à l'état de départ, en moins d'une minute." },
];

// Écran de démonstration (US5, FR-024) : consultation de la base fictive et accès aux outils.
export default async function Demonstration() {
  const { compteurs, variantes } = await ecranDemonstration.apercu();
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Démonstration</Kicker>
      <h1 className="text-h2 font-light">Base de démonstration</h1>
      <p className="ec-box--promo p-4">
        Toutes ces données sont fictives. Les prix sont inventés et doivent être remplacés avant toute
        présentation à un médecin.
      </p>
      <Card>
        <h2 className="text-h3 font-semibold">Contenu de la base</h2>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
          {[
            ["Articles (variantes)", variantes.length],
            ["Médecins et cabinets", compteurs.partenaires],
            ["Commandes", compteurs.commandes],
            ["Factures et avoirs", compteurs.factures],
            ["Locations et abonnements", compteurs.abonnements],
            ["Accès Cloud", compteurs.accesCloud],
          ].map(([libelle, valeur]) => (
            <div key={String(libelle)}>
              <dt className="text-small text-muted">{libelle}</dt>
              <dd className="text-h3 font-light">{valeur}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {OUTILS.map((o) => (
          <li key={o.href}>
            <Link href={o.href} className="ec-card block h-full no-underline hover:border-action">
              <span className="block text-h3 font-semibold text-action">{o.titre}</span>
              <span className="mt-1 block text-muted">{o.texte}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
