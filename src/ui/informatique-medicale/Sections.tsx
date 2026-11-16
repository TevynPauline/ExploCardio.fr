import { MENTIONS_ENTETE, MENTIONS_HEBERGEMENT, POINTS_PRESTATAIRE, type TextesIM } from "@/domaine/informatique/textes";

// Sections fixes de la page Informatique médicale (F27, FR-016 à FR-022). Schémas dessinés avec
// les formes et pastels de la charte, décoratifs (aria-hidden) ; aucun motif « trois points »
// devant les titres (FR-003) ; animation légère neutralisée en mouvement réduit.

const surtitre = "text-kicker font-medium uppercase tracking-[.12em] text-action";

function Puce({ couleur }: { couleur: "sage" | "blue" | "mint" | "euca" }) {
  const fond = { sage: "bg-sage", blue: "bg-blue", mint: "bg-mint", euca: "bg-euca" }[couleur];
  return <span aria-hidden="true" className={`inline-block size-2.5 shrink-0 rounded-full ${fond}`} />;
}

/** Schéma de l'en-tête : le cabinet au centre, synchronisé avec quatre lieux. */
function SchemaCabinet() {
  const lieux: { nom: string; couleur: "sage" | "blue" | "mint" | "euca"; place: string }[] = [
    { nom: "Cabinet", couleur: "sage", place: "left-[6%] top-[10%]" },
    { nom: "Domicile", couleur: "blue", place: "right-[6%] top-[16%]" },
    { nom: "Secrétariat", couleur: "euca", place: "left-[8%] bottom-[12%]" },
    { nom: "Congés", couleur: "mint", place: "right-[8%] bottom-[9%]" },
  ];
  return (
    <div aria-hidden="true" className="relative h-72 overflow-hidden rounded-lg bg-pale sm:h-80">
      <div className="absolute left-1/2 top-1/2 size-64 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-sage motion-safe:animate-[spin_60s_linear_infinite]" />
      <div className="absolute left-1/2 top-1/2 flex size-36 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-mint text-center">
        <span className="font-semibold text-ink">Votre cabinet</span>
        <span className="text-small text-ink">synchronisé</span>
      </div>
      {lieux.map((l) => (
        <span key={l.nom} className={`absolute ${l.place} inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-small font-semibold text-ink`}>
          <Puce couleur={l.couleur} />
          {l.nom}
        </span>
      ))}
    </div>
  );
}

