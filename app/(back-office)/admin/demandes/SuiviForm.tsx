import { Button } from "@/ui";
import { classeChamp } from "@/ui/admin";

// Formulaire de suivi d'une demande (F13, US6) : état, note interne, version lue (D9).

type Props = {
  action: (d: FormData) => Promise<void>;
  id: string;
  etat: string;
  etats: Record<string, string>;
  notes: string | null;
  modifieLe: Date;
  retour: string;
  modifiable: boolean;
};

export function SuiviForm({ action, id, etat, etats, notes, modifieLe, retour, modifiable }: Props) {
  if (!modifiable) return notes ? <p className="text-small whitespace-pre-line text-muted">Note : {notes}</p> : null;
  return (
    <form key={modifieLe.toISOString()} action={action} className="mt-2 grid gap-2 border-t border-line pt-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="modifieLe" value={modifieLe.toISOString()} />
      <input type="hidden" name="retour" value={retour} />
      <label htmlFor={`etat-${id}`} className="flex flex-col gap-1 text-small font-medium">
        État
        <select id={`etat-${id}`} name="etat" defaultValue={etat} className={classeChamp}>
          {Object.entries(etats).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label htmlFor={`notes-${id}`} className="flex min-w-0 flex-col gap-1 text-small font-medium">
        Note interne
        <textarea id={`notes-${id}`} name="notes" rows={2} maxLength={2000} defaultValue={notes ?? ""} className={`${classeChamp} py-2`} />
      </label>
      <div className="sm:col-span-2"><Button type="submit" variante="secondaire">Enregistrer le suivi</Button></div>
    </form>
  );
}
