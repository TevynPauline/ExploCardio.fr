import { dbSite } from "@/lib/db/site";

// Verrou de réinitialisation (T058) : pendant l'opération, les connecteurs de démonstration
// répondent « service indisponible » avec un message d'attente, au lieu de montrer un état
// partiel ; une commande en cours est interrompue avec un message au testeur.
// Le verrou expire seul au bout de 5 minutes (sécurité si l'opération est interrompue).

const CLE = "demo.reinitialisation_en_cours";
const DUREE_MAX_MS = 5 * 60_000;

export const MESSAGE_REINITIALISATION =
  "La démonstration est en cours de réinitialisation. Réessayez dans une minute.";

export async function poserVerrou(): Promise<void> {
  await dbSite().parametre.upsert({
    where: { cle: CLE },
    create: { cle: CLE, valeur: new Date().toISOString(), type: "systeme" },
    update: { valeur: new Date().toISOString() },
  });
}

export async function leverVerrou(): Promise<void> {
  await dbSite().parametre.deleteMany({ where: { cle: CLE } });
}

export async function reinitialisationEnCours(): Promise<boolean> {
  const p = await dbSite().parametre.findUnique({ where: { cle: CLE } });
  return Boolean(p && Date.now() - new Date(p.valeur).getTime() < DUREE_MAX_MS);
}
