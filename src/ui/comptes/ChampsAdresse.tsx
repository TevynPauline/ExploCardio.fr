import Link from "next/link";
import { LIEN_CONTACT_HORS_METROPOLE, MESSAGE_HORS_METROPOLE, PAYS_AUTRE } from "@/domaine/comptes/adresses";
import { Champ } from "../Champ";

type Props = {
  prefixe: string;
  legende: string;
  valeurs: Record<string, string>;
  erreurs: Partial<Record<string, string>>;
  aideCodePostal?: string;
  /** F16 (US8) : adresse pouvant servir à la livraison, avec le choix du pays. */
  pays?: boolean;
};

/** F16 (FR-029) : après un refus hors métropole, l'équipe étudie la demande. */
export function ContactHorsMetropole() {
  return (
    <p className="text-small">
      <Link href={LIEN_CONTACT_HORS_METROPOLE} className="ec-btn ec-btn--secondary">Nous contacter</Link>
    </p>
  );
}

/** Champs d'une adresse (ligne, complément, code postal, ville ; pays pour une livraison). */
export function ChampsAdresse({ prefixe, legende, valeurs, erreurs, aideCodePostal, pays = false }: Props) {
  const v = (cle: string) => valeurs[`${prefixe}.${cle}`] ?? "";
  const e = (cle: string) => erreurs[`${prefixe}.${cle}`] ?? null;
  const horsMetropole = e("pays") === MESSAGE_HORS_METROPOLE || e("codePostal") === MESSAGE_HORS_METROPOLE;
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
      {pays ? (
        <div className="flex flex-col gap-1 sm:col-span-3">
          <label htmlFor={`${prefixe}.pays`} className="text-small font-medium text-ink">Pays</label>
          <select
            id={`${prefixe}.pays`}
            name={`${prefixe}.pays`}
            defaultValue={v("pays") || "france"}
            aria-invalid={e("pays") ? true : undefined}
            aria-describedby={e("pays") ? `${prefixe}.pays-erreur` : undefined}
            className="min-h-11 w-full min-w-0 rounded-sm border border-muted bg-surface px-3 text-ink sm:w-64"
          >
            <option value="france">France</option>
            <option value={PAYS_AUTRE}>Autre pays</option>
          </select>
          {e("pays") ? <p id={`${prefixe}.pays-erreur`} role="alert" className="text-small font-medium text-ink">{e("pays")}</p> : null}
        </div>
      ) : null}
      {horsMetropole ? (
        <div className="sm:col-span-3">
          <ContactHorsMetropole />
        </div>
      ) : null}
    </fieldset>
  );
}
