import type { Metadata } from "next";
import { jetonAffichage } from "@/domaine/anti-robots";
import { lireParametresPublics } from "@/domaine/contenus";
import { lireTexte } from "@/domaine/textes";
import { liensContact } from "@/lib/contact-whatsapp";
import { Card, Kicker, TexteRiche } from "@/ui";
import { FormulaireContact } from "@/ui/FormulaireContact";

export const metadata: Metadata = { title: "Qui sommes-nous / Contact" };

// Page Qui sommes-nous / Contact (FR-029 à FR-031). Coordonnées masquées tant qu'elles sont vides.
export default async function QuiSommesNous({ searchParams }: { searchParams: Promise<{ motif?: string }> }) {
  const { motif } = await searchParams;
  const [{ titre, html }, p, whatsapp] = await Promise.all([lireTexte("qui-sommes-nous"), lireParametresPublics(), liensContact()]);
  const motifInitial = motif && p.motifs.includes(motif) ? motif : null;
  return (
    <div className="mx-auto grid max-w-page grid-cols-1 gap-10 px-4 py-10 lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col gap-4">
        <Kicker>ExploCardio.fr</Kicker>
        <h1 className="text-display font-light">{titre}</h1>
        <TexteRiche html={html} />
        {p.telephone || p.email || p.adresse ? (
          <dl className="grid gap-2 sm:grid-cols-[auto_1fr] sm:gap-x-6">
            {p.telephone ? (<><dt className="font-medium">Téléphone</dt><dd>{p.telephone}</dd></>) : null}
            {p.email ? (<><dt className="font-medium">Email</dt><dd><a href={`mailto:${p.email}`}>{p.email}</a></dd></>) : null}
            {p.adresse ? (<><dt className="font-medium">Adresse</dt><dd>{p.adresse}</dd></>) : null}
          </dl>
        ) : null}
      </div>
      <section id="contact" aria-labelledby="titre-formulaire" className="scroll-mt-28">
        <Card>
          <h2 id="titre-formulaire" className="mb-4 text-h2 font-light">Nous écrire</h2>
          <FormulaireContact
            motifs={p.motifs}
            motifInitial={motifInitial}
            jeton={jetonAffichage()}
            liensWhatsapp={{ appeler: whatsapp.appeler, ecrire: whatsapp.ecrire }}
          />
        </Card>
      </section>
    </div>
  );
}
