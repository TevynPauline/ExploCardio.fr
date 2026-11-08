import type { ConnecteurOdoo } from "../interfaces";
import { DOMAINES_ODOO } from "../interfaces";
import { implementationRefusee } from "../../non-livre";
import { environnementOdoo } from "@/lib/config";
import { ClientOdoo } from "./client";
import { lireCorrespondance, type Correspondance } from "./correspondance";
import { creerCatalogueReel } from "./catalogue";
import { creerLecteurInstantane } from "./instantane";
import { creerGardeNeutralisation } from "./neutralisation";
import { creerStockReel } from "./stock";

// Mode réel d'Odoo (F14). Lot 1 : catalogue et lectures du stock. Les autres domaines, et les
// écritures, lèvent ConfigurationIncomplete tant que leur lot n'est pas livré.

type Env = Record<string, string | undefined>;

export type OptionsOdooReel = {
  /** Correspondance catégories → rubriques ; par défaut, le paramètre du back-office. */
  correspondance?: () => Promise<Correspondance>;
  fetch?: typeof fetch;
};

async function correspondanceDuSite(): Promise<Correspondance> {
  // Import différé : la base du site n'est chargée qu'en mode réel.
  const { lireParametre } = await import("@/lib/parametres");
  return lireCorrespondance(await lireParametre("catalogue.correspondance_categories"));
}

export function creerOdooReel(variablesManquantes: string[], env: Env = process.env, options: OptionsOdooReel = {}): ConnecteurOdoo {
  const refuse = Object.fromEntries(
    DOMAINES_ODOO.map((domaine) => [domaine, implementationRefusee("odoo", variablesManquantes)]),
  ) as unknown as ConnecteurOdoo;
  if (variablesManquantes.length) return refuse;

  const garde = creerGardeNeutralisation(environnementOdoo(env)!);
  const client = new ClientOdoo({
    url: env.ODOO_URL!,
    base: env.ODOO_DATABASE!,
    utilisateur: env.ODOO_USER!,
    cle: env.ODOO_API_KEY!,
    avantEcriture: garde,
    fetch: options.fetch,
  });
  const instantane = creerLecteurInstantane(client, options.correspondance ?? correspondanceDuSite);
  return { ...refuse, catalogue: creerCatalogueReel(client, instantane), stock: creerStockReel(instantane) };
}
