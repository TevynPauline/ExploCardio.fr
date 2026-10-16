import { createHmac } from "node:crypto";
import { dbSite } from "@/lib/db/site";

// Limites d'envoi (FR-032, R6) : 5 envois par heure et par visiteur pour chaque formulaire.
// Le visiteur est identifié par l'EMPREINTE de son adresse IP (jamais l'adresse en clair).

export const LIMITE_PAR_HEURE = 5;
const FENETRE_MS = 60 * 60_000;

type Entetes = { get(nom: string): string | null };

/**
 * Adresse du visiteur : en-tête X-Forwarded-For seulement si TRUSTED_PROXY=1 (site derrière le
 * proxy de l'hébergeur, dernier saut ajouté par ce proxy), sinon X-Real-IP, sinon null.
 */
export function adresseVisiteur(entetes: Entetes, env: Record<string, string | undefined> = process.env): string | null {
  if (env.TRUSTED_PROXY === "1") {
    const sauts = (entetes.get("x-forwarded-for") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    if (sauts.length) return sauts[sauts.length - 1]!;
  }
  return entetes.get("x-real-ip");
}

export function empreinte(valeur: string): string {
  const secret = process.env.AUTH_SECRET ?? "";
  return createHmac("sha256", `limite:${secret}`).update(valeur).digest("base64url").slice(0, 32);
}

/**
 * Compte un envoi ; renvoie false si la limite est atteinte. `repli` sert d'identifiant quand
 * aucune adresse fiable n'est disponible (session du navigateur).
 */
export async function autoriserEnvoi(
  formulaire: string,
  adresse: string | null,
  repli: string,
  maintenant = new Date(),
  limite = LIMITE_PAR_HEURE,
): Promise<boolean> {
  const cle = `${formulaire}:${empreinte(adresse ?? `session:${repli}`)}`;
  return dbSite().$transaction(async (tx) => {
    const ligne = await tx.limiteEnvoi.findUnique({ where: { cle } });
    if (!ligne || maintenant.getTime() - ligne.fenetreDebut.getTime() > FENETRE_MS) {
      await tx.limiteEnvoi.upsert({ where: { cle }, create: { cle, fenetreDebut: maintenant, compte: 1 }, update: { fenetreDebut: maintenant, compte: 1 } });
      return true;
    }
    if (ligne.compte >= limite) return false;
    await tx.limiteEnvoi.update({ where: { cle }, data: { compte: { increment: 1 } } });
    return true;
  });
}

/** Supprime les lignes de plus de 24 heures (tâche quotidienne). */
export async function nettoyerLimites(maintenant = new Date()) {
  await dbSite().limiteEnvoi.deleteMany({ where: { fenetreDebut: { lt: new Date(maintenant.getTime() - 24 * 3600_000) } } });
}
