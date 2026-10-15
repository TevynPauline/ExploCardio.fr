import type { CatalogueOdoo } from "./catalogue";
import type { ClientsOdoo } from "./clients";
import type { CommandesOdoo } from "./commandes";
import type { FacturesOdoo } from "./factures";
import type { FideliteOdoo } from "./fidelite";
import type { LocationOdoo } from "./location";
import type { OpportunitesOdoo } from "./opportunites";
import type { StockOdoo } from "./stock";

export type * from "./catalogue";
export type * from "./clients";
export type * from "./commandes";
export type * from "./factures";
export type * from "./fidelite";
export type * from "./location";
export type * from "./opportunites";
export type * from "./stock";

/** Connecteur Odoo : huit domaines, chacun avec ses tests de contrat. */
export interface ConnecteurOdoo {
  catalogue: CatalogueOdoo;
  stock: StockOdoo;
  clients: ClientsOdoo;
  commandes: CommandesOdoo;
  factures: FacturesOdoo;
  location: LocationOdoo;
  fidelite: FideliteOdoo;
  opportunites: OpportunitesOdoo;
}

export const DOMAINES_ODOO = [
  "catalogue",
  "stock",
  "clients",
  "commandes",
  "factures",
  "location",
  "fidelite",
  "opportunites",
] as const satisfies readonly (keyof ConnecteurOdoo)[];
