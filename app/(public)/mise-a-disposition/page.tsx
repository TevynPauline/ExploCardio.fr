import type { Metadata } from "next";
import Link from "next/link";
import { libelleJour } from "@/domaine/location/calendrier";
import { offresDepannage } from "@/domaine/location/offre";
import { euros } from "@/lib/montants";
import { AppelContact } from "@/ui/AppelContact";
import { PagePresentation } from "@/ui/PagePresentation";

export const metadata: Metadata = { title: "Mise à disposition — Dépannage express" };
// Date de livraison et parc lus à chaque affichage (SC-006).
export const dynamic = "force-dynamic";

// « Dépannage express » (F05, US1, FR-005) : équipements proposés en mise à disposition, prix
// du premier mois et des mois suivants (HT puis TTC), date de livraison la plus proche.
export default async function MiseADisposition() {
  const { offres, indisponible, heureLimite } = await offresDepannage();
  return (
    <PagePresentation
      texte="mise-a-disposition"
      surtitre="Services"
      apres={
        <>
          <section id="depannage-express" aria-labelledby="titre-depannage" className="flex scroll-mt-24 flex-col gap-4">
            <h2 id="titre-depannage" className="text-h2 font-light">Équipements disponibles en dépannage</h2>
            <p className="max-w-2xl">
              Un appareil en panne ? Recevez un équipement prêt à l’emploi, sans engagement : commandé un jour ouvré avant {heureLimite}, il est livré le
              lendemain si un appareil est disponible.
            </p>
            {indisponible ? (
              <p role="status" className="ec-box--info p-4">
                Les disponibilités sont momentanément indisponibles. Réessayez dans quelques instants ou contactez-nous.
              </p>
            ) : null}
            {!indisponible && !offres.length ? <p className="text-muted">Aucun équipement n’est proposé en mise à disposition pour le moment.</p> : null}
            <ul className="grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2 xl:grid-cols-3">
              {offres.map((o) => (
                <li key={o.defaultCode} className="ec-card flex flex-col gap-3" aria-label={`${o.marque} ${o.nom}${o.configuration ? ` (${o.configuration})` : ""}`}>
                  <div>
                    <p className="text-small text-muted">{o.marque}</p>
                    <h3 className="text-h3 font-semibold">
                      {o.nom}
                      {o.configuration ? <span className="block text-body font-normal text-muted">{o.configuration}</span> : null}
                    </h3>
                  </div>
                  <p className={o.lendemain ? "font-semibold text-ink" : ""}>
                    {o.lendemain ? `Livraison demain, ${libelleJour(o.premiereDate)}` : `Première livraison possible : ${libelleJour(o.premiereDate)}`}
                  </p>
                  <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
                    <dt>Premier mois</dt>
                    <dd className="text-right">
                      <span className="font-semibold text-ink">{euros(o.premierMoisHt)} HT</span>
                      <span className="block text-small text-muted">{euros(o.premierMoisTtc)} TTC</span>
                    </dd>
                    <dt>Mois suivants</dt>
                    <dd className="text-right">
                      <span className="font-semibold text-ink">{euros(o.moisSuivantsHt)} HT</span>
                      <span className="block text-small text-muted">{euros(o.moisSuivantsTtc)} TTC</span>
                    </dd>
                  </dl>
                  {o.contenuPack.length ? (
                    <ul className="list-disc pl-5 text-small">
                      {o.contenuPack.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  ) : null}
                  <p className="text-small text-muted">Sans engagement : résiliable à tout moment depuis votre compte.</p>
                  <Link href={o.chemin} className="ec-btn ec-btn--primary mt-auto self-start" aria-label={`Choisir ${o.nom}${o.configuration ? ` (${o.configuration})` : ""}`}>
                    Choisir
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <AppelContact motif="Mise à disposition" libelle="Une question ? Nous contacter" />
        </>
      }
    />
  );
}
