import { ButtonLink } from "../Button";
import { Section } from "./Section";

/** Offre de bienvenue (FR-022) : encart lin, texte modifiable, bouton d'inscription. */
export function OffreBienvenue({ texte }: { texte: string }) {
  if (!texte) return null;
  return (
    <Section id="bienvenue" surtitre="Offre de bienvenue" titre="Bienvenue chez ExploCardio.fr">
      <div className="ec-box--promo flex flex-col items-start gap-4 p-8 md:flex-row md:items-center md:justify-between">
        <p className="max-w-2xl text-h3 font-normal text-ink">{texte}</p>
        <ButtonLink href="/connexion">Créer mon compte</ButtonLink>
      </div>
    </Section>
  );
}
