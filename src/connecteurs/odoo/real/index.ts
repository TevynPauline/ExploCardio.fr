import type { ConnecteurOdoo } from "../interfaces";
import { DOMAINES_ODOO } from "../interfaces";
import { implementationRefusee } from "../../non-livre";
import { environnementOdoo } from "@/lib/config";
import { ClientOdoo } from "./client";
import { lireCorrespondance, type Correspondance } from "./correspondance";
import { creerCatalogueReel } from "./catalogue";
import { creerClientsReels } from "./clients";
import { creerCommandesReelles } from "./commandes";
import { creerEcritures, type StockageEcritures } from "./ecritures";
import { creerOpportunitesReelles } from "./opportunites";
import { creerLecteurInstantane } from "./instantane";
import { creerGardeNeutralisation } from "./neutralisation";
import { creerStockReel } from "./stock";

// Mode réel d'Odoo (F14). Lot 1 : catalogue et lectures du stock ; lot 2 : clients et
// opportunités ; lot 3 : panier, commandes, devis enregistrés, réservations avant paiement. Les autres domaines lèvent ConfigurationIncomplete tant que leur lot n'est pas livré.

type Env = Record<string, string | undefined>;

export type OptionsOdooReel = {
  /** Correspondance catégories → rubriques ; par défaut, le paramètre du back-office. */
  correspondance?: () => Promise<Correspondance>;
  fetch?: typeof fetch;
  /** Trace des écritures (D1) ; par défaut, la base du site. */
  stockageEcritures?: StockageEcritures;
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
  const ecritures = creerEcritures(env.ODOO_DATABASE!, options.stockageEcritures);
  return {
    ...refuse,
    catalogue: creerCatalogueReel(client, instantane),
    stock: creerStockReel(instantane),
    clients: creerClientsReels(client, ecritures),
    commandes: creerCommandesReelles(client, instantane, ecritures),
    opportunites: creerOpportunitesReelles(client, ecritures),
  };
}
