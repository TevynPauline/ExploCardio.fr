import type { Metadata } from "next";
import { CLES_TEXTES_IM, LONGUEURS_IM as L, textesInformatique, type CleTexteIM } from "@/domaine/informatique/textes";
import { dbSite } from "@/lib/db/site";
import { Button, Card, Kicker, Retour } from "@/ui";
import { ChampAdmin, classeChamp } from "@/ui/admin";
import { ApercuCadres } from "@/ui/ApercuCadres";
import { enregistrerTextesInformatique } from "../actions";

export const metadata: Metadata = { title: "Page Informatique médicale" };

const SECTIONS: Record<CleTexteIM, string> = {
  "informatique.entete": "En-tête de la page",
  "informatique.benefice-1": "Bénéfice 1",
  "informatique.benefice-2": "Bénéfice 2",
  "informatique.benefice-3": "Bénéfice 3",
  "informatique.etape-1": "Comment ça se passe — étape 1",
  "informatique.etape-2": "Comment ça se passe — étape 2",
  "informatique.etape-3": "Comment ça se passe — étape 3",
  "informatique.hebergement": "Hébergement des données de santé",
  "informatique.prestataire": "Prestataire informatique (partenaire 2i)",
  "informatique.partenaire": "Notre partenaire",
};

// Textes de la page Informatique médicale (F27, FR-023), journalisés ; verrou optimiste.
export default async function TextesInformatique({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const r = await searchParams;
  const lignes = await dbSite().contenu.findMany({ where: { type: "argument", cle: { in: CLES_TEXTES_IM } } });
  const textes = textesInformatique(lignes);
  const recente = lignes.reduce<Date | null>((m, l) => (!m || l.modifieLe > m ? l.modifieLe : m), null);
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Contenus</Kicker>
      <h1 className="text-h2 font-light">Page Informatique médicale</h1>
      <p className="text-muted">
        Les mentions de conformité (HDS, ISO 27001, RGPD, CNCF) sont à faire valider par Régis avant la mise en ligne. Ne reprenez pas de promesses chiffrées
        du site du partenaire.
      </p>
      <Retour {...r} />
      <form action={enregistrerTextesInformatique} className="flex flex-col gap-6">
        <input type="hidden" name="modifieLe" value={recente?.toISOString() ?? ""} />
        {CLES_TEXTES_IM.map((cle) => (
          <Card key={cle} className="grid gap-3">
            <h2 className="font-semibold">{SECTIONS[cle]}</h2>
            <ChampAdmin id={`${cle}-titre`} libelle={`Titre (${L.titre} caractères au plus)`}>
              <input id={`${cle}-titre`} name={`${cle}-titre`} maxLength={L.titre} defaultValue={textes[cle].titre} required className={classeChamp} />
            </ChampAdmin>
            <ChampAdmin id={`${cle}-corps`} libelle={`Phrase (${L.corps} caractères au plus)`}>
              <textarea id={`${cle}-corps`} name={`${cle}-corps`} maxLength={L.corps} rows={2} defaultValue={textes[cle].corps} required className={`${classeChamp} py-2`} />
            </ChampAdmin>
          </Card>
        ))}
        <div>
          <Button type="submit">Enregistrer les textes</Button>
        </div>
      </form>
      <Card>
        <h2 className="mb-3 text-h3 font-semibold">Aperçu de la page</h2>
        <ApercuCadres chemin="/informatique-medicale" />
      </Card>
    </div>
  );
}
