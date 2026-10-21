import Link from "next/link";

// Filtre par état d'une liste de demandes (F13, US6).
export function Onglets({ chemin, actif, etats, comptes }: { chemin: string; actif: string; etats: Record<string, string>; comptes: Partial<Record<string, number>> }) {
  const tous = Object.values(comptes).reduce<number>((s, n) => s + (n ?? 0), 0);
  return (
    <nav aria-label="Filtrer par état">
      <ul className="flex flex-wrap gap-2">
        {[...Object.entries(etats), ["tous", "Toutes"] as const].map(([v, l]) => (
          <li key={v}>
            <Link href={`${chemin}?etat=${v}`} aria-current={v === actif ? "page" : undefined} className={`ec-btn ${v === actif ? "ec-btn--primary" : "ec-btn--secondary"}`}>
              {l} ({v === "tous" ? tous : (comptes[v] ?? 0)})
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
