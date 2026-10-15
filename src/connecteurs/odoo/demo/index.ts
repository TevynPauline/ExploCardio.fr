import type { ConnecteurOdoo } from "../interfaces";
import { catalogueDemo } from "./catalogue";
import { clientsDemo } from "./clients";
import { commandesDemo } from "./commandes";
import { facturesDemo } from "./factures";
import { fideliteDemo } from "./fidelite";
import { locationDemo } from "./location";
import { opportunitesDemo } from "./opportunites";
import { stockDemo } from "./stock";

// Connecteur Odoo de démonstration : lit et écrit dans la base de démonstration (FR-009).

export function creerOdooDemo(): ConnecteurOdoo {
  return {
    catalogue: catalogueDemo,
    stock: stockDemo,
    clients: clientsDemo,
    commandes: commandesDemo,
    factures: facturesDemo,
    location: locationDemo,
    fidelite: fideliteDemo,
    opportunites: opportunitesDemo,
  };
}
