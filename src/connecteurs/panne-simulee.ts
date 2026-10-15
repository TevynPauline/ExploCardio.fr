import { dbSite } from "@/lib/db/site";
import { MESSAGE_REINITIALISATION, reinitialisationEnCours } from "@/lib/demo/verrou";
import type { NomConnecteur } from "@/lib/config";
import { ServiceUnavailable } from "./erreurs";
import type { ControleAvantAppel } from "./journal";

// Pannes simulées (FR-025) : en mode démonstration, chaque connecteur consulte l'état de sa
// panne et lève ServiceUnavailable si elle est active.

const NOMS: Record<NomConnecteur, string> = {
  odoo: "Odoo",
  stripe: "Stripe",
  pca: "plateforme Cloud PCA",
  emailing: "emailing",
};

export async function panneActive(connecteur: NomConnecteur): Promise<boolean> {
  const panne = await dbSite().panneSimulee.findUnique({ where: { connecteur } });
  return panne?.active ?? false;
}

export async function definirPanne(connecteur: NomConnecteur, active: boolean): Promise<void> {
  await dbSite().panneSimulee.upsert({
    where: { connecteur },
    create: { connecteur, active },
    update: { active },
  });
}

export function controlePanne(connecteur: NomConnecteur): ControleAvantAppel {
  return async () => {
    if (await reinitialisationEnCours()) {
      throw new ServiceUnavailable(NOMS[connecteur], { reinitialisation: true, message: MESSAGE_REINITIALISATION });
    }
    if (await panneActive(connecteur)) {
      throw new ServiceUnavailable(NOMS[connecteur], { panneSimulee: true });
    }
  };
}
