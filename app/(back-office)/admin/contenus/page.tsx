import type { Metadata } from "next";
import { GrilleLiens } from "@/ui/GrilleLiens";
import { Kicker } from "@/ui";

export const metadata: Metadata = { title: "Contenus" };

export default function Contenus() {
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Contenus</Kicker>
      <h1 className="text-h2 font-light">Contenus du site</h1>
      <p className="text-muted">Chaque modification est visible sur le site en moins d’une minute et inscrite au journal.</p>
      <GrilleLiens
        cartes={[
          { titre: "Bandeau promotionnel", texte: "Messages, ordre, dates de début et de fin.", href: "/admin/contenus/bandeau" },
          { titre: "Organisation de l'accueil", texte: "Ordre et affichage des blocs : animation, gammes phares, Pourquoi choisir, offre digitale, carrousel.", href: "/admin/contenus/organisation" },
          { titre: "Gammes phares", texte: "Titre, phrase, lien, badge, fond et image des 3 cartes.", href: "/admin/contenus/tuiles" },
          { titre: "Carrousel de l'accueil", texte: "Vignettes : offres, informations du moment, produits phares ; ordre, dates, aperçu.", href: "/admin/contenus/carrousel" },
          { titre: "Textes de l'accueil", texte: "Animation d'ouverture et six cartes « Pourquoi choisir ExploCardio.fr ? ».", href: "/admin/contenus/accueil" },
          { titre: "Textes des pages", texte: "Services, financement, catégories, qui sommes-nous, pages légales : brouillon, aperçu, publication.", href: "/admin/contenus/pages" },
          { titre: "Coordonnées et textes", texte: "Coordonnées du bloc Contact, textes de l'accueil.", href: "/admin/contenus/coordonnees" },
          { titre: "Menus", texte: "Produits phares et liens rapides des méga-menus.", href: "/admin/contenus/menus" },
          { titre: "Marques", texte: "Marques partenaires et leurs logos.", href: "/admin/contenus/marques" },
          { titre: "Centre d'aide", texte: "Tutoriels vidéo, modes d'emploi, notices générales et FAQ.", href: "/admin/contenus/aide" },
        ]}
      />
    </div>
  );
}
