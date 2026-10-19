import { unstable_cache } from "next/cache";
import { registre } from "@/connecteurs/registre";
import { estErreurConnecteur } from "@/connecteurs/erreurs";
import type { PromotionAnnoncee } from "@/connecteurs/odoo/interfaces";
import { ETIQUETTES } from "@/lib/cache";
import type { MessageBandeau } from "../contenus";

// Promotions en cours (F06, US8, FR-030 à FR-034) : lues dans Odoo, annoncées dans le bandeau et
// sur les fiches. Cache d'une minute au plus ; les dates sont revérifiées à chaque affichage,
// pour qu'une promotion s'arrête à la minute de sa fin (SC-010).

type PromotionEnCache = Omit<PromotionAnnoncee, "fin"> & { fin: string | null };

const lirePromotions = unstable_cache(
  async (): Promise<PromotionEnCache[]> => {
    try {
      const promos = await registre.odoo().fidelite.promotionsEnCours(new Date());
      return promos.map((p) => ({ ...p, fin: p.fin?.toISOString() ?? null }));
    } catch (e) {
      if (estErreurConnecteur(e)) return [];
      throw e;
    }
  },
  ["fidelite:promotions"],
  { tags: [ETIQUETTES.fidelite, ETIQUETTES.prix], revalidate: 60 },
);

export async function promotionsEnCours(maintenant = new Date()): Promise<PromotionAnnoncee[]> {
  return (await lirePromotions())
    .filter((p) => !p.fin || new Date(p.fin) > maintenant)
    .map((p) => ({ ...p, fin: p.fin ? new Date(p.fin) : null }));
}

const finLisible = (d: Date) =>
  d.toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).replace(":", " h ");

/** Messages du bandeau pour les promotions en cours (après les messages éditoriaux). */
export async function messagesPromotions(maintenant = new Date()): Promise<MessageBandeau[]> {
  return (await promotionsEnCours(maintenant)).map((p) => ({
    id: `promotion:${p.nom}`,
    texte: `${p.nom}${p.type === "code_promo" && p.code && !p.nom.includes(p.code) ? ` avec le code ${p.code}` : ""}${p.fin ? `, jusqu’au ${finLisible(p.fin)}` : ""}`,
    lien: null,
  }));
}

/** Promotions qui touchent les références d'une fiche, avec prix d'origine et prix remisé HT. */
export async function promotionsDesReferences(defaultCodes: string[], maintenant = new Date()) {
  return (await promotionsEnCours(maintenant))
    .map((p) => ({ ...p, articles: p.articles.filter((a) => defaultCodes.includes(a.defaultCode)) }))
    .filter((p) => p.articles.length > 0);
}

/** À l'ajout au panier (A4) : promotion en cours sur une référence, lue sans cache. */
export async function promotionDe(defaultCode: string): Promise<string | null> {
  try {
    const promos = await registre.odoo().fidelite.promotionsEnCours(new Date());
    return promos.find((p) => p.articles.some((a) => a.defaultCode === defaultCode))?.nom ?? null;
  } catch (e) {
    if (estErreurConnecteur(e)) return null;
    throw e;
  }
}

export { finLisible };
