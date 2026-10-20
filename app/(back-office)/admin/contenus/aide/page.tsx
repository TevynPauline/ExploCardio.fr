import type { Metadata } from "next";
import Link from "next/link";
import { THEMES, TYPES } from "@/domaine/aide/lecture";
import { dbSite } from "@/lib/db/site";
import { Kicker } from "@/ui";

export const metadata: Metadata = { title: "Centre d’aide" };

// Centre d'aide (F09, US4) : contenus en préparation et publiés.
export default async function AideAdmin() {
  const contenus = await dbSite().contenuAide.findMany({ orderBy: [{ etat: "asc" }, { type: "asc" }, { ordre: "asc" }] });
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Contenus</Kicker>
      <h1 className="text-h2 font-light">Centre d’aide</h1>
      <p className="text-muted">Tutoriels vidéo, modes d’emploi, notices générales et FAQ. Les notices des produits se gèrent sur la fiche du produit (Catalogue).</p>
      <p><Link href="/admin/contenus/aide/nouveau" className="ec-btn ec-btn--primary">Nouveau contenu</Link></p>
      <ul className="flex list-none flex-col gap-2 p-0">
        {contenus.map((c) => (
          <li key={c.id} className="ec-card flex flex-wrap items-center justify-between gap-2">
            <span>
              <Link href={`/admin/contenus/aide/${c.id}`} className="font-semibold">{c.titre}</Link>
              <span className="block text-small text-muted">{TYPES[c.type]} · {THEMES[c.theme]}{c.type === "faq" ? ` · ${c.consultations} consultations` : ""}</span>
            </span>
            <span className="text-small font-semibold">{c.etat === "publie" ? "Publié" : "En préparation"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
