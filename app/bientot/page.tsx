import type { Metadata } from "next";
import { jetonAffichage } from "@/domaine/anti-robots";
import { lireParametresPublics } from "@/domaine/contenus";
import { TEXTE_CONSENTEMENT_OUVERTURE } from "@/domaine/ouverture";
import { Dots, Kicker, Logo } from "@/ui";
import { FormulaireOuverture } from "@/ui/FormulaireOuverture";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "ExploCardio.fr — ouverture prochaine" },
  description: "Le spécialiste des explorations fonctionnelles cardiaques. Le site ouvre bientôt : soyez prévenu de son ouverture.",
  robots: { index: false, follow: false },
};

const OFFRE = [
  "Holter ECG, Holter tensionnel (MAPA), épreuve et écho d’effort, ECG de repos",
  "Accessoires et consommables, livrés rapidement",
  "Matériel en mise à disposition, mensuelle et sans engagement",
  "Assistance et SAV offerts grâce à vos achats de consommables",
];

// Page d'attente (F17) : seule page servie sur l'adresse publique (www.explocardio.fr) tant que
// le site n'est pas ouvert. Sans en-tête ni bandeau de démonstration ; non indexée.
export default async function PageAttente() {
  const { email, telephone } = await lireParametresPublics();
  return (
    <main id="contenu" className="mx-auto flex min-h-screen max-w-page flex-col gap-10 px-4 py-10 md:py-16">
      <Logo hauteur={36} priority />

      <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,28rem)] lg:items-start">
        <section aria-labelledby="titre" className="flex flex-col gap-6">
          <Kicker>Ouverture prochaine</Kicker>
          <h1 id="titre" className="text-display font-light text-ink">Le site ExploCardio.fr ouvre bientôt</h1>
          <p className="text-lead text-ink">Le spécialiste des explorations fonctionnelles cardiaques.</p>
          <p className="text-muted">
            Un site pensé pour les cardiologues libéraux, les cabinets et les centres : des prix HT affichés d’entrée de jeu, des configurations prêtes à l’emploi et une équipe d’experts réactifs.
          </p>
          <ul className="flex list-none flex-col gap-3 p-0">
            {OFFRE.map((o) => (
              <li key={o} className="flex items-start gap-3">
                <span className="mt-2 shrink-0">
                  <Dots />
                </span>
                <span>{o}</span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="titre-formulaire" className="ec-card flex flex-col gap-4">
          <h2 id="titre-formulaire" className="text-h3 font-semibold text-ink">Être prévenu de l’ouverture</h2>
          <p className="text-small text-muted">Laissez votre nom et votre adresse email : nous vous écrirons dès que le site sera ouvert.</p>
          <FormulaireOuverture jeton={jetonAffichage()} texteConsentement={TEXTE_CONSENTEMENT_OUVERTURE} />
        </section>
      </div>

      <footer className="mt-auto flex flex-col gap-2 border-t border-line pt-6 text-small text-muted">
        {email || telephone ? (
          <p>
            Une question ? Écrivez-nous
            {email ? (
              <>
                {" "}à <a href={`mailto:${email}`} className="font-medium text-action">{email}</a>
              </>
            ) : null}
            {telephone ? (
              <>
                {email ? " ou appelez le " : " : appelez le "}
                <a href={`tel:${telephone.replace(/\s/g, "")}`} className="font-medium text-action">{telephone}</a>
              </>
            ) : null}
            .
          </p>
        ) : null}
        <p>
          Vos nom et adresse email servent uniquement à vous prévenir de l’ouverture du site ; ils ne sont transmis à personne. Vous pouvez demander à tout moment leur suppression
          {email ? (
            <>
              {" "}à <a href={`mailto:${email}`} className="font-medium text-action">{email}</a>
            </>
          ) : null}
          .
        </p>
        <p>© ExploCardio.fr</p>
      </footer>
    </main>
  );
}
