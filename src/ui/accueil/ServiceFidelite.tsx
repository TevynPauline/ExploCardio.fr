import { Section } from "./Section";

const ETAPES = [
  { titre: "Vos consommables", texte: "Vous commandez vos électrodes, brassards et accessoires." },
  { titre: "Vos points", texte: "Chaque commande crédite votre cagnotte de bons d'achat." },
  { titre: "Hotline et SAV offerts", texte: "Votre assistance est offerte pendant la durée de vos droits." },
];

const TAILLES = ["size-14", "size-16", "size-20"];

/** Service et fidélité (FR-023) : trois cercles numérotés de taille croissante, flèches fines. */
export function ServiceFidelite({ engagements }: { engagements: string | null }) {
  return (
    <Section id="service-fidelite" surtitre="Service et fidélité" titre="Pas de forfait annuel : votre fidélité ouvre votre assistance">
      <ol className="grid gap-8 md:grid-cols-3">
        {ETAPES.map((e, i) => (
          <li key={e.titre} className="relative flex flex-col items-start gap-3">
            <span
              aria-hidden="true"
              className={`flex ${TAILLES[i]} items-center justify-center rounded-full border border-sage bg-surface text-h3 font-light text-ink`}
            >
              {i + 1}
            </span>
            {i < ETAPES.length - 1 ? (
              <svg aria-hidden="true" viewBox="0 0 80 12" className="absolute left-24 top-6 hidden w-[calc(100%-7rem)] md:block" preserveAspectRatio="none" fill="none" stroke="var(--ec-sage)" strokeWidth="1">
                <path d="M0 6h78M72 1l6 5-6 5" />
              </svg>
            ) : null}
            <span className="text-h3 font-semibold text-ink">
              <span className="sr-only">Étape {i + 1} : </span>
              {e.titre}
            </span>
            <span className="text-muted">{e.texte}</span>
          </li>
        ))}
      </ol>
      {engagements ? <p className="ec-box--info p-4 text-ink">{engagements}</p> : null}
    </Section>
  );
}
