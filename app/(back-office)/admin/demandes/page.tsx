import type { Metadata } from "next";
import Link from "next/link";
import { dbSite } from "@/lib/db/site";
import { Kicker } from "@/ui";

export const metadata: Metadata = { title: "Demandes" };

// Demandes (F13, D1) : financements (F04), devis (F03) et messages du formulaire de contact (F01).
export default async function Demandes() {
  const [financements, devis, messages] = await Promise.all([
    dbSite().demandeFinancement.count({ where: { statut: "recue" } }),
    dbSite().demandeDevis.count({ where: { statut: "recue" } }),
    dbSite().messageContact.count({ where: { etat: "nouveau" } }),
  ]);
  const rubriques = [
    { href: "/admin/financements", titre: "Demandes de financement", texte: "Reçues, en étude, accordées ou refusées ; notes internes.", nouveaux: financements },
    { href: "/admin/devis", titre: "Demandes de devis", texte: "ECG de repos, hébergement : en cours, traitées ; notes internes.", nouveaux: devis },
    { href: "/admin/demandes/messages", titre: "Messages de contact", texte: "Formulaire de contact du site : nouveaux, en cours, traités.", nouveaux: messages },
  ];
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Demandes</Kicker>
      <h1 className="text-h2 font-light">Demandes</h1>
      <ul className="grid gap-4 sm:grid-cols-3">
        {rubriques.map((r) => (
          <li key={r.href}>
            <Link href={r.href} className="ec-card block h-full no-underline hover:border-action">
              <span className="block text-h3 font-semibold text-action">{r.titre}</span>
              <span className="mt-1 block text-muted">{r.texte}</span>
              <span className="mt-2 block font-medium text-ink">{r.nouveaux} nouvelle{r.nouveaux > 1 ? "s" : ""}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