export function EnTeteIM({ textes }: { textes: TextesIM }) {
  const t = textes["informatique.entete"];
  return (
    <section aria-labelledby="titre-im" className="grid items-center gap-10 lg:grid-cols-[1.1fr_.9fr]">
      <div className="flex flex-col gap-5">
        <p className={surtitre}>Informatique médicale</p>
        <h1 id="titre-im" className="text-display font-light">
          {t.titre}
        </h1>
        <p className="max-w-prose text-h3 font-light text-muted">{t.corps}</p>
        <ul className="flex flex-wrap gap-2" aria-label="Garanties">
          {MENTIONS_ENTETE.map((m) => (
            <li key={m} className="rounded-pill border border-line bg-surface px-3 py-1 text-small font-medium text-ink">
              {m}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          <a href="#questionnaire" className="ec-btn ec-btn--primary">
            Décrire mon besoin
          </a>
          <a href="#pca" className="ec-btn ec-btn--secondary">
            Découvrir PCA
          </a>
        </div>
      </div>
      <SchemaCabinet />
    </section>
  );
}

function MiniSchema({ n }: { n: 1 | 2 | 3 }) {
  return (
    <div aria-hidden="true" className="flex h-24 items-center justify-center gap-3 rounded-lg bg-bg">
      {n === 1 ? (
        ["Holter", "MAPA", "Effort"].map((x) => (
          <span key={x} className="rounded-pill border border-line bg-surface px-3 py-1 text-small font-semibold text-ink">
            {x}
          </span>
        ))
      ) : n === 2 ? (
        <>
          <span className="size-9 rounded-full bg-sage" />
          <span className="h-0.5 w-6 bg-line" />
          <span className="size-9 rounded-full bg-euca" />
          <span className="h-0.5 w-6 bg-line" />
          <span className="size-9 rounded-full bg-blue" />
        </>
      ) : (
        <span className="size-14 rounded-full border-4 border-sage bg-mint" />
      )}
    </div>
  );
}

export function BeneficesIM({ textes }: { textes: TextesIM }) {
  const cles = ["informatique.benefice-1", "informatique.benefice-2", "informatique.benefice-3"] as const;
  return (
    <section id="pca" aria-labelledby="titre-pca" className="flex scroll-mt-32 flex-col gap-6">
      <h2 id="titre-pca" className="text-h2 font-light">
        Ce que PCA change au cabinet
      </h2>
      <ul className="grid gap-5 md:grid-cols-3">
        {cles.map((cle, i) => (
          <li key={cle} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
            <MiniSchema n={(i + 1) as 1 | 2 | 3} />
            <h3 className="text-h3 font-semibold">{textes[cle].titre}</h3>
            <p className="text-muted">{textes[cle].corps}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function EtapesIM({ textes }: { textes: TextesIM }) {
  const cles = ["informatique.etape-1", "informatique.etape-2", "informatique.etape-3"] as const;
  return (
    <section aria-labelledby="titre-etapes" className="flex flex-col gap-6">
      <h2 id="titre-etapes" className="text-h2 font-light">
        Comment ça se passe
      </h2>
      <ol className="grid gap-5 md:grid-cols-3">
        {cles.map((cle, i) => (
          <li key={cle} className="flex flex-col gap-2 border-t-2 border-sage pt-4">
            <span className="text-small font-semibold text-action">Étape {i + 1}</span>
            <h3 className="text-h3 font-semibold">{textes[cle].titre}</h3>
            <p className="text-muted">{textes[cle].corps}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Pastilles({ liste, etiquette }: { liste: readonly string[]; etiquette: string }) {
  return (
    <ul className="grid grid-cols-2 gap-3" aria-label={etiquette}>
      {liste.map((x, i) => (
        <li key={x} className="flex items-center gap-3 rounded-lg bg-surface px-4 py-3 text-small font-semibold text-ink">
          <Puce couleur={(["sage", "blue", "mint", "euca"] as const)[i % 4]!} />
          {x}
        </li>
      ))}
    </ul>
  );
}

export function HebergementIM({ textes }: { textes: TextesIM }) {
  const t = textes["informatique.hebergement"];
  return (
    <section id="hebergement" aria-labelledby="titre-hebergement" className="grid scroll-mt-32 items-center gap-8 rounded-lg bg-pale p-8 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <p className={surtitre}>Hébergement des données de santé</p>
        <h2 id="titre-hebergement" className="text-h2 font-light">
          {t.titre}
        </h2>
        <p className="text-ink">{t.corps}</p>
      </div>
      <Pastilles liste={MENTIONS_HEBERGEMENT} etiquette="Certifications" />
    </section>
  );
}

export function PrestataireIM({ textes }: { textes: TextesIM }) {
  const t = textes["informatique.prestataire"];
  return (
    <section id="prestataire" aria-labelledby="titre-prestataire" className="grid scroll-mt-32 items-center gap-8 rounded-lg border border-line bg-surface p-8 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <p className={surtitre}>Au-delà de PCA</p>
        <h2 id="titre-prestataire" className="text-h2 font-light">
          {t.titre}
        </h2>
        <p className="text-muted">{t.corps}</p>
        <a href="#questionnaire" className="inline-flex min-h-11 items-center self-start font-semibold text-action underline underline-offset-2">
          Parlez-nous de votre cabinet
        </a>
      </div>
      <div className="rounded-lg bg-bg p-4">
        <Pastilles liste={POINTS_PRESTATAIRE} etiquette="Ce que notre partenaire prend en charge" />
      </div>
    </section>
  );
}

export function PartenaireIM({ textes, lienPca }: { textes: TextesIM; lienPca: string }) {
  const t = textes["informatique.partenaire"];
  return (
    <section aria-labelledby="titre-partenaire" className="flex flex-col items-start justify-between gap-5 border-t border-line pt-8 sm:flex-row sm:items-center">
      <div>
        <p className={surtitre}>Notre partenaire</p>
        <h2 id="titre-partenaire" className="mt-1 font-semibold text-ink">
          {t.titre}
        </h2>
        <p className="text-muted">{t.corps}</p>
      </div>
      <a href={lienPca} target="_blank" rel="noopener" className="ec-btn ec-btn--secondary">
        Voir le site de PCA<span className="sr-only"> (nouvel onglet)</span>
        <span aria-hidden="true"> ↗</span>
      </a>
    </section>
  );
}
