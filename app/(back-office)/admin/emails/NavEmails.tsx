import Link from "next/link";

// Navigation de Back-office → Emails (F10, FR-038).
const RUBRIQUES = [
  { href: "/admin/emails", libelle: "Suivi des envois" },
  { href: "/admin/emails/scenarios", libelle: "Scénarios et règles" },
  { href: "/admin/emails/modeles", libelle: "Modèles" },
  { href: "/admin/emails/campagnes", libelle: "Campagnes" },
];

export function NavEmails({ actif }: { actif: string }) {
  return (
    <nav aria-label="Rubriques des emails">
      <ul className="flex flex-wrap gap-2">
        {RUBRIQUES.map((r) => (
          <li key={r.href}>
            <Link href={r.href} aria-current={actif === r.href ? "page" : undefined} className={`ec-btn ${actif === r.href ? "ec-btn--primary" : "ec-btn--secondary"}`}>
              {r.libelle}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
