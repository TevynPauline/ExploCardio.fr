import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ETAPES_MAX } from "@/domaine/aide/administration";
import { etapesDe, THEMES, TYPES } from "@/domaine/aide/lecture";
import { dbSite } from "@/lib/db/site";
import { Button, Card, Kicker, Retour } from "@/ui";
import { ChampAdmin, classeChamp } from "@/ui/admin";
import { actionEnregistrerAide, actionPublierAide, actionRetirerAide } from "../actions";

export const metadata: Metadata = { title: "Contenu d’aide" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erreur?: string }> };

// Contenu du centre d'aide (F09, US4) : saisie, téléversements, publication contrôlée (FR-015).
export default async function ContenuAideAdmin({ params, searchParams }: Props) {
  const { id } = await params;
  const r = await searchParams;
  const c = id === "nouveau" ? null : await dbSite().contenuAide.findUnique({ where: { id } });
  if (id !== "nouveau" && !c) notFound();
  const etapes = c ? etapesDe(c) : [];
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <p className="text-small"><Link href="/admin/contenus/aide" className="inline-flex min-h-11 items-center">Centre d’aide</Link></p>
      <Kicker>Centre d’aide</Kicker>
      <h1 className="text-h2 font-light">{c ? c.titre : "Nouveau contenu d’aide"}</h1>
      {c ? <p className="text-muted">{c.etat === "publie" ? "Publié" : "En préparation"} · <Link href={`/aide/${c.slug}`}>/aide/{c.slug}</Link></p> : null}
      <Retour {...r} />

      <form action={actionEnregistrerAide} className="flex flex-col gap-6">
        <input type="hidden" name="id" value={c?.id ?? ""} />
        <Card className="grid gap-3 sm:grid-cols-2">
          <ChampAdmin id="type" libelle="Type">
            <select id="type" name="type" defaultValue={c?.type ?? "faq"} className={classeChamp}>
              {Object.entries(TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </ChampAdmin>
          <ChampAdmin id="theme" libelle="Thème">
            <select id="theme" name="theme" defaultValue={c?.theme ?? "prise_en_main"} className={classeChamp}>
              {Object.entries(THEMES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </ChampAdmin>
          <div className="sm:col-span-2">
            <ChampAdmin id="titre" libelle="Titre (ou question pour la FAQ)">
              <input id="titre" name="titre" required maxLength={120} defaultValue={c?.titre ?? ""} className={classeChamp} />
            </ChampAdmin>
          </div>
          <div className="sm:col-span-2">
            <ChampAdmin id="resume" libelle="Résumé">
              <input id="resume" name="resume" required maxLength={300} defaultValue={c?.resume ?? ""} className={classeChamp} />
            </ChampAdmin>
          </div>
          <div className="sm:col-span-2">
            <ChampAdmin id="references" libelle="Appareils et logiciels liés (références d’Odoo)" aide="Séparées par des virgules, ex. EC-DMS-3004L, EC-DMS-CS-HOLTER-CLOUD : le contenu s’affiche sur leurs fiches.">
              <input id="references" name="references" defaultValue={c?.references.join(", ") ?? ""} className={classeChamp} />
            </ChampAdmin>
          </div>
        </Card>

        <p role="note" className="ec-box--promo p-4 font-medium">
          Aucune donnée de patient réelle dans les textes, images, vidéos et documents (FR-016) : utilisez des exemples fictifs ou anonymes.
        </p>

        <Card className="grid gap-3">
          <h2 className="text-h3 font-semibold">Question fréquente</h2>
          <ChampAdmin id="reponse" libelle="Réponse" aide="Texte simple ; **gras** et listes acceptés.">
            <textarea id="reponse" name="reponse" rows={5} defaultValue={c?.reponse ?? ""} className={`${classeChamp} py-2`} />
          </ChampAdmin>
        </Card>

        <Card className="grid gap-3">
          <h2 className="text-h3 font-semibold">Tutoriel vidéo</h2>
          <p className="text-small text-muted">MP4 de 50 Mo au plus, sous-titres WebVTT et transcription obligatoires pour publier.{c?.video ? " Vidéo déjà téléversée." : ""}{c?.sousTitres ? " Sous-titres déjà téléversés." : ""}</p>
          <ChampAdmin id="video" libelle="Fichier vidéo (MP4)">
            <input id="video" name="video" type="file" accept="video/mp4" className={classeChamp} />
          </ChampAdmin>
          <ChampAdmin id="sousTitres" libelle="Sous-titres (WebVTT, .vtt)">
            <input id="sousTitres" name="sousTitres" type="file" accept=".vtt,text/vtt" className={classeChamp} />
          </ChampAdmin>
          <ChampAdmin id="transcription" libelle="Transcription">
            <textarea id="transcription" name="transcription" rows={5} defaultValue={c?.transcription ?? ""} className={`${classeChamp} py-2`} />
          </ChampAdmin>
        </Card>

        <Card className="grid gap-3">
          <h2 className="text-h3 font-semibold">Mode d’emploi pas à pas</h2>
          <p className="text-small text-muted">Chaque étape a son texte et son image (PNG, JPEG, WebP ou SVG, 2 Mo au plus) avec sa description.</p>
          {Array.from({ length: ETAPES_MAX }, (_, i) => {
            const e = etapes[i];
            return (
              <fieldset key={i} className="grid gap-2 border-t border-line pt-3 sm:grid-cols-2">
                <legend className="font-semibold text-ink">Étape {i + 1}</legend>
                <div className="sm:col-span-2">
                  <ChampAdmin id={`etape-${i}-texte`} libelle="Texte">
                    <textarea id={`etape-${i}-texte`} name={`etape-${i}-texte`} rows={2} defaultValue={e?.texte ?? ""} className={`${classeChamp} py-2`} />
                  </ChampAdmin>
                </div>
                <ChampAdmin id={`etape-${i}-image`} libelle={e?.image ? "Remplacer l’image" : "Image"}>
                  <input id={`etape-${i}-image`} name={`etape-${i}-image`} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className={classeChamp} />
                </ChampAdmin>
                <ChampAdmin id={`etape-${i}-alt`} libelle="Description de l’image">
                  <input id={`etape-${i}-alt`} name={`etape-${i}-alt`} defaultValue={e?.texteRemplacement ?? ""} className={classeChamp} />
                </ChampAdmin>
                <input type="hidden" name={`etape-${i}-image-actuelle`} value={e?.image ?? ""} />
              </fieldset>
            );
          })}
        </Card>

        <Card className="grid gap-3">
          <h2 className="text-h3 font-semibold">Notice générale</h2>
          <p className="text-small text-muted">Procédure qui ne concerne pas un produit en particulier (PDF, 10 Mo au plus).{c?.document ? " Document déjà téléversé." : ""}</p>
          <ChampAdmin id="document" libelle="Document PDF">
            <input id="document" name="document" type="file" accept="application/pdf" className={classeChamp} />
          </ChampAdmin>
        </Card>

        <div><Button type="submit">Enregistrer</Button></div>
      </form>

      {c ? (
        <Card className="flex flex-wrap items-center gap-3">
          {c.etat === "publie" ? (
            <form action={actionRetirerAide}>
              <input type="hidden" name="id" value={c.id} />
              <Button type="submit" variante="secondaire">Retirer de l’aide en ligne</Button>
            </form>
          ) : (
            <form action={actionPublierAide}>
              <input type="hidden" name="id" value={c.id} />
              <Button type="submit">Publier</Button>
            </form>
          )}
        </Card>
      ) : null}
    </div>
  );
}
