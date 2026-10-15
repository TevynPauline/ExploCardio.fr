import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@generated/site/client";
import { hacher, PARAM_MOT_DE_PASSE, PARAM_VERSION } from "@/lib/demo/mot-de-passe-site";

// Paramètres du site de démonstration (T088) : mot de passe d'accès (haché) et numéro
// WhatsApp FICTIF (FR-033). Les paramètres sont conservés à la réinitialisation (FR-020) :
// ils ne sont créés que s'ils n'existent pas encore.

/** Numéro fictif : plage +33 6 99 réservée aux fictions, n'appartient à personne. */
export const WHATSAPP_FICTIF = "+33 6 99 00 00 00";

export async function remplirParametresDemo(db: PrismaClient): Promise<{ motDePasseSite: string | null }> {
  let motDePasseSite: string | null = null;
  const existant = await db.parametre.findUnique({ where: { cle: PARAM_MOT_DE_PASSE } });
  if (!existant) {
    motDePasseSite = process.env.DEMO_SITE_PASSWORD || randomBytes(9).toString("base64url");
    await db.parametre.create({ data: { cle: PARAM_MOT_DE_PASSE, valeur: await hacher(motDePasseSite), type: "secret" } });
    await db.parametre.create({ data: { cle: PARAM_VERSION, valeur: "1", type: "entier" } });
  }
  await db.parametre.upsert({
    where: { cle: "contact.whatsapp" },
    create: { cle: "contact.whatsapp", valeur: WHATSAPP_FICTIF },
    update: {},
  });
  return { motDePasseSite };
}
