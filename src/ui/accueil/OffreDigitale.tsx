import Link from "next/link";
import { Badge } from "../Badge";
import { Section } from "./Section";

type Element = { titre: string; texte: string; href: string; badge?: string | null };

/** Offre digitale et flexibilité (FR-020), destinations de contracts/pages-et-liens.md. */
export function OffreDigitale({ badgeLogicielCloud, whatsapp }: { badgeLogicielCloud: string | null; whatsapp: string }) {
  const elements: Element[] = [
    { titre: "Achat direct", texte: "Prix HT affichés, configurations standard.", href: "/catalogue" },
    { titre: "Financement", texte: "Étalez l'investissement sur la durée choisie.", href: "/financement" },
    { titre: "Mise à disposition au mois", texte: "Sans engagement, premier mois et suivants affichés.", href: "/mise-a-disposition" },
    { titre: "Pack dépannage express", texte: "Un appareil immobilisé ? Continuez vos examens.", href: "/mise-a-disposition#depannage-express" },
    { titre: "Logiciel Cloud", texte: "Vos logiciels sur une plateforme certifiée HDS.", href: "/services/hebergement-donnees-sante", badge: badgeLogicielCloud },
    { titre: "Outils en ligne", texte: "Tutoriels, espace client et contact WhatsApp.", href: "/services/assistance#aide" },
  ];
  return (
    <Section id="offre-digitale" surtitre="Offre digitale" titre="Achetez, louez ou financez, à votre rythme">
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {elements.map((e) => (
          <li key={e.titre}>
            <Link href={e.href} className="ec-card flex h-full flex-col gap-2 no-underline hover:border-action">
              {e.badge ? <span><Badge>{e.badge}</Badge></span> : null}
              <span className="text-h3 font-semibold text-ink">{e.titre}</span>
              <span className="text-muted">{e.texte}</span>
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-small text-muted">
        Une question ? <a href={whatsapp}>Écrivez-nous sur WhatsApp</a>.
      </p>
    </Section>
  );
}
