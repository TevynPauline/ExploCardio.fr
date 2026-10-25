import type { Metadata } from "next";
import Link from "next/link";
import { jetonAffichage } from "@/domaine/anti-robots";
import { compteConnecte } from "@/domaine/comptes/session";
import { lireParametresPublics } from "@/domaine/contenus";
import { dbSite } from "@/lib/db/site";
import { AppelContact } from "@/ui/AppelContact";
import { Badge } from "@/ui/Badge";
import { FormulaireDevis } from "@/ui/catalogue/FormulaireDevis";
import { TarifService } from "@/ui/catalogue/TarifService";
import { PagePresentation } from "@/ui/PagePresentation";

export const metadata: Metadata = { title: "Hébergement des données de santé" };

/** Coordonnées d'un client connecté, pour préremplir le formulaire d'intérêt. */
async function coordonnees() {
  const compte = await compteConnecte();
  if (!compte) return { nom: "", email: "", telephone: "", cabinet: "" };
  const c = await dbSite().compteClient.findUnique({ where: { id: compte.id }, include: { utilisateur: true } });
  return { nom: c?.utilisateur.name ?? "", email: c?.utilisateur.email ?? "", telephone: c?.utilisateur.telephone ?? "", cabinet: c?.nomCabinet ?? "" };
}

// Hébergement des données de santé (F12, US6, FR-023 à FR-025) : tant que le badge « En
// préparation » est présent, aucune souscription et un formulaire d'intérêt (enregistré comme
// une demande de devis) ; badge retiré, l'offre est présentée avec son tarif et renvoie vers les
// logiciels Cloud souscriptibles.
export default async function Hebergement() {
  const [p, prerempli] = await Promise.all([lireParametresPublics(), coordonnees()]);
  const enPreparation = Boolean(p.badgeHebergement);
  return (
    <PagePresentation
      parents={[{ libelle: "Services", href: "/services" }]}
      texte="hebergement-donnees-sante"
      surtitre="Services"
      avant={
        <>
          {enPreparation ? <p><Badge>{p.badgeHebergement}</Badge></p> : null}
          {enPreparation ? <AppelContact motif="Information produit" libelle="Nous contacter" /> : null}
          {enPreparation ? null : (
            <>
              <TarifService cle="hebergement" />
              <p>
                Vos logiciels d’analyse sont hébergés sur cette plateforme : <Link href="/holter-ecg">découvrir les logiciels Cloud</Link> ou les retrouver dans{" "}
                <Link href="/mon-compte/logiciels">Mes logiciels Cloud</Link>.
              </p>
              <AppelContact motif="Information produit" libelle="Nous contacter" />
            </>
          )}
        </>
      }
      apres={
        enPreparation ? (
          <section aria-labelledby="titre-interet" className="ec-card flex max-w-3xl flex-col gap-4">
            <h2 id="titre-interet" className="text-h2 font-light">Être informé de l’ouverture</h2>
            <p>L’offre est en préparation avec notre partenaire hébergeur certifié HDS. Laissez-nous vos coordonnées et votre besoin : nous vous prévenons dès son ouverture.</p>
            <FormulaireDevis jeton={jetonAffichage()} prerempli={prerempli} sujet="hebergement" />
          </section>
        ) : null
      }
    />
  );
}
