import type { Metadata } from "next";
import { GrilleLiens } from "@/ui/GrilleLiens";
import { Kicker } from "@/ui";

export const metadata: Metadata = { title: "Contenus" };

export default function Contenus() {
  return (
    <div className="flex flex-col gap-6">
      <Kicker>Contenus</Kicker>
      <h1 className="text-h2 font-light">Contenus de l’accueil et de l’en-tête</h1>
      <p className="text-muted">Chaque modification est visible sur le site en moins d’une minute et inscrite au journal.</p>
      <GrilleLiens
        cartes={[
          { titre: "Bandeau promotionnel", texte: "Messages, ordre, dates de début et de fin.", href: "/admin/contenus/bandeau" },
          { titre: "Tuiles d'accès rapide", texte: "Titre, phrase, lien, badge, fond des 6 tuiles.", href: "/admin/contenus/tuiles" },
          { titre: "Actualités", texte: "Actualités, nouveaux produits, nouvelles offres.", href: "/admin/contenus/actualites" },
          { titre: "Coordonnées et textes", texte: "Contact, offre de bienvenue, engagements, badges, motifs.", href: "/admin/contenus/coordonnees" },
          { titre: "Menus", texte: "Produits phares et liens rapides des méga-menus.", href: "/admin/contenus/menus" },
          { titre: "Marques", texte: "Marques partenaires et leurs logos.", href: "/admin/contenus/marques" },
        ]}
      />
    </div>
  );
}
