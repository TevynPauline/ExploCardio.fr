import { dbSite } from "@/lib/db/site";
import type { CommandeSite } from "@generated/site/client";
import { lignesDe } from "./tunnel";

/** Retire du panier du compte les lignes commandées d'une formule (achat ou mise à disposition). */
export async function retirerDuPanier(commande: CommandeSite, formule: "achat" | "mise_a_disposition") {
  const panier = await dbSite().panier.findUnique({ where: { compteId: commande.compteId } });
  if (!panier) return;
  const codes = lignesDe(commande).filter((l) => l.formule === formule).map((l) => l.defaultCode);
  await dbSite().lignePanier.deleteMany({ where: { panierId: panier.id, formule, defaultCode: { in: codes } } });
  if (formule === "achat") await dbSite().panier.update({ where: { id: panier.id }, data: { codePromo: null } });
}
