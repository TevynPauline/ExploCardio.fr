import { ButtonLink } from "../Button";
import { Logo } from "../Logo";

/** Héros (FR-016) : fond eucalyptus pâle, logo empilé, titre, grands points décoratifs. */
export function Heros() {
  return (
    <section data-section="heros" aria-labelledby="titre-heros" className="ec-hero relative overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute -right-10 top-10 hidden items-end gap-6 md:flex">
        <span className="block size-24 rounded-full bg-euca" />
        <span className="block size-32 rounded-full bg-sage" />
        <span className="block size-40 rounded-full bg-blue" />
      </div>
      <div className="relative mx-auto flex max-w-page flex-col items-start gap-6 px-4 py-16 md:py-24">
        <Logo version="empile" hauteur={96} priority />
        <h1 id="titre-heros" className="max-w-2xl text-display font-light text-ink">
          Le spécialiste des explorations fonctionnelles cardiaques
          <span className="mt-2 block text-h3 font-normal text-ink">(hors imagerie)</span>
        </h1>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/catalogue">Découvrir le catalogue</ButtonLink>
          <ButtonLink href="/mise-a-disposition" variante="secondaire">Demander une mise à disposition</ButtonLink>
        </div>
      </div>
    </section>
  );
}
