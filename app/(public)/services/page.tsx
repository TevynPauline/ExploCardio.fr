import type { Metadata } from "next";
import { lireParametresPublics } from "@/domaine/contenus";
import { GrilleLiens } from "@/ui/GrilleLiens";
import { PagePresentation } from "@/ui/PagePresentation";

export const metadata: Metadata = { title: "Services" };

export default async function Services() {
  const p = await lireParametresPublics();
  return (
    <PagePresentation
      texte="services"
      surtitre="Services"
      avant={
        <GrilleLiens
          cartes={[
            { titre: "Hébergement des données de santé", texte: "Vos logiciels sur une plateforme Cloud HDS.", href: "/services/hebergement-donnees-sante", badge: p.badgeHebergement },
            { titre: "Assistance et service", texte: "Vos consommables ouvrent votre assistance.", href: "/services/assistance" },
            { titre: "Financement", texte: "Étalez l'investissement de votre cabinet.", href: "/financement" },
            { titre: "Installation et formation", texte: "Installé, paramétré, et vos équipes formées.", href: "/services/installation-formation" },
            { titre: "Mise à disposition", texte: "Louez au mois, sans engagement.", href: "/mise-a-disposition" },
          ]}
        />
      }
    />
  );
}
