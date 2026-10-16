import type { Metadata } from "next";
import { lireParametresPublics } from "@/domaine/contenus";
import { AppelContact } from "@/ui/AppelContact";
import { Badge } from "@/ui/Badge";
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
          <AppelContact motif="Information produit" libelle="Être informé de l'ouverture" />
        </>
      }
    />
  );
}
