import type { ParametresPublics } from "@/domaine/contenus";

/**
 * Bloc contact (FR-025) : fond sombre ; email, téléphone et adresse affichés seulement s'ils
 * sont renseignés (aucune ligne vide ni libellé orphelin). F16 (FR-031) : sans le nom du
 * fondateur, présenté sur la page Qui sommes-nous.
 */
export function BlocContact({ parametres }: { parametres: ParametresPublics }) {
  const lignes = [
    parametres.email ? { libelle: "Email", valeur: <a href={`mailto:${parametres.email}`} className="text-white underline">{parametres.email}</a> } : null,
    parametres.telephone ? { libelle: "Téléphone", valeur: parametres.telephone } : null,
    parametres.adresse ? { libelle: "Adresse", valeur: parametres.adresse } : null,
  ].filter((l): l is NonNullable<typeof l> => l !== null);
  return (
    <section data-section="contact" aria-labelledby="titre-contact" className="ec-dark py-14">
      <div className="mx-auto flex max-w-page flex-col gap-4 px-4">
        <p className="ec-kicker ec-accent">Contact</p>
        <h2 id="titre-contact" className="text-h2 font-light text-white">
          Une question ? Écrivez-nous
        </h2>
        {lignes.length ? (
          <dl className="grid gap-2 text-white sm:grid-cols-[auto_1fr] sm:gap-x-6">
            {lignes.map((l) => (
              <div key={l.libelle} className="contents">
                <dt className="ec-accent font-medium">{l.libelle}</dt>
                <dd>{l.valeur}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </section>
  );
}
