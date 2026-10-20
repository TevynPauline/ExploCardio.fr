import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { contenuPublie, etapesDe, reponseHtml, THEMES, TYPES } from "@/domaine/aide/lecture";
import { cheminsDesFiches } from "@/domaine/catalogue/lecture";
import { Kicker } from "@/ui";
import { ContactWhatsApp } from "@/ui/contact/ContactWhatsApp";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await contenuPublie((await params).slug);
  return c ? { title: c.titre, description: c.resume } : { title: "Aide introuvable" };
}

// Contenu du centre d'aide (F09, US3) : vidéo sous-titrée et transcription, mode d'emploi pas à
// pas, notice PDF ou réponse ; produits liés ; « Besoin d'aide ? » en bas (FR-014).
export default async function ContenuAide({ params }: Props) {
  const c = await contenuPublie((await params).slug);
  if (!c) notFound();
  const [html, chemins] = await Promise.all([reponseHtml(c.reponse), cheminsDesFiches()]);
  const etapes = etapesDe(c);
  const fiches = [...new Set(c.references.map((r) => chemins.get(r)).filter((x): x is string => Boolean(x)))];
  return (
    <div className="mx-auto flex max-w-page flex-col gap-8 px-4 py-10">
      <nav aria-label="Fil d’Ariane" className="text-small">
        <Link href="/aide" className="inline-flex min-h-11 items-center">Centre d’aide</Link>
      </nav>
      <header className="flex flex-col gap-2">
        <Kicker>{TYPES[c.type]} · {THEMES[c.theme]}</Kicker>
        <h1 className="text-display font-light">{c.titre}</h1>
        <p className="text-lead">{c.resume}</p>
      </header>

      {c.type === "video" && c.video ? (
        <section aria-label="Vidéo" className="flex flex-col gap-3">
          <video controls preload="metadata" className="w-full max-w-3xl rounded-sm border border-line">
            <source src={c.video} type="video/mp4" />
            {c.sousTitres ? <track kind="captions" src={c.sousTitres} srcLang="fr" label="Français" default /> : null}
          </video>
          {c.transcription ? (
            <details className="ec-card max-w-3xl">
              <summary className="flex min-h-11 cursor-pointer items-center font-semibold text-ink">Transcription de la vidéo</summary>
              <p className="mt-3 whitespace-pre-line">{c.transcription}</p>
            </details>
          ) : null}
        </section>
      ) : null}

      {c.type === "mode_emploi" && etapes.length ? (
        <ol className="flex max-w-3xl list-none flex-col gap-4 p-0">
          {etapes.map((e, i) => (
            <li key={i} className="ec-card flex flex-col gap-3 sm:flex-row sm:items-start">
              {e.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- illustrations du stockage du site
                <img src={e.image} alt={e.texteRemplacement} width={240} height={150} className="h-auto w-full max-w-60 rounded-sm" />
              ) : null}
              <div>
                <p className="font-semibold text-ink">Étape {i + 1}</p>
                <p>{e.texte}</p>
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      {c.type === "notice" && c.document ? (
        <p>
          <a href={c.document} className="ec-btn ec-btn--primary" aria-label={`Télécharger ${c.titre} (PDF)`}>Télécharger la notice (PDF)</a>
        </p>
      ) : null}

      {html ? <div className="texte-riche max-w-3xl" dangerouslySetInnerHTML={{ __html: html }} /> : null}

      {fiches.length ? (
        <p className="text-small">
          Produits concernés :{" "}
          {fiches.map((f, i) => (
            <span key={f}>
              {i ? ", " : ""}
              <Link href={f}>{f.split("/").pop()?.replace(/-/g, " ")}</Link>
            </span>
          ))}
        </p>
      ) : null}

      <ContactWhatsApp />
    </div>
  );
}
