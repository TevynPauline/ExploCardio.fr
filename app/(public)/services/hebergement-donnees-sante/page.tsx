import type { Metadata } from "next";
import { lireParametresPublics } from "@/domaine/contenus";
import { AppelContact } from "@/ui/AppelContact";
import { Badge } from "@/ui/Badge";
import { TarifService } from "@/ui/catalogue/TarifService";
import { PagePresentation } from "@/ui/PagePresentation";

export const metadata: Metadata = { title: "Hébergement des données de santé" };

export default async function Hebergement() {
  const p = await lireParametresPublics();
  return (
    <PagePresentation
      texte="hebergement-donnees-sante"
      surtitre="Services"
      avant={
        <>
          {p.badgeHebergement ? <p><Badge>{p.badgeHebergement}</Badge></p> : null}
          {/* Tant que l'offre est « en préparation », aucune souscription n'est proposée (FR-035). */}
          {p.badgeHebergement ? null : <TarifService cle="hebergement" />}
          <AppelContact motif="Information produit" libelle={p.badgeHebergement ? "Être informé de l'ouverture" : "Nous contacter"} />
        </>
      }
    />
  );
}
