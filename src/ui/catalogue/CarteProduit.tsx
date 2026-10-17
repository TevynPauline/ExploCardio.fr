import Link from "next/link";
import type { Carte } from "@/domaine/catalogue/categories";
import { Disponibilite } from "./Disponibilite";
import { PhotoProduit } from "./PhotoProduit";
import { Prix } from "./Prix";

/**
 * Carte d'un article (FR-006, FR-041) : photo sur ivoire, marque en surtitre, nom en titre,
 * prix HT « à partir de » en Semibold avec le TTC, location, disponibilité si elle n'est pas
 * immédiate. Toute la carte mène à la fiche.
 */
export function CarteProduit({ carte, indisponible = false }: { carte: Carte; indisponible?: boolean }) {
  return (
    <article className="ec-card relative flex w-full flex-col gap-3 hover:border-action">
      <PhotoProduit photo={carte.photo} nom={carte.nom} />
      <div className="flex flex-col gap-1">
        <p className="text-small text-muted">{carte.marque}</p>
        <h3 className="text-h3 font-semibold">
          <Link href={carte.chemin} className="text-ink no-underline after:absolute after:inset-0 after:content-['']">
            {carte.nom}
          </Link>
        </h3>
        {indisponible ? null : (
          <Prix ht={carte.prixHt} tauxTva={carte.tauxTva} aPartirDe={carte.aPartirDe} periode={carte.mensuel ? "/ mois" : undefined} />
        )}
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1">
        {carte.location ? <span className="ec-badge">Disponible en location</span> : null}
        {!indisponible && carte.disponibilite.etat !== "disponible" ? <Disponibilite etat={carte.disponibilite} /> : null}
      </div>
    </article>
  );
}
