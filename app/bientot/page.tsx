import type { Metadata } from "next";
import { jetonAffichage } from "@/domaine/anti-robots";
import { lireParametresPublics } from "@/domaine/contenus";
import { TEXTE_CONSENTEMENT_OUVERTURE } from "@/domaine/ouverture";
import { Dots, Kicker, Logo } from "@/ui";
import { FormulaireOuverture } from "@/ui/FormulaireOuverture";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "ExploCardio.fr — ouverture prochaine" },
  description: "Le spécialiste des explorations fonctionnelles cardiaques. Plus que quelques jours avant le lancement officiel du site : laissez vos coordonnées pour être prévenu.",
  robots: { index: false, follow: false },
};

const SERVICES = ["Vente, location, financement, mise à disposition", "Hébergement des données de santé", "Hotline dédiée, SAV"];
const DOMAINES = ["Holter ECG", "Holter tensionnel", "Épreuve d’effort", "Échographie d’effort", "Consommables"];

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
          <h1 id="titre" className="text-display font-light text-ink">Plus que quelques jours avant le lancement officiel du site ExploCardio.fr</h1>
          <p className="text-lead text-ink">Le spécialiste des explorations fonctionnelles cardiaques.</p>
          <p className="text-muted">Une offre de produits et de services pensée pour l’exercice de la cardiologie libérale.</p>
          <ul aria-label="Nos services" className="flex list-none flex-col gap-3 p-0">
            {SERVICES.map((s) => (
              <li key={s} className="flex items-center gap-3">
                <Dots />
                <span className="text-h3 font-medium text-action">{s}</span>
              </li>
            ))}
          </ul>
          <ul aria-label="Nos domaines" className="flex list-none flex-wrap gap-2 p-0">
            {DOMAINES.map((d) => (
              <li key={d} className="rounded-full border border-line bg-surface px-4 py-2 text-small font-medium text-action">
                {d}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="titre-formulaire" className="ec-card flex flex-col gap-4">
          <h2 id="titre-formulaire" className="text-h3 font-semibold text-ink">Être prévenu de l’ouverture</h2>
          <p className="text-small text-muted">Laissez vos coordonnées et éventuellement un commentaire : nous vous répondrons et nous vous préviendrons de la mise en ligne du site.</p>
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
          Vos nom et adresse email servent uniquement à vous prévenir de l’ouverture du site et/ou à répondre à votre demande ; ils ne sont transmis à personne. Vous pouvez demander à tout moment leur suppression
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
