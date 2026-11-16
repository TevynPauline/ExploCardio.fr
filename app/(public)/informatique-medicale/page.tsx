import type { Metadata } from "next";
import { jetonAffichage } from "@/domaine/anti-robots";
import { lireTextesInformatique } from "@/domaine/contenus";
import { coordonneesDuCompte } from "@/domaine/informatique/demandes";
import { lienPca } from "@/domaine/informatique/partenaire";
import { sessionCourante } from "@/lib/roles";
import { FilAriane } from "@/ui/FilAriane";
import { Questionnaire } from "@/ui/informatique-medicale/Questionnaire";
import { BeneficesIM, EnTeteIM, EtapesIM, HebergementIM, PartenaireIM, PrestataireIM } from "@/ui/informatique-medicale/Sections";

export const metadata: Metadata = {
  title: "Informatique médicale : votre cabinet accessible partout",
  description:
    "Consultez vos Holter, MAPA et épreuves d'effort à distance avec PCA, hébergement certifié HDS. Matériel et support informatique pour les cabinets de cardiologie.",
};

// Lecture de la session : la page est rendue à la demande (préremplissage du questionnaire).
export const dynamic = "force-dynamic";

/** Page « Informatique médicale » (F27, US2, FR-016) ; fond l'ancienne page Hébergement. */
export default async function InformatiqueMedicale() {
  const [textes, lien, session] = await Promise.all([lireTextesInformatique(), lienPca(), sessionCourante().catch(() => null)]);
  const compte = session ? await coordonneesDuCompte(session.user.id) : null;
  const prerempli = compte ? { nom: compte.nom, email: compte.email, cabinet: compte.cabinet, codePostal: compte.codePostal } : null;
  return (
    <div className="mx-auto flex max-w-page flex-col gap-16 px-4 py-10">
      <FilAriane etapes={[{ libelle: "Informatique médicale" }]} />
      <EnTeteIM textes={textes} />
      <BeneficesIM textes={textes} />
      <EtapesIM textes={textes} />
      <HebergementIM textes={textes} />
      <PrestataireIM textes={textes} />
      <section id="questionnaire" aria-labelledby="titre-questionnaire" className="mx-auto w-full max-w-3xl scroll-mt-32 rounded-lg border border-line bg-surface p-6 sm:p-9">
        <p className="text-kicker font-medium uppercase tracking-[.12em] text-action">Votre besoin</p>
        <h2 id="titre-questionnaire" className="mb-6 text-h2 font-light">
          Décrivez votre besoin en 2 minutes
        </h2>
        <Questionnaire jeton={jetonAffichage()} prerempli={prerempli} />
      </section>
      <PartenaireIM textes={textes} lienPca={lien} />
    </div>
  );
}
