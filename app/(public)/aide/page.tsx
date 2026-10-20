import type { Metadata } from "next";
import Link from "next/link";
import { registre } from "@/connecteurs/registre";
import { contenusPublies, documentsProduits, reponseHtml, THEMES, trierFaq, TYPES, type FiltresAide } from "@/domaine/aide/lecture";
import { Kicker } from "@/ui";
import { QuestionFaq } from "@/ui/aide/QuestionFaq";
import { ContactWhatsApp } from "@/ui/contact/ContactWhatsApp";
import type { ThemeAide, TypeContenuAide } from "@generated/site/client";

export const metadata: Metadata = { title: "Centre d’aide" };

type Props = { searchParams: Promise<{ q?: string; theme?: string; ref?: string; type?: string }> };

const pilule = (actif: boolean) => `ec-btn ${actif ? "ec-btn--primary" : "ec-btn--secondary"}`;

async function nomsDesReferences(): Promise<Map<string, string>> {
  try {
    const refs = await registre.odoo().catalogue.listerReferences();
    return new Map(refs.map((r) => [r.defaultCode, r.configuration ? `${r.nom} — ${r.configuration}` : r.nom]));
  } catch {
    return new Map();
  }
}

// Centre d'aide (F09, US3, FR-011 à FR-014) : tutoriels vidéo, modes d'emploi, notices et FAQ,
// classés par appareil, logiciel et thème ; recherche ; « Besoin d'aide ? » en bas de page.
export default async function CentreAide({ searchParams }: Props) {
  const p = await searchParams;
  const filtres: FiltresAide = {
    recherche: p.q?.trim().slice(0, 100) || undefined,
    theme: p.theme && p.theme in THEMES ? (p.theme as ThemeAide) : undefined,
    reference: p.ref?.slice(0, 64) || undefined,
    type: p.type && p.type in TYPES ? (p.type as TypeContenuAide) : undefined,
  };
  const filtre = Boolean(filtres.recherche || filtres.theme || filtres.reference || filtres.type);
  const [contenus, documents, noms] = await Promise.all([contenusPublies(filtres), documentsProduits(filtres.reference), nomsDesReferences()]);
  const faq = trierFaq(contenus.filter((c) => c.type === "faq"));
  const guides = contenus.filter((c) => c.type !== "faq");
  const docs = filtres.recherche || filtres.theme || (filtres.type && filtres.type !== "notice") ? [] : documents;
  const faqAffichee = filtre ? faq : faq.slice(0, 5);
  const reponses = await Promise.all(faqAffichee.map((q) => reponseHtml(q.reponse)));
  const tousContenus = filtre ? await contenusPublies() : contenus;
  const references = [...new Set([...tousContenus.flatMap((c) => c.references), ...(filtre ? [] : documents.map((d) => d.defaultCode))])].filter((r) => noms.has(r));
  const rien = !faq.length && !guides.length && !docs.length;

  return (
    <div className="mx-auto flex max-w-page flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-3">
        <Kicker>Services</Kicker>
        <h1 className="text-display font-light">Centre d’aide</h1>
        <p className="text-lead">Tutoriels, modes d’emploi pas à pas, notices et réponses aux questions fréquentes, à toute heure.</p>
      </header>

      <form role="search" action="/aide" className="flex max-w-2xl flex-wrap items-end gap-3">
        <div className="flex min-w-64 flex-1 flex-col gap-1">
          <label htmlFor="recherche-aide" className="text-small font-medium text-ink">Rechercher dans l’aide</label>
          <input id="recherche-aide" name="q" type="search" defaultValue={filtres.recherche ?? ""} className="min-h-11 rounded-sm border border-muted bg-surface px-3 text-ink" />
        </div>
        <button type="submit" className="ec-btn ec-btn--primary">Rechercher</button>
      </form>

      <nav aria-label="Thèmes de l’aide" className="flex flex-wrap gap-2">
        <Link href="/aide" aria-current={!filtre ? "page" : undefined} className={pilule(!filtre)}>Tout</Link>
        {(Object.keys(THEMES) as ThemeAide[]).map((t) => (
          <Link key={t} href={`/aide?theme=${t}`} aria-current={filtres.theme === t ? "page" : undefined} className={pilule(filtres.theme === t)}>{THEMES[t]}</Link>
        ))}
      </nav>
      {references.length ? (
        <nav aria-label="Appareils et logiciels" className="flex flex-col gap-2">
          <p className="font-semibold text-ink">Par appareil ou logiciel</p>
          <ul className="flex list-none flex-wrap gap-2 p-0">
            {references.map((r) => (
              <li key={r}>
                <Link href={`/aide?ref=${encodeURIComponent(r)}`} aria-current={filtres.reference === r ? "page" : undefined} className={pilule(filtres.reference === r)}>{noms.get(r)}</Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      {rien ? (
        <p role="status" className="ec-box--info p-4">
          Aucun contenu ne correspond{filtres.recherche ? ` à « ${filtres.recherche} »` : ""}. Écrivez-nous ou appelez-nous sur WhatsApp : nous vous répondons.
        </p>
      ) : null}

      {faqAffichee.length ? (
        <section aria-labelledby="titre-faq" className="flex flex-col gap-3">
          <h2 id="titre-faq" className="text-h2 font-light">{filtre ? "Questions fréquentes" : "Les questions les plus consultées"}</h2>
          <div className="flex flex-col gap-2">
            {faqAffichee.map((q, i) => (
              <QuestionFaq key={q.id} slug={q.slug} titre={q.titre} html={reponses[i]!} />
            ))}
          </div>
          {!filtre && faq.length > 5 ? <p><Link href="/aide?type=faq" className="inline-flex min-h-11 items-center">Toutes les questions ({faq.length})</Link></p> : null}
        </section>
      ) : null}

      {guides.length ? (
        <section aria-labelledby="titre-guides" className="flex flex-col gap-3">
          <h2 id="titre-guides" className="text-h2 font-light">Tutoriels et modes d’emploi</h2>
          <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((g) => (
              <li key={g.id} className="ec-card flex flex-col gap-2">
                <p className="text-small text-muted">{TYPES[g.type]} · {THEMES[g.theme]}</p>
                <Link href={`/aide/${g.slug}`} className="inline-flex min-h-11 items-center text-h3 font-semibold">{g.titre}</Link>
                <p className="text-small">{g.resume}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {docs.length ? (
        <section aria-labelledby="titre-notices" className="flex flex-col gap-3">
          <h2 id="titre-notices" className="text-h2 font-light">Notices des appareils</h2>
          <ul className="flex list-none flex-col gap-2 p-0">
            {docs.map((d) => (
              <li key={`${d.defaultCode}:${d.chemin}`} className="ec-card flex flex-wrap items-center justify-between gap-2">
                <span>
                  {d.titre}
                  <span className="block text-small text-muted">{noms.get(d.defaultCode) ?? d.defaultCode} · {d.type === "notice" ? "Notice" : "Fiche technique"} (PDF)</span>
                </span>
                <a href={d.chemin} className="inline-flex min-h-11 items-center" aria-label={`Télécharger ${d.titre} (PDF)`}>Télécharger</a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ContactWhatsApp />
    </div>
  );
}
