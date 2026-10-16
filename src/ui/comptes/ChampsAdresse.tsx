import { Champ } from "../Champ";

type Props = {
  prefixe: string;
  legende: string;
  valeurs: Record<string, string>;
  erreurs: Partial<Record<string, string>>;
  aideCodePostal?: string;
};

/** Champs d'une adresse (ligne, complément, code postal, ville). */
export function ChampsAdresse({ prefixe, legende, valeurs, erreurs, aideCodePostal }: Props) {
  const v = (cle: string) => valeurs[`${prefixe}.${cle}`] ?? "";
  const e = (cle: string) => erreurs[`${prefixe}.${cle}`] ?? null;
  return (
    <fieldset className="grid gap-3 sm:grid-cols-[1fr_8rem_1fr]">
      <legend className="mb-2 font-semibold text-ink">{legende}</legend>
      <div className="sm:col-span-3">
        <Champ id={`${prefixe}.ligne1`} name={`${prefixe}.ligne1`} libelle="Adresse" autoComplete="address-line1" defaultValue={v("ligne1")} erreur={e("ligne1")} />
      </div>
      <div className="sm:col-span-3">
        <Champ id={`${prefixe}.ligne2`} name={`${prefixe}.ligne2`} libelle="Complément (facultatif)" autoComplete="address-line2" defaultValue={v("ligne2")} />
      </div>
      <Champ id={`${prefixe}.codePostal`} name={`${prefixe}.codePostal`} libelle="Code postal" inputMode="numeric" autoComplete="postal-code" defaultValue={v("codePostal")} erreur={e("codePostal")} aide={aideCodePostal} />
      <div className="sm:col-span-2">
        <Champ id={`${prefixe}.ville`} name={`${prefixe}.ville`} libelle="Ville" autoComplete="address-level2" defaultValue={v("ville")} erreur={e("ville")} />
      </div>
    </fieldset>
  );
}
