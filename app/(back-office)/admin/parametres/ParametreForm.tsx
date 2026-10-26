import { actionModifierParametre, actionRemettreParametre } from "./actions";
import { afficher, JOURS_SEMAINE, versSaisie, type ParametreLu } from "@/domaine/parametres";
import { Button, Card } from "@/ui";
import { classeChamp } from "@/ui/admin";

// Un paramètre : valeur, saisie selon son type, historique et « Remettre cette valeur » (F13, US4).

const date = (d: Date) => d.toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "short", timeStyle: "short" });

function Saisie({ p, id }: { p: ParametreLu; id: string }) {
  const s = versSaisie(p, p.valeur);
  const aide = p.aide ? id.replace(/-saisie$/, "-aide") : undefined;
  switch (p.type) {
    case "booleen":
      return (
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="valeur" value="oui" defaultChecked={p.valeur === "true"} aria-describedby={aide} className="size-5" />
          {p.libelle}
        </label>
      );
    case "choix":
      return (
        <select id={id} name="valeur" defaultValue={s.valeur} aria-describedby={aide} className={classeChamp}>
          {Object.entries(p.choix ?? {}).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      );
    case "horaires":
      return (
        <fieldset className="grid gap-2 sm:grid-cols-2" aria-describedby={aide}>
          <legend className="text-small font-medium">{p.libelle}</legend>
          {JOURS_SEMAINE.map(([j, nom]) => (
            <label key={j} className="flex flex-col gap-1 text-small">
              {nom[0]!.toUpperCase() + nom.slice(1)}
              <input name={`valeur-${j}`} defaultValue={s[`valeur-${j}`]} className={classeChamp} />
            </label>
          ))}
        </fieldset>
      );
    case "dates":
    case "liste":
    case "fermetures":
      return <textarea id={id} name="valeur" rows={4} defaultValue={s.valeur} aria-describedby={aide} className={`${classeChamp} py-2`} />;
    case "texte":
      return (p.max ?? 0) > 120 ? (
        <textarea id={id} name="valeur" rows={3} maxLength={p.max} defaultValue={s.valeur} aria-describedby={aide} className={`${classeChamp} py-2`} />
      ) : (
        <input id={id} name="valeur" maxLength={p.max} defaultValue={s.valeur} aria-describedby={aide} className={classeChamp} />
      );
    case "entier":
      return <input id={id} name="valeur" type="number" inputMode="numeric" min={p.min} max={p.max} defaultValue={s.valeur} aria-describedby={aide} className={classeChamp} />;
    case "telephone":
      return <input id={id} name="valeur" type="tel" defaultValue={s.valeur} aria-describedby={aide} className={classeChamp} />;
    default:
      return <input id={id} name="valeur" inputMode={p.type === "heure" ? "numeric" : undefined} defaultValue={s.valeur} aria-describedby={aide} className={classeChamp} />;
  }
}

export function ParametreForm({ p, modifiable, retour }: { p: ParametreLu; modifiable: boolean; retour: string }) {
  const id = p.cle.replace(/\./g, "-");
  const sansLibelle = p.type === "booleen" || p.type === "horaires";
  return (
    <Card id={id} className="flex flex-col gap-3 scroll-mt-24">
      {modifiable ? (
        // Clé = valeur enregistrée : après « Remettre cette valeur », le champ affiche la nouvelle valeur.
        <form key={p.valeur} action={actionModifierParametre} className="flex flex-col gap-2">
          <input type="hidden" name="cle" value={p.cle} />
          <input type="hidden" name="lue" value={p.valeur} />
          <input type="hidden" name="retour" value={retour} />
          {sansLibelle ? null : <label htmlFor={`${id}-saisie`} className="text-small font-medium">{p.libelle}</label>}
          <Saisie p={p} id={`${id}-saisie`} />
          {p.aide ? <p id={`${id}-aide`} className="text-small text-muted">{p.aide}</p> : null}
          <div><Button type="submit" variante="secondaire">Enregistrer</Button></div>
        </form>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="text-small font-medium">{p.libelle}</p>
          <p className="break-words">{afficher(p, p.valeur)}</p>
          {p.aide ? <p className="text-small text-muted">{p.aide}</p> : null}
        </div>
      )}
      {p.historique.length ? (
        <details>
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-small">Historique ({p.historique.length === 10 ? "10 dernières modifications" : p.historique.length})</summary>
          <ul className="flex flex-col gap-2 text-small">
            {p.historique.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-2">
                <span className="text-muted">{date(h.date)} · {h.auteur}</span>
                <span className="min-w-0 break-words">{afficher(p, h.avant)} → <strong className="font-medium">{afficher(p, h.apres)}</strong></span>
                {modifiable && h.apres !== p.valeur ? (
                  <form action={actionRemettreParametre}>
                    <input type="hidden" name="historique" value={h.id} />
                    <input type="hidden" name="retour" value={retour} />
                    <Button type="submit" variante="secondaire">Remettre cette valeur<span className="sr-only"> : {afficher(p, h.apres)}</span></Button>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Card>
  );
}
