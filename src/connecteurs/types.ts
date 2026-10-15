// Types partagés par les contrats des connecteurs.
// Montants : entiers en centimes d'euro, HT sauf mention TTC (contracts/odoo.md).

export type Centimes = number;

/** Marque portée par tout objet issu de la base de démonstration (FR-017). */
export type MarqueFictive = { estFictif: boolean };

/** Clé d'idempotence fournie par l'appelant pour toute écriture (contracts/common.md). */
export type Cle = string;
