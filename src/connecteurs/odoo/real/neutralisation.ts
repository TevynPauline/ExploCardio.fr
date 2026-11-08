import type { EnvironnementOdoo } from "@/lib/config";
import { OperationRefusee } from "../../erreurs";
import type { ClientOdoo } from "./client";

// Garde de neutralisation (F14, FR-005, research R8). Odoo pose `database.is_neutralized = True`
// quand une copie est neutralisée (emails et tâches automatiques coupés).
// - recette : écriture permise seulement si la base est neutralisée (sinon, ou illisible : refus) ;
// - production : écriture refusée si la base est neutralisée (copie branchée par erreur).
// Le paramètre est lu une seule fois par processus.

export type Signaler = (message: string) => void;

export function creerGardeNeutralisation(environnement: EnvironnementOdoo, signaler: Signaler = (m) => console.error(m)) {
  let etat: Promise<boolean | null> | null = null;

  const lire = (client: ClientOdoo) =>
    (etat ??= client
      .searchRead("ir.config_parameter", [["key", "=", "database.is_neutralized"]], ["value"])
      .then((l) => (l.length ? String(l[0]!.value).toLowerCase() === "true" : false))
      .catch(() => null));

  return async function verifierEcriturePermise(client: ClientOdoo): Promise<void> {
    const neutralisee = await lire(client);
    if (environnement === "recette" && neutralisee !== true) {
      throw new OperationRefusee(
        neutralisee === null
          ? "Écriture refusée : impossible de vérifier que la base Odoo de recette est neutralisée."
          : "Écriture refusée : la base Odoo de recette n'est pas neutralisée.",
        { cause: "base_non_neutralisee", environnement },
      );
    }
    if (environnement === "production" && neutralisee === true) {
      signaler("[odoo] base de test branchée en production : écritures refusées.");
      throw new OperationRefusee("Écriture refusée : la base Odoo branchée en production est une copie neutralisée.", {
        cause: "base_de_test_en_production",
        environnement,
      });
    }
  };
}
