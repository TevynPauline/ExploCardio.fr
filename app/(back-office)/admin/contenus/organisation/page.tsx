import type { Metadata } from "next";
import { BLOCS_ACCUEIL, CLE_ORGANISATION, normaliserOrganisation } from "@/domaine/organisation-accueil";
import { lireVignettes } from "@/domaine/vignettes";
import { dbSite } from "@/lib/db/site";
import { Card, Kicker, Retour } from "@/ui";
import { ApercuCadres } from "@/ui/ApercuCadres";
import { enregistrerOrganisation } from "../actions";
import { ListeBlocs } from "./ListeBlocs";

export const metadata: Metadata = { title: "Organisation de l'accueil" };

// Organisation de l'accueil (F23, US3, FR-014 à FR-017) : ordre et affichage des blocs
// déplaçables ; bandeaux, menus et bloc contact restent fixes.
export default async function OrganisationAccueil({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const r = await searchParams;
  const [parametre, vignettes] = await Promise.all([dbSite().parametre.findUnique({ where: { cle: CLE_ORGANISATION } }), lireVignettes()]);
  const places = normaliserOrganisation(parametre?.valeur).map((p) => ({
    ...p,
    nom: BLOCS_ACCUEIL[p.bloc].nom,
    remarque: p.bloc === "offres" && vignettes.length === 0 ? "Aucune offre en ce moment : le carrousel ne s’affiche pas." : null,
  }));
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Kicker>Contenus</Kicker>
      <h1 className="text-h2 font-light">Organisation de l’accueil</h1>
      <p className="text-muted">
        Choisissez l’ordre des blocs de l’accueil et ceux qui sont affichés. En haut, le bandeau de démonstration, le bandeau promotionnel et les menus
        restent fixes ; en bas, le bloc contact reste toujours le dernier. Le changement est visible sur le site en moins d’une minute.
      </p>
      <Retour {...r} />
      <Card>
        <ListeBlocs action={enregistrerOrganisation} places={places} modifieLe={parametre?.modifieLe.toISOString() ?? ""} />
      </Card>
      <Card>
        <h2 className="mb-3 text-h3 font-semibold">Aperçu de l’accueil</h2>
        <ApercuCadres chemin="/" />
      </Card>
    </div>
  );
}
