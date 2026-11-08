# Data Model: F14 — Branchement d'Odoo (lot 1)

F14 ne crée **aucune table** dans la base du site, sauf un paramètre de fonctionnement. Il
relie les types existants du connecteur (`src/connecteurs/odoo/interfaces/`) aux modèles
d'Odoo 20. Le détail champ par champ est dans [contracts/odoo-reel.md](contracts/odoo-reel.md).

## Modèles Odoo lus (lot 1)

| Modèle Odoo | Rôle | Champs utilisés |
|---|---|---|
| `product.template` | modèle d'article | `name`, `categ_id`, `sale_ok`, `active`, `type`, `is_storable`, `tracking`, `description_sale`, `taxes_id`, `product_properties`, `seller_ids`, `product_variant_ids` |
| `product.product` | variante | `default_code`, `barcode`, `lst_price`, `product_template_attribute_value_ids`, `free_qty` (contexte entrepôt), `active` |
| `product.template.attribute.value` | valeur d'attribut d'une variante | `attribute_id.name`, `name` |
| `product.category` | catégorie | `name`, `complete_name`, `parent_id`, `child_id`, `product_properties_definition` |
| `product.pricelist` / `product.pricelist.item` | prix client, paliers | voir R5 |
| `product.supplierinfo` | délai de réassort | `delay`, `product_code` (référence fabricant) |
| `account.tax` | taux de TVA | `amount`, `price_include` |
| `stock.warehouse` | entrepôt du stock affiché | `code = WH` |
| `stock.lot` | appareils du parc (numéros de série) | `name`, `product_id`, `location_id`, `product_qty` |
| `res.partner` | client (prix client, contrôle) | `ref`, `property_product_pricelist`, `l10n_fr_siret` |
| `ir.config_parameter` | garde de neutralisation | `database.is_neutralized` |

## Identifiants

- **Référence d'article** (`reference`) = `default_code` de la **première variante active**
  (ordre d'Odoo), comme en démonstration.
- **Référence de variante** (`defaultCode`) = `default_code` de la variante ; unique, non
  vide. Une variante sans référence n'est pas proposée et figure au rapport de contrôle.
- **Référence de partenaire** (`partenaireRef`) = champ `ref` du partenaire Odoo (posé par le
  lot 2) ; en lot 1, utilisée seulement pour le prix client.
- **Code de catégorie du site** = code fixe de la rubrique (`holter-ecg`, `mapa`, `effort`,
  `ecg-repos`, `accessoires`), obtenu par la correspondance (R3).

## Paramètre de fonctionnement ajouté (base du site)

| Clé | Valeur | Défaut |
|---|---|---|
| `catalogue.correspondance_categories` | JSON `{ "<chemin complet de la catégorie Odoo>": "<code rubrique>" }` ; une catégorie inclut ses sous-catégories ; la plus précise l'emporte | `{"Holter ECG":"holter-ecg","MAPA":"mapa","ERGOS":"effort","Consommables":"accessoires"}` |

Le paramètre n'est lu qu'en mode réel ; en démonstration, la base fictive porte déjà le code
de rubrique.

## Propriétés produit attendues dans Odoo

Définies sur chaque catégorie Odoo reliée à une rubrique (`product_properties_definition`).
Noms affichés exacts, insensibles à la casse et aux accents :

| Propriété | Type Odoo | Champ du connecteur | Obligatoire |
|---|---|---|---|
| Marque | texte | `marque` | oui |
| Type d'article | sélection : Équipement, Consommable, Accessoire, Logiciel, Service | `type` | oui |
| Quantité par lot | entier | `quantiteParLot` | non (1) |
| Mise à disposition – premier mois HT | monétaire | `offreMiseADisposition.premierMoisHt` | si l'article est proposé en mise à disposition |
| Mise à disposition – mois suivants HT | monétaire | `offreMiseADisposition.moisSuivantsHt` | idem |
| Valeur de remplacement HT | monétaire | `offreMiseADisposition.valeurRemplacementHt` | idem |
| Kit requis | texte (référence) | `offreMiseADisposition.kitRequis` | non |
| Logiciel Cloud | texte (référence) | `offreMiseADisposition.logiciel` | non |
| Éligible aux bons d'achat | case | `eligibleBonsAchat` | non (faux) ; sans effet à l'ouverture (FR-026) |

Un article est « proposé en mise à disposition » dès que la propriété « premier mois HT » est
renseignée ; les trois propriétés monétaires deviennent alors obligatoires.

## Anomalie (rapport de contrôle)

| Champ | Description |
|---|---|
| `objet` | `article`, `variante`, `categorie`, `regle_prix`, `client` |
| `reference` | référence Odoo ou identifiant lisible |
| `nom` | libellé pour l'équipe |
| `code` | `SANS_REFERENCE`, `REFERENCE_EN_DOUBLE`, `SANS_PRIX`, `SANS_TVA`, `CATEGORIE_NON_RELIEE`, `PROPRIETE_MANQUANTE`, `OFFRE_INCOMPLETE`, `SANS_NUMERO_SERIE`, `REGLE_PRIX_NON_GEREE`, `CLIENT_SANS_SIRET`, `SIRET_EN_DOUBLE` |
| `detail` | précision (nom de la propriété manquante, règle concernée…) |
| `bloquant` | vrai si l'article ne peut pas être affiché |

Règles de validation : un article est **affichable** si aucune de ses anomalies n'est
bloquante. Sont bloquantes : `SANS_REFERENCE`, `REFERENCE_EN_DOUBLE`, `SANS_PRIX`,
`SANS_TVA`, `CATEGORIE_NON_RELIEE`, `PROPRIETE_MANQUANTE` (marque, type). `OFFRE_INCOMPLETE`
retire seulement la formule « mise à disposition ».
