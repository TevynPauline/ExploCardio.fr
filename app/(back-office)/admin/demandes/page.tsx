import type { Metadata } from "next";
import Link from "next/link";
import { dbSite } from "@/lib/db/site";
import { Kicker } from "@/ui";

export const metadata: Metadata = { title: "Demandes" };

// Demandes (F13, D1) : financements (F04), devis (F03), messages du formulaire de contact (F01)
// et inscriptions de la page d'attente (F17).
export default async function Demandes() {
  const [financements, devis, messages, ouverture] = await Promise.all([
    dbSite().demandeFinancement.count({ where: { statut: "recue" } }),
    dbSite().demandeDevis.count({ where: { statut: "recue" } }),
    dbSite().messageContact.count({ where: { etat: "nouveau" } }),
    dbSite().inscriptionOuverture.count(),
  ]);
  const rubriques = [
    { href: "/admin/financements", titre: "Demandes de financement", texte: "Reçues, en étude, accordées ou refusées ; notes internes.", nouveaux: financements },
    { href: "/admin/devis", titre: "Demandes de devis", texte: "ECG de repos, hébergement : en cours, traitées ; notes internes.", nouveaux: devis },
    { href: "/admin/demandes/messages", titre: "Messages de contact", texte: "Formulaire de contact du site : nouveaux, en cours, traités.", nouveaux: messages },
  ];
  const inscrits = `${ouverture} inscrit${ouverture > 1 ? "s" : ""}`;
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Demandes</Kicker>
      <h1 className="text-h2 font-light">Demandes</h1>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {rubriques.map((r) => (
          <li key={r.href}>
            <Link href={r.href} className="ec-card block h-full no-underline hover:border-action">
              <span className="block text-h3 font-semibold text-action">{r.titre}</span>
              <span className="mt-1 block text-muted">{r.texte}</span>
              <span className="mt-2 block font-medium text-ink">{r.nouveaux} nouvelle{r.nouveaux > 1 ? "s" : ""}</span>
            </Link>
          </li>
        ))}
        <li>
          <Link href="/admin/demandes/ouverture" className="ec-card block h-full no-underline hover:border-action">
            <span className="block text-h3 font-semibold text-action">Inscriptions à l’ouverture</span>
            <span className="mt-1 block text-muted">Page d’attente de www.explocardio.fr : coordonnées, commentaires, export CSV.</span>
            <span className="mt-2 block font-medium text-ink">{inscrits}</span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
