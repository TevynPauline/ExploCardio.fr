import type { Metadata } from "next";
import { lireParametresPublics } from "@/domaine/contenus";
import { GrilleLiens } from "@/ui/GrilleLiens";
import { PagePresentation } from "@/ui/PagePresentation";

export const metadata: Metadata = { title: "Catalogue" };

// Vue d'ensemble des familles de produits et des services (« Découvrir le catalogue »).
export default async function Catalogue() {
  const p = await lireParametresPublics();
  return (
    <PagePresentation
      texte="catalogue"
      surtitre="Catalogue"
      avant={
        <>
          <h2 className="text-h2 font-light">Familles de produits</h2>
          <GrilleLiens
            cartes={[
              { titre: "Holter ECG", texte: "Enregistreurs et analyse, ECG de repos.", href: "/holter-ecg" },
              { titre: "Holter tensionnel / MAPA", texte: "Enregistreurs, brassards et accessoires.", href: "/holter-tensionnel" },
              { titre: "Épreuve et écho d'effort", texte: "ECG d'effort, ergomètres, divans d'écho d'effort.", href: "/epreuve-effort" },
              { titre: "Accessoires et consommables", texte: "Électrodes, brassards, câbles, pochettes.", href: "/accessoires-consommables" },
            ]}
          />
          <h2 className="text-h2 font-light">Services</h2>
          <GrilleLiens
            cartes={[
              { titre: "Hébergement des données de santé", texte: "Vos logiciels sur une plateforme Cloud HDS.", href: "/services/hebergement-donnees-sante", badge: p.badgeHebergement },
              { titre: "Assistance et service", texte: "Vos consommables ouvrent votre assistance.", href: "/services/assistance" },
              { titre: "Financement", texte: "Étalez l'investissement de votre cabinet.", href: "/financement" },
              { titre: "Mise à disposition", texte: "Louez au mois, sans engagement.", href: "/mise-a-disposition" },
            ]}
          />
        </>
      }
    />
  );
}
