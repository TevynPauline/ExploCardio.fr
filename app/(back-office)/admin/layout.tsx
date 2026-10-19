import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { modeDuConnecteur, modeDuSite } from "@/lib/config";
import { exigerEquipe } from "@/lib/roles";
import { Logo } from "@/ui";
import { BoutonDeconnexion } from "./BoutonDeconnexion";

export const metadata: Metadata = {
  title: { default: "Back-office", template: "%s — Back-office ExploCardio.fr" },
  robots: { index: false, follow: false },
};

// Back-office (socle F11) : réservé à l'équipe, double authentification obligatoire.
// F13 l'étendra (contenus, paramètres, comptes, demandes).
export default async function MiseEnPageBackOffice({ children }: { children: ReactNode }) {
  const { role, user } = await exigerEquipe();
  const outilsDemo = modeDuSite() === "demo" && modeDuConnecteur("odoo") === "demo" && role === "admin";
  const liens = [
    { href: "/admin", libelle: "Tableau de bord" },
    ...(role === "admin" || role === "commercial" ? [{ href: "/admin/comptes", libelle: "Comptes" }] : []),
    ...(role === "admin" || role === "commercial" ? [{ href: "/admin/catalogue", libelle: "Catalogue" }] : []),
    { href: "/admin/commandes", libelle: "Commandes" },
    { href: "/admin/locations", libelle: "Locations" },
    ...(role === "admin" || role === "commercial" ? [{ href: "/admin/financements", libelle: "Financements" }] : []),
    ...(role === "admin" ? [{ href: "/admin/contenus", libelle: "Contenus" }] : []),
    ...(outilsDemo
      ? [
          { href: "/admin/demonstration", libelle: "Démonstration" },
          { href: "/admin/demonstration/boite", libelle: "Boîte de démonstration" },
        ]
      : []),
  ];
  return (
    <div className="min-h-screen">
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
