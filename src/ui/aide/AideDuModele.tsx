import Link from "next/link";
import { aideDe, TYPES } from "@/domaine/aide/lecture";

/** « Aide pour ce modèle » (F09, US3-5) : contenus d'aide publiés reliés aux références de la fiche. */
export async function AideDuModele({ references }: { references: string[] }) {
  const contenus = await aideDe(references);
  if (!contenus.length) return null;
  return (
    <section aria-labelledby="titre-aide-modele" className="flex flex-col gap-3">
      <h2 id="titre-aide-modele" className="text-h2 font-light">Aide pour ce modèle</h2>
      <ul className="grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {contenus.map((c) => (
          <li key={c.id} className="ec-card flex flex-col gap-1">
            <span className="text-small text-muted">{TYPES[c.type]}</span>
            <Link href={c.type === "faq" ? `/aide?q=${encodeURIComponent(c.titre)}` : `/aide/${c.slug}`} className="inline-flex min-h-11 items-center font-semibold">{c.titre}</Link>
          </li>
        ))}
      </ul>
      <p className="text-small"><Link href="/aide" className="inline-flex min-h-11 items-center">Tout le centre d’aide</Link></p>
    </section>
  );
}
