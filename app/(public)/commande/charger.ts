import { redirect } from "next/navigation";
import { compteCourant } from "@/domaine/comptes/session";
import { TunnelRefuse, commandeDuCompte, ouvrirCommande } from "@/domaine/commande/tunnel";

/** Commande du site de la page (par sa référence, ou ouverte depuis le panier). */
export async function chargerCommande(chemin: string, ref: string | undefined) {
  const { compte } = await compteCourant(chemin);
  if (ref) {
    const c = await commandeDuCompte(compte.id, ref);
    if (c) return { compte, commande: c };
  }
  try {
    return { compte, commande: await ouvrirCommande(compte.id) };
  } catch (e) {
    if (e instanceof TunnelRefuse) {
      return { compte, refus: e };
    }
    throw e;
  }
}

export function exigerEtape(ok: boolean, chemin: string) {
  if (!ok) redirect(chemin);
}
