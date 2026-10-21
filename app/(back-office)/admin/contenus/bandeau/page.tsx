import type { Metadata } from "next";
import { dbSite } from "@/lib/db/site";
import { Button, Card, Kicker, Retour } from "@/ui";
import { ChampAdmin, classeChamp, EtatAdmin, valeurDate } from "@/ui/admin";
import { ApercuCadres } from "@/ui/ApercuCadres";
import { enregistrerMessageBandeau, supprimerMessageBandeau } from "../actions";

export const metadata: Metadata = { title: "Bandeau promotionnel" };

type Message = { id: string; corps: string; lien: string | null; ordre: number; etat: "preparation" | "publie" | "retire"; debut: Date | null; fin: Date | null; modifieLe: Date };

function FormulaireMessage({ m }: { m?: Message }) {
  const p = m?.id ?? "nouveau";
  return (
    <form action={enregistrerMessageBandeau} className="flex flex-col gap-3">
      {m ? <input type="hidden" name="id" value={m.id} /> : null}
      <ChampAdmin id={`texte-${p}`} libelle="Texte (140 caractères au plus)">
        <input id={`texte-${p}`} name="texte" defaultValue={m?.corps} maxLength={140} required className={classeChamp} />
      </ChampAdmin>
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <ChampAdmin id={`lien-${p}`} libelle="Lien (facultatif)" aide="Page du site (/…) ou adresse https://">
          <input id={`lien-${p}`} name="lien" defaultValue={m?.lien ?? ""} className={classeChamp} />
        </ChampAdmin>
        <ChampAdmin id={`ordre-${p}`} libelle="Ordre">
          <input id={`ordre-${p}`} name="ordre" inputMode="numeric" defaultValue={m?.ordre ?? 0} className={classeChamp} />
        </ChampAdmin>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ChampAdmin id={`debut-${p}`} libelle="Début de la promotion (facultatif)">
          <input id={`debut-${p}`} name="debut" type="datetime-local" defaultValue={valeurDate(m?.debut ?? null)} className={classeChamp} />
        </ChampAdmin>
        <ChampAdmin id={`fin-${p}`} libelle="Fin de la promotion (facultatif)">
          <input id={`fin-${p}`} name="fin" type="datetime-local" defaultValue={valeurDate(m?.fin ?? null)} className={classeChamp} />
        </ChampAdmin>
      </div>
      <input type="hidden" name="modifieLe" value={m?.modifieLe.toISOString() ?? ""} />
      <EtatAdmin id={`etat-${p}`} etat={m?.etat ?? "publie"} />
      <div className="flex flex-wrap gap-2">
        <Button type="submit">{m ? "Enregistrer" : "Ajouter le message"}</Button>
      </div>
    </form>
  );
}

// Bandeau promotionnel (FR-036) : affiché seulement pendant la période de promotion.
export default async function Bandeau({ searchParams }: { searchParams: Promise<{ ok?: string; erreur?: string }> }) {
  const r = await searchParams;
  const messages = await dbSite().contenu.findMany({ where: { type: "bandeau" }, orderBy: { ordre: "asc" } });
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <Kicker>Contenus</Kicker>
      <h1 className="text-h2 font-light">Bandeau promotionnel</h1>
      <p className="text-muted">Le bandeau n’apparaît que s’il existe au moins un message actif dans sa période. Plusieurs messages défilent.</p>
      <Retour {...r} />
      {messages.map((m) => (
        <Card key={m.id}>
          <FormulaireMessage m={m} />
          <form action={supprimerMessageBandeau} className="mt-3">
            <input type="hidden" name="id" value={m.id} />
            <Button type="submit" variante="secondaire">Supprimer ce message</Button>
          </form>
        </Card>
      ))}
      <Card>
        <h2 className="mb-3 text-h3 font-semibold">Nouveau message</h2>
        <FormulaireMessage />
      </Card>
      <Card>
        <h2 className="mb-3 text-h3 font-semibold">Aperçu du bandeau (accueil)</h2>
        <ApercuCadres chemin="/" />
      </Card>
    </div>
  );
}
