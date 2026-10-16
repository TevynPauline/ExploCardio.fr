import Link from "next/link";
import type { ReactNode } from "react";
import { lireParametresPublics } from "@/domaine/contenus";
import { Logo } from "./Logo";
import { LienGestionCookies } from "./LienGestionCookies";

/** Pied de page (FR-027) : fond sombre, logo blanc, liens, inscription à la newsletter. */
export async function PiedDePage({ newsletter }: { newsletter?: ReactNode }) {
  const p = await lireParametresPublics();
  const liens = [
    { href: "/qui-sommes-nous#contact", libelle: "Contact" },
    { href: "/qui-sommes-nous", libelle: "Qui sommes-nous" },
    { href: "/mentions-legales", libelle: "Mentions légales" },
    { href: "/cgv", libelle: "CGV" },
    { href: "/cgu", libelle: "CGU" },
    { href: "/confidentialite", libelle: "Politique de confidentialité" },
  ];
  return (
    <footer className="ec-dark border-t border-line/20">
      <div className="mx-auto grid max-w-page gap-10 px-4 py-12 md:grid-cols-[1fr_1fr_1.2fr]">
        <div className="flex flex-col gap-4">
          <Logo version="horizontal-blanc" hauteur={28} />
          <p className="text-small text-white">
            Le spécialiste des explorations fonctionnelles cardiaques (hors imagerie).
          </p>
          {p.telephone || p.email ? (
            <ul className="text-small text-white">
              {p.telephone ? <li>{p.telephone}</li> : null}
              {p.email ? (
                <li>
                  <a href={`mailto:${p.email}`} className="text-white underline underline-offset-2">{p.email}</a>
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
        <nav aria-label="Liens du pied de page">
          <ul className="flex flex-col">
            {liens.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-flex min-h-11 min-w-11 items-center text-white underline-offset-2 hover:underline">
                  {l.libelle}
                </Link>
              </li>
            ))}
            <li>
              <LienGestionCookies />
            </li>
          </ul>
        </nav>
        <div>{newsletter}</div>
      </div>
    </footer>
  );
}
