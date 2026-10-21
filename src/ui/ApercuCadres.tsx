// Aperçu d'une page du site avec les contenus en préparation (F13, D7) : deux cadres, largeur
// ordinateur (1 280 px, réduite de moitié pour tenir) et mobile (390 px). L'aperçu passe par
// /api/apercu, réservé à l'équipe ; il ne vaut que dans ces cadres, ou dans l'onglet ouvert
// exprès ; « Quitter l'aperçu » le referme.

export function ApercuCadres({ chemin }: { chemin: string }) {
  const src = `/api/apercu?vers=${encodeURIComponent(chemin)}`;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-small text-muted">
        Aperçu avec les contenus en préparation, visible de l’équipe seulement.{" "}
        <a href={`${src}&onglet=1`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center">
          Ouvrir dans un onglet<span className="sr-only"> (nouvel onglet)</span>
        </a>
        {" · "}
        <a href={`/api/apercu?quitter=1&vers=${encodeURIComponent(chemin)}`} className="inline-flex min-h-11 items-center">Quitter l’aperçu</a>
      </p>
      <div className="flex flex-wrap items-start gap-4">
        <figure className="m-0 flex max-w-full flex-col gap-1">
          <figcaption className="text-small font-medium">Ordinateur</figcaption>
          <div className="h-[450px] w-[640px] max-w-full overflow-hidden rounded-sm border border-line">
            <iframe title={`Aperçu ordinateur de ${chemin}`} src={src} className="h-[900px] w-[1280px] origin-top-left scale-50 bg-surface" />
          </div>
        </figure>
        <figure className="m-0 flex max-w-full flex-col gap-1">
          <figcaption className="text-small font-medium">Mobile</figcaption>
          <iframe title={`Aperçu mobile de ${chemin}`} src={src} className="h-[600px] w-[390px] max-w-full rounded-sm border border-line bg-surface" />
        </figure>
      </div>
    </div>
  );
}
