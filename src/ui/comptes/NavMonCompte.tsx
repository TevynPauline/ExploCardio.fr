import Link from "next/link";

const LIENS = [
  { href: "/mon-compte", libelle: "Tableau de bord" },
  { href: "/mon-compte/informations", libelle: "Informations" },
  { href: "/mon-compte/adresses", libelle: "Adresses" },
  { href: "/mon-compte/preferences", libelle: "Préférences" },
  { href: "/mon-compte/securite", libelle: "Sécurité" },
  { href: "/mon-compte/donnees", libelle: "Mes données" },
];

/** Navigation de « Mon compte ». */
export function NavMonCompte({ actif }: { actif: string }) {
  return (
    <nav aria-label="Mon compte">
      <ul className="flex flex-wrap gap-2">
        {LIENS.map((l) => (
          <li key={l.href}>
            <Link href={l.href} aria-current={l.href === actif ? "page" : undefined} className={`ec-btn ${l.href === actif ? "ec-btn--primary" : "ec-btn--secondary"}`}>
              {l.libelle}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
