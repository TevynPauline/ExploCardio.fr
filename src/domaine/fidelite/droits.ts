import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import type { DroitsAssistance, Intervention, ReglesProgramme } from "@/connecteurs/odoo/interfaces";
import { partenaireDuCompte } from "../commande/devis";

// « Mon compte › Droits d'assistance » (F06, US5, US9) : statut, fin, origine, historique, règles
// en vigueur et interventions payées à l'acte, lus dans Odoo.

export type AssistanceDuCompte = { droits: DroitsAssistance | null; regles: ReglesProgramme | null; interventions: Intervention[]; indisponible: boolean };

export async function assistanceDuCompte(compteId: string): Promise<AssistanceDuCompte> {
  const partenaireRef = await partenaireDuCompte(compteId);
  try {
    const odoo = registre.odoo().fidelite;
    const [droits, regles, interventions] = await Promise.all([
      partenaireRef ? odoo.lireDroitsAssistance(partenaireRef) : null,
      odoo.lireReglesProgramme(),
      partenaireRef ? odoo.listerInterventions(partenaireRef) : [],
    ]);
    return { droits, regles, interventions, indisponible: false };
  } catch (e) {
    if (estErreurConnecteur(e)) return { droits: null, regles: null, interventions: [], indisponible: true };
    throw e;
  }
}

/** Paliers en clair : « 5 % de 500 € à 1 000 € HT », pour expliquer le programme (FR-029). */
export function paliersEnClair(regles: ReglesProgramme): string[] {
  const euros = (c: number) => `${(c / 100).toLocaleString("fr-FR")} €`;
  return regles.paliers
    .filter((p) => p.tauxPourcent > 0)
    .map((p, i, liste) => {
      const suivant = liste[i + 1];
      return suivant
        ? `${p.tauxPourcent} % de ${euros(p.plancherHt)} à ${euros(suivant.plancherHt)} HT`
        : `${p.tauxPourcent} % ${p.inclusif ? "à partir de" : "au-delà de"} ${euros(p.plancherHt)} HT`;
    });
}

/** Article de l'assistance à l'acte dans Odoo (FR-013). */
export const ARTICLE_ASSISTANCE_ACTE = "EC-ASSISTANCE-ACTE";

/** L'assistance à l'acte n'est proposée qu'aux clients validés sans droits actifs (D5). */
export async function peutAcheterAssistance(compteId: string): Promise<boolean> {
  const { dbSite } = await import("@/lib/db/site");
  const c = await dbSite().compteClient.findUnique({ where: { id: compteId }, select: { statut: true } });
  if (c?.statut !== "valide") return false;
  const { droits, indisponible } = await assistanceDuCompte(compteId);
  return !indisponible && droits?.statut !== "actif";
}
