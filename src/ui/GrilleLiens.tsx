import Link from "next/link";
import { Badge } from "./Badge";

export type CarteLien = { titre: string; texte: string; href: string; badge?: string | null };

/** Grille de cartes de liens (pages catalogue et services). */
export function GrilleLiens({ cartes }: { cartes: CarteLien[] }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {cartes.map((c) => (
        <li key={c.href}>
          <Link href={c.href} className="ec-card flex h-full flex-col gap-2 no-underline hover:border-action">
            {c.badge ? <span><Badge>{c.badge}</Badge></span> : null}
            <span className="text-h3 font-semibold text-ink">{c.titre}</span>
            <span className="text-muted">{c.texte}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
