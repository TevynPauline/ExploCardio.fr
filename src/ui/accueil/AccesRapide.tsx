import Image from "next/image";
import { sansOptimisation } from "../images";
import Link from "next/link";
import type { Tuile } from "@/domaine/contenus";
import { Badge } from "../Badge";
import { Dots } from "../Dots";
import { Section } from "./Section";

const FONDS: Record<string, string> = {
  pale: "bg-pale",
  "blue-soft": "bg-blue-soft",
  lin: "bg-lin",
  mint: "bg-mint",
};

/** Accès rapide (FR-017, FR-018) : 6 tuiles carrées, 3 / 2 / 1 par ligne ; F16 : image facultative. */
export function AccesRapide({ tuiles }: { tuiles: Tuile[] }) {
  return (
    <Section id="acces-rapide" surtitre="Accès rapide" titre="Toute l'offre en un coup d'œil">
      <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {tuiles.map((t) => (
          <li key={t.id}>
            <Link
              href={t.lien}
              data-tuile
              className={`relative flex aspect-square flex-col justify-between overflow-hidden rounded-lg p-8 no-underline ring-action hover:ring-2 ${FONDS[t.fond ?? "pale"] ?? "bg-pale"}`}
            >
              {t.image ? (
                // F16 : image en haut de la tuile, fondue vers le texte (masque en dégradé) ; la
                // tuile garde ses couleurs, ses points, son badge et son texte.
                <span className="pointer-events-none absolute inset-x-0 top-0 h-3/5 [mask-image:linear-gradient(to_bottom,black_45%,transparent)]">
                  <Image src={t.image.url} alt={t.image.texteRemplacement} fill sizes="(min-width: 1024px) 380px, (min-width: 768px) 50vw, 100vw" className="object-cover" unoptimized={sansOptimisation(t.image.url)} />
                </span>
              ) : null}
              <span className="relative flex items-start justify-between gap-3">
                <Dots />
                {t.badge ? <Badge>{t.badge}</Badge> : null}
              </span>
              <span className="relative flex flex-col gap-2">
                <span className="break-words text-h2 font-light text-ink">{t.titre}</span>
                <span className="break-words text-ink">{t.phrase}</span>
                <span className="font-semibold text-ink underline underline-offset-4">Découvrir</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
