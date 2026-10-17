import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { compteConnecte } from "@/domaine/comptes/session";
import { FORMULE_PAR_SLUG, lireFiche } from "@/domaine/catalogue/fiches";
import type { CleFamille } from "@/domaine/familles";
import { modeDuSite } from "@/lib/config";
import { Kicker } from "../Kicker";
import { CarteProduit } from "./CarteProduit";
import { FicheConsommable } from "./FicheConsommable";
import { Galerie } from "./Galerie";
import { OngletsFiche } from "./OngletsFiche";
import { SelecteurFormule } from "./SelecteurFormule";

type Props = { cle: CleFamille; slug: string; parametres: Record<string, string | string[] | undefined> };

function un(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

/** Titre et description de la fiche, sans données propres au client. */
export async function metadonneesFiche(cle: CleFamille, slug: string): Promise<Metadata> {
  const r = await lireFiche(cle, slug, null);
  if (!r) return { title: "Produit introuvable" };
  if (r.type === "retire") return { title: `${r.nom} n’est plus proposé`, robots: { index: false } };
  if (r.type === "redirection") return {};
  const f = r.fiche;
  const marque = f.marque && !f.nom.toLowerCase().includes(f.marque.toLowerCase()) ? `${f.marque} ` : "";
  return { title: `${marque}${f.nom}`, description: f.textes.descriptionCourte };
}

/** Fiche équipement ou consommable (F03, US2 à US5), commune à toutes les catégories. */
export async function Fiche({ cle, slug, parametres }: Props) {
  const compte = await compteConnecte();
  const r = await lireFiche(cle, slug, compte?.id ?? null);
  if (!r) notFound();
  if (r.type === "redirection") permanentRedirect(r.chemin);

  if (r.type === "retire") {
    return (
      <div className="mx-auto flex max-w-page flex-col gap-4 px-4 py-10">
        <Kicker>{r.categorie.libelle}</Kicker>
        <h1 className="text-display font-light">{r.nom} n’est plus proposé</h1>
        <p>Ce produit ne fait plus partie de notre catalogue.</p>
        <p>
          <Link href={r.categorie.chemin} className="ec-btn ec-btn--primary">Voir les produits {r.categorie.libelle}</Link>
        </p>
      </div>
    );
  }

  const fil = (
    <nav aria-label="Fil d’Ariane" className="text-small">
      <Link href={r.fiche.categorie.chemin} className="inline-flex min-h-11 items-center">{r.fiche.categorie.libelle}</Link>
    </nav>
  );

  if (r.type === "indisponible") {
    const f = r.fiche;
    return (
      <div className="mx-auto flex max-w-page flex-col gap-6 px-4 py-10">
        {fil}
        <div className="grid gap-8 lg:grid-cols-2">
          <Galerie photos={f.photos} nom={f.nom} />
          <div className="flex flex-col gap-4">
            {f.marque ? <Kicker>{f.marque}</Kicker> : null}
            <h1 className="text-display font-light">{f.nom}</h1>
            {f.textes.descriptionCourte ? <p className="text-lead">{f.textes.descriptionCourte}</p> : null}
            <p role="status" className="ec-box--info p-4">
              Prix et disponibilité momentanément indisponibles. Réessayez dans quelques instants ou{" "}
              <Link href="/qui-sommes-nous?motif=Information%20produit#contact">contactez-nous</Link>.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const f = r.fiche;
  const formuleInitiale = FORMULE_PAR_SLUG[un(parametres.formule) ?? ""] ?? null;
  return (
    <div className="mx-auto flex max-w-page flex-col gap-10 px-4 py-10">
      {fil}
      <div className="grid gap-8 lg:grid-cols-2">
        <Galerie photos={f.photos} nom={f.nom} />
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Kicker>{f.marque}</Kicker>
            <h1 className="text-display font-light break-words">{f.nom}</h1>
            {f.textes.descriptionCourte ? <p className="text-lead">{f.textes.descriptionCourte}</p> : null}
            {modeDuSite() === "demo" ? <p className="text-small text-muted">Version de démonstration : les prix affichés sont inventés.</p> : null}
          </div>
          {f.type === "equipement" ? (
            <SelecteurFormule
              nom={f.nom}
              formules={f.formules}
              variantes={f.variantes}
              contenuPackMad={f.textes.contenuPackMad ?? null}
              mentionFinancement={f.mentionFinancement}
              formuleInitiale={formuleInitiale}
              configInitiale={un(parametres.config) ?? null}
            />
          ) : (
            <FicheConsommable variantes={f.variantes} configInitiale={un(parametres.config) ?? null} />
          )}
        </div>
      </div>
      <OngletsFiche fiche={f} />
      {f.associes.length ? (
        <section aria-labelledby="titre-associes" className="flex flex-col gap-4">
          <h2 id="titre-associes" className="text-h2 font-light">{f.type === "equipement" ? "Produits associés" : "Vous aimerez aussi"}</h2>
          <ul className="grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {f.associes.map((c) => (
              <li key={c.defaultCode} className="flex">
                <CarteProduit carte={c} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
