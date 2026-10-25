import type { Arguments } from "@/domaine/vignettes";
import { Section } from "./Section";

// « Pourquoi préférer ExploCardio.fr » (F16, US4, FR-010) : quatre arguments courts, chacun avec
// un schéma décoratif dans le langage de la charte (trois points, pastels, flèches fines).

const SCHEMAS = [
  // Un seul métier : les trois points qui grandissent.
  <svg key="1" viewBox="0 0 96 48" className="h-12 w-24">
    <circle cx="14" cy="34" r="8" fill="var(--ec-euca)" />
    <circle cx="42" cy="28" r="12" fill="var(--ec-sage)" />
    <circle cx="76" cy="22" r="16" fill="var(--ec-blue)" />
  </svg>,
  // Prix clairs : une étiquette et son repère.
  <svg key="2" viewBox="0 0 96 48" className="h-12 w-24" fill="none">
    <path d="M30 8h34l16 16-16 16H30a6 6 0 0 1-6-6V14a6 6 0 0 1 6-6z" fill="var(--ec-pale)" stroke="var(--ec-sage)" strokeWidth="2" />
    <circle cx="66" cy="24" r="5" fill="var(--ec-euca)" />
    <path d="M34 20h20M34 28h14" stroke="var(--ec-deep)" strokeWidth="2" strokeLinecap="round" />
  </svg>,
  // Assistance offerte : consommables → points → assistance.
  <svg key="3" viewBox="0 0 96 48" className="h-12 w-24" fill="none">
    <circle cx="12" cy="24" r="8" fill="var(--ec-euca)" />
    <circle cx="48" cy="24" r="10" fill="var(--ec-sage)" />
    <circle cx="84" cy="24" r="12" fill="var(--ec-blue)" />
    <path d="M22 24h14M32 20l4 4-4 4M60 24h10M66 20l4 4-4 4" stroke="var(--ec-sage)" strokeWidth="1.5" />
  </svg>,
  // Au mois : un cycle qui recommence.
  <svg key="4" viewBox="0 0 96 48" className="h-12 w-24" fill="none">
    <path d="M62 12a16 16 0 1 0 4 18" stroke="var(--ec-sage)" strokeWidth="2" strokeLinecap="round" />
    <path d="M58 6l5 6-7 3" stroke="var(--ec-sage)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="48" cy="24" r="6" fill="var(--ec-euca)" />
  </svg>,
];

export function Pourquoi({ argumentsAccueil }: { argumentsAccueil: Arguments }) {
  if (!argumentsAccueil.liste.length) return null;
  return (
    <Section id="pourquoi" surtitre="ExploCardio.fr" titre={argumentsAccueil.titre}>
      {argumentsAccueil.intro ? <p className="max-w-prose text-lead text-ink">{argumentsAccueil.intro}</p> : null}
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {argumentsAccueil.liste.map((a, i) => (
          <li key={a.titre} className="ec-card flex flex-col gap-3">
            <span aria-hidden="true">{SCHEMAS[i % SCHEMAS.length]}</span>
            <h3 className="text-h3 font-semibold text-ink">{a.titre}</h3>
            <p className="text-ink">{a.phrase}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
