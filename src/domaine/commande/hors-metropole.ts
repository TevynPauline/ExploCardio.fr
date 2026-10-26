import { cookies } from "next/headers";
import { compteConnecte } from "../comptes/session";
import { COOKIE_PANIER, panierPour } from "../catalogue/panier";
import { panierDetaille } from "./devis";

// Commande hors métropole (F16, US8, FR-029) : le formulaire de contact reprend le contenu du
// panier, lu ici côté serveur (rien ne passe dans l'adresse de la page). Aucune donnée de patient.

const FORMULES = { achat: "achat", mise_a_disposition: "mise à disposition" } as const;

export async function messageHorsMetropole(): Promise<string> {
  const compte = await compteConnecte();
  const jeton = (await cookies()).get(COOKIE_PANIER)?.value;
  const panier = await panierPour(compte ? { compteId: compte.id } : { jeton }, false);
  const detail = panier ? await panierDetaille(panier.id, compte?.id ?? null) : null;
  const lignes = (detail?.lignes ?? []).map((l) => `- ${l.quantite} × ${l.libelle} (${l.defaultCode}, ${FORMULES[l.formule]})`);
  return [
    "Bonjour,",
    "",
    "Je souhaite commander pour une livraison hors de France métropolitaine.",
    "Pays et ville de livraison : ",
    ...(lignes.length ? ["", "Contenu de mon panier :", ...lignes] : []),
  ].join("\n");
}
