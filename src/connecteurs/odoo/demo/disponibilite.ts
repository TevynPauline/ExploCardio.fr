import type { Prisma } from "@generated/demo/client";
import type { Disponibilite, EtatDisponibilite } from "../interfaces";
import { joursEntre } from "./outils";

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
    miseADisposition: disponibiliteParc(v),
  };
}
