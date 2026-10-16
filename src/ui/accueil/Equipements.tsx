import Link from "next/link";
import type { MarqueAffichee } from "@/domaine/contenus";
import { Placeholder } from "../Placeholder";
import { Section } from "./Section";

const FAMILLES = [
  { titre: "Holter ECG", texte: "Enregistreurs Holter ECG et analyse dans le Cloud.", href: "/holter-ecg" },
  { titre: "Holter tensionnel / MAPA", texte: "Mesure ambulatoire de la pression artérielle.", href: "/holter-tensionnel" },
  { titre: "Épreuve & écho d'effort", texte: "ECG d'effort, ergomètres et divans d'écho d'effort.", href: "/epreuve-effort" },
];

/** Équipement et marques (FR-019) : 3 cartes, puis la grille des marques. */
export function Equipements({ marques }: { marques: MarqueAffichee[] }) {
  return (
    <Section id="equipements" surtitre="Équipement" titre="Trois familles, les marques de référence">
      <ul className="grid gap-6 md:grid-cols-3">
        {FAMILLES.map((f) => (
          <li key={f.href}>
            <Link href={f.href} className="ec-card flex h-full flex-col gap-3 no-underline hover:border-action">
              <Placeholder libelle={`Photo à venir : ${f.titre}`} className="aspect-[4/3]" />
              <span className="text-h3 font-semibold text-ink">{f.titre}</span>
              <span className="text-muted">{f.texte}</span>
            </Link>
          </li>
        ))}
      </ul>
      {marques.length ? (
        <div>
          <h3 className="mb-3 text-small font-semibold text-muted">Nos marques</h3>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {marques.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/recherche?q=${encodeURIComponent(m.nom)}`}
                  className="group flex aspect-[3/2] items-center justify-center rounded border border-line bg-surface p-3 text-center no-underline"
                >
                  {m.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- logo téléversé, dimensions variables
                    <img src={m.logo} alt={m.nom} className="max-h-10 w-auto grayscale group-hover:grayscale-0 group-focus-visible:grayscale-0" />
                  ) : (
                    <span className="font-medium text-ink">{m.nom}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Section>
  );
}
