import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import type { Cagnotte, ReglesProgramme, TypeMouvement } from "@/connecteurs/odoo/interfaces";
import { partenaireDuCompte } from "../commande/devis";

// « Mon compte › Bons d'achat » (F06, US5) : solde, prochaine expiration et historique, lus
// dans Odoo. Le solde est la somme de l'historique (SC-004) : le site ne calcule rien.

export const LIBELLES_MOUVEMENT: Record<TypeMouvement, string> = {
  credit: "Crédit",
  utilisation: "Utilisation",
  retrait: "Retrait",
  restitution: "Bons rendus",
  expiration: "Expiration",
  ajustement: "Ajustement",
};

export type CagnotteDuCompte = { cagnotte: Cagnotte | null; regles: ReglesProgramme | null; indisponible: boolean };

export async function cagnotteDetaillee(compteId: string): Promise<CagnotteDuCompte> {
  const partenaireRef = await partenaireDuCompte(compteId);
  try {
    const odoo = registre.odoo().fidelite;
    const [cagnotte, regles] = await Promise.all([partenaireRef ? odoo.lireCagnotte(partenaireRef) : null, odoo.lireReglesProgramme()]);
    return { cagnotte, regles, indisponible: false };
  } catch (e) {
    if (estErreurConnecteur(e)) return { cagnotte: null, regles: null, indisponible: true };
    throw e;
  }
}
