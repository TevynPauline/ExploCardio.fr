import type { Prisma } from "@generated/demo/client";
import type { Disponibilite, EtatDisponibilite } from "../interfaces";
import { db, joursEntre } from "./outils";

// Calcul de la disponibilité à partir du stock et du parc de la base de démonstration.

export const INCLURE_DISPONIBILITE = {
  stock: true,
  offreMad: true,
  numerosSerie: true,
} as const satisfies Prisma.VarianteInclude;

type VarianteAvecStock = Prisma.VarianteGetPayload<{ include: typeof INCLURE_DISPONIBILITE }>;

export function disponibiliteAchat(v: VarianteAvecStock): EtatDisponibilite {
  const stock = v.stock;
  if (stock && stock.quantite > 0) return { etat: "disponible" };
  if (stock?.etatHorsStock === "indisponible") return { etat: "indisponible" };
  return { etat: "delai", delaiJours: stock?.delaiJours ?? 15 };
}

export function disponibiliteParc(v: VarianteAvecStock, maintenant = new Date()): EtatDisponibilite | null {
  if (!v.offreMad) return null;
  // F12 : abonnement à un logiciel Cloud, sans appareil, toujours disponible.
  if (v.offreMad.logiciel === v.defaultCode) return { etat: "disponible" };
  if (v.numerosSerie.some((n) => n.statut === "disponible")) return { etat: "disponible" };
  const retours = v.numerosSerie
    .filter((n) => (n.statut === "en_retour" || n.statut === "en_maintenance") && n.retourPrevu)
    .map((n) => n.retourPrevu as Date)
    .sort((a, b) => a.getTime() - b.getTime());
  const premier = retours[0];
  if (premier) return { etat: "delai", delaiJours: Math.max(1, joursEntre(maintenant, premier)) };
  return { etat: "indisponible" };
}

export function disponibilite(v: VarianteAvecStock): Disponibilite {
  return {
    defaultCode: v.defaultCode,
    achat: disponibiliteAchat(v),
    quantiteDisponible: v.stock?.quantite ?? 0,
    delaiReassortJours: v.stock?.etatHorsStock === "indisponible" ? null : (v.stock?.delaiJours ?? 15),
    miseADisposition: disponibiliteParc(v),
  };
}

/** La moins bonne de deux disponibilités : indisponible, puis le délai le plus long. */
export function moinsBonne(a: EtatDisponibilite, b: EtatDisponibilite): EtatDisponibilite {
  if (a.etat === "indisponible" || b.etat === "indisponible") return { etat: "indisponible" };
  if (a.etat === "delai" || b.etat === "delai") {
    return { etat: "delai", delaiJours: Math.max(a.etat === "delai" ? a.delaiJours : 0, b.etat === "delai" ? b.delaiJours : 0) };
  }
  return { etat: "disponible" };
}

/**
 * Disponibilité à l'achat de chaque variante, en tenant compte des packs (F03) : un pack n'est
 * pas plus disponible que le moins disponible de ses composants (nomenclature « kit » d'Odoo).
 */
export async function etatsAchat(variantes: (VarianteAvecStock & { composants: string[] })[]): Promise<Map<string, EtatDisponibilite>> {
  const etats = new Map(variantes.map((v) => [v.defaultCode, disponibiliteAchat(v)] as const));
  const manquants = [...new Set(variantes.flatMap((v) => v.composants))].filter((c) => !etats.has(c));
  if (manquants.length) {
    const autres = await db().variante.findMany({ where: { defaultCode: { in: manquants } }, include: INCLURE_DISPONIBILITE });
    for (const a of autres) etats.set(a.defaultCode, disponibiliteAchat(a));
  }
  const resultat = new Map<string, EtatDisponibilite>();
  for (const v of variantes) {
    resultat.set(v.defaultCode, v.composants.reduce((e, c) => moinsBonne(e, etats.get(c) ?? { etat: "indisponible" }), etats.get(v.defaultCode)!));
  }
  return resultat;
}
