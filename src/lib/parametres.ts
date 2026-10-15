import { dbSite } from "@/lib/db/site";

// Paramètres de fonctionnement du site (principe VI), modifiables dans le back-office (F13).
// Les règles commerciales n'y figurent jamais : elles sont dans Odoo (base fictive en phase 1).

export const PARAMETRES_PAR_DEFAUT = {
  /** Nombre d'échecs successifs d'une tâche avant alerte à l'administrateur (T018). */
  "file_attente.seuil_alerte": "5",
} as const;

export type CleParametre = keyof typeof PARAMETRES_PAR_DEFAUT | (string & {});

export async function lireParametre(cle: CleParametre, defaut?: string): Promise<string | null> {
  const p = await dbSite().parametre.findUnique({ where: { cle } });
  if (p) return p.valeur;
  return (PARAMETRES_PAR_DEFAUT as Record<string, string>)[cle] ?? defaut ?? null;
}

export async function lireParametreEntier(cle: CleParametre, defaut: number): Promise<number> {
  const v = Number.parseInt((await lireParametre(cle)) ?? "", 10);
  return Number.isFinite(v) ? v : defaut;
}

/** Modifie un paramètre et conserve l'historique (auteur, date, ancienne et nouvelle valeur). */
export async function ecrireParametre(cle: string, valeur: string, auteurId: string | null): Promise<void> {
  await dbSite().$transaction(async (tx) => {
    const avant = await tx.parametre.findUnique({ where: { cle } });
    await tx.parametre.upsert({ where: { cle }, create: { cle, valeur }, update: { valeur } });
    await tx.historiqueParametre.create({
      data: { cle, auteurId, ancienneValeur: avant?.valeur ?? null, nouvelleValeur: valeur },
    });
  });
}
