import type { Raison } from "@/domaine/textes-raisons";
import { Section } from "../Section";
import { Apparition } from "./Apparition";
import { SCHEMAS, STYLE_POURQUOI } from "./schemas";

/**
 * « Pourquoi choisir ExploCardio.fr ? » (F23, FR-008 à FR-011) : six cartes reprenant le verso du
 * flyer, chacune avec un schéma, un titre et une phrase (modifiables au back-office).
 */
export function Pourquoi({ raisons }: { raisons: Raison[] }) {
  return (
    <Section id="pourquoi-choisir" titre="Pourquoi choisir ExploCardio.fr ?">
      <style href="ec-pourquoi" precedence="default">
        {STYLE_POURQUOI}
      </style>
      <Apparition className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {raisons.map((r, i) => (
          <li key={i} data-raison={i + 1} className="pq-carte ec-card flex flex-col gap-4">
            {SCHEMAS[i]}
            <div className="flex flex-col gap-1">
              <h3 className="text-h3 font-semibold text-ink">{r.titre}</h3>
              <p className="text-ink">{r.phrase}</p>
            </div>
          </li>
        ))}
      </Apparition>
    </Section>
  );
}
