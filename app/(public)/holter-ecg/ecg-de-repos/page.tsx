import type { Metadata } from "next";
import { jetonAffichage } from "@/domaine/anti-robots";
import { compteConnecte } from "@/domaine/comptes/session";
import { dbSite } from "@/lib/db/site";
import { PageCategorie } from "@/ui/catalogue/PageCategorie";
import { FormulaireDevis } from "@/ui/catalogue/FormulaireDevis";

export const metadata: Metadata = { title: "ECG de repos" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Coordonnées d'un client connecté, pour préremplir la demande (US7-2). */
async function coordonnees() {
  const compte = await compteConnecte();
  if (!compte) return { nom: "", email: "", telephone: "", cabinet: "" };
  const c = await dbSite().compteClient.findUnique({ where: { id: compte.id }, include: { utilisateur: true } });
  return { nom: c?.utilisateur.name ?? "", email: c?.utilisateur.email ?? "", telephone: c?.utilisateur.telephone ?? "", cabinet: c?.nomCabinet ?? "" };
}

// ECG de repos (F03, FR-008) : quelques modèles et « Vous cherchez un autre modèle ? ».
export default async function Page({ searchParams }: Props) {
  const [parametres, prerempli] = await Promise.all([searchParams, coordonnees()]);
  return (
    <PageCategorie
      cle="ecg-de-repos"
      parametres={parametres}
      apres={
        <section aria-labelledby="titre-devis" className="ec-card flex max-w-3xl flex-col gap-4">
          <h2 id="titre-devis" className="text-h2 font-light">Vous cherchez un autre modèle ?</h2>
          <p>Indiquez-nous le modèle ou votre besoin : nous vous envoyons un devis.</p>
          <FormulaireDevis jeton={jetonAffichage()} prerempli={prerempli} />
        </section>
      }
    />
  );
}
