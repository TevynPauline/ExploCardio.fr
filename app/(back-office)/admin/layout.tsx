import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { rubriquesVisibles } from "@/lib/droits";
import { exigerEquipe } from "@/lib/roles";
import { Logo } from "@/ui";
import { BandeauDemo } from "@/ui/BandeauDemo";
import { BoutonDeconnexion } from "./BoutonDeconnexion";

export const metadata: Metadata = {
  title: { default: "Back-office", template: "%s — Back-office ExploCardio.fr" },
  robots: { index: false, follow: false },
};

// Back-office (F11, F13) : réservé à l'équipe, double authentification obligatoire ; menu
// regroupé, chaque rôle ne voit que ses rubriques (D1, D2).
export default async function MiseEnPageBackOffice({ children }: { children: ReactNode }) {
  const { role, user } = await exigerEquipe();
  const liens = rubriquesVisibles(role);
  return (
    <div className="min-h-screen">
      <BandeauDemo />
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-4 px-4 py-3">
          <Link href="/admin" aria-label="Back-office ExploCardio.fr, tableau de bord" className="inline-flex min-h-11 items-center">
            <Logo hauteur={28} />
          </Link>
          <nav aria-label="Back-office">
            <ul className="flex flex-wrap gap-2">
              {liens.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-flex min-h-11 items-center px-3 font-medium">
                    {l.libelle}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex min-w-0 flex-wrap items-center gap-3 text-small text-muted">
            <span className="min-w-0 break-all">
              {user.email} · {role}
            </span>
            <BoutonDeconnexion />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-page px-4 py-8">{children}</main>
    </div>
  );
}
