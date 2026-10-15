import type { Cle, MarqueFictive } from "../../types";
import type { ResumeCommande } from "./commandes";
import type { ResumeFacture } from "./factures";
import type { Location } from "./location";
import type { DroitsAssistance } from "./fidelite";

// Domaine « Clients » du connecteur Odoo (contracts/odoo.md §3).

export type AdressePartenaire = {
  type: "cabinet" | "livraison" | "facturation";
  ligne1: string;
  ligne2?: string;
  codePostal: string;
  ville: string;
};

export type IdentitePartenaire = {
  nom: string;
  email: string;
  telephone?: string;
  rpps?: string;
  siret?: string;
  cabinet?: string;
  adresses: AdressePartenaire[];
};

export type Partenaire = MarqueFictive & {
  ref: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  rpps: string | null;
  siret: string | null;
  adresses: AdressePartenaire[];
};

export type SituationClient = {
  partenaire: Partenaire;
  commandesRecentes: ResumeCommande[];
  factures: ResumeFacture[];
  locations: Location[];
  droitsAssistance: DroitsAssistance;
};

export interface ClientsOdoo {
  /** Sans doublon : même RPPS/SIRET ou même clé → même partenaire. */
  creerOuRetrouverPartenaire(
    identite: IdentitePartenaire,
    cle: Cle,
  ): Promise<{ ref: string; cree: boolean }>;
  mettreAJourCoordonnees(
    ref: string,
    coordonnees: Partial<Omit<IdentitePartenaire, "rpps" | "siret">>,
  ): Promise<void>;
  lireSituation(ref: string): Promise<SituationClient>;
}
