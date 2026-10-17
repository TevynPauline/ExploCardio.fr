import { lireParametre } from "@/lib/parametres";
import { centimesDepuisSaisie } from "@/lib/montants";
import { Prix } from "./Prix";

export type CleService = "hebergement" | "assistance" | "financement" | "installation";

/** Tarif HT standard d'une page service (FR-034), réglé au back-office ; TTC à 20 % en complément. */
export async function TarifService({ cle }: { cle: CleService }) {
  const saisie = (await lireParametre(`services.${cle}.tarif`))?.trim();
  const centimes = saisie ? centimesDepuisSaisie(saisie) : null;
  if (!centimes || centimes <= 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <p className="font-semibold text-ink">Tarif</p>
      <Prix ht={centimes} tauxTva={20} aPartirDe />
    </div>
  );
}
