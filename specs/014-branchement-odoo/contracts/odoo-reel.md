# Contrat : mode réel du connecteur Odoo — lot 1 (lecture du catalogue)

Les signatures, types et erreurs sont ceux du contrat commun
([../../011-connecteurs-base-demonstration/contracts/odoo.md](../../011-connecteurs-base-demonstration/contracts/odoo.md)
§1 et §2, compléments de F03). Ce document dit **d'où vient chaque valeur** en mode réel.
Seule nouveauté de contrat : l'opération `catalogue.controlerDonnees`, disponible dans les deux
modes.

## Configuration

| Variable | Rôle | Exemple |
|---|---|---|
| `CONNECTOR_ODOO` | `real` | — |
| `ODOO_URL` | adresse de la base | `https://<copie>.odoo.com` |
| `ODOO_DATABASE` | nom de la base | `<nom de la copie>` |
| `ODOO_USER` | identifiant de connexion (email) | — |
| `ODOO_API_KEY` | clé API, scope RPC (secret) | — |
| `ODOO_ENVIRONNEMENT` | `recette` ou `production` ; **ajoutée à la liste des variables exigées** | `recette` |

## Catalogue

| Opération | Source en mode réel |
|---|---|
| `listerCategories` | les cinq rubriques fixes du site (comme en démonstration), sans appel à Odoo ; `parentCode` = `null` ; une rubrique sans catégorie Odoo reliée est simplement vide |
| `listerArticles(categorie, filtres)` | modèles dont la catégorie est reliée à `categorie`, affichables (data-model, Anomalie) ; `prixAPartirDeHt` = plus petit prix HT des variantes (liste par défaut) ; filtres appliqués sur `marque`, `type`, `disponibilite` |
| `lireArticle(reference)` | modèle dont une variante porte `default_code = reference` ou dont la première variante la porte ; `NotFound` si absent, inactif, non vendable ou non affichable |
| `lirePrixClient(partenaireRef, references)` | liste de prix du partenaire (`property_product_pricelist`), à défaut liste par défaut ; règles appliquées selon R5 ; `prixCatalogueHt` = prix de la liste par défaut ; `remisePourcent` = remise si la règle est une remise, sinon calculée ; `NotFound` si le partenaire est inconnu |
| `rechercher(texte)` | recherche insensible à la casse sur nom du modèle, `default_code`, référence fabricant et marque, parmi les articles affichables |
| `listerReferences` | une ligne par variante affichable |
| `controlerDonnees()` | **nouveau** : liste des anomalies (data-model, Anomalie), triée bloquantes d'abord ; en démonstration, calculée sur la base fictive |

### Champs d'un article

| Champ | Source |
|---|---|
| `nom` | `product.template.name` |
| `marque` | propriété « Marque » |
| `type` | propriété « Type d'article » |
| `categorie` | code de rubrique (correspondance) |
| `description` | `description_sale` (texte brut) ; le texte de fiche du back-office reste prioritaire à l'affichage, comme aujourd'hui |
| `formules` | `achat` si `sale_ok` ; `mise_a_disposition` si l'offre est complète ; `financement` si un barème existe (vide au lot 1, question 5) |
| `suiviNumeroSerie` | `tracking = serial` |
| `eligibleBonsAchat` | propriété « Éligible aux bons d'achat » |
| `compatibleAvec` | `[]` (les compatibilités sont tenues dans le back-office du site) |
| `baremeFinancement` | `[]` au lot 1 |
| `referenceFictive`, `prixInvente`, `estFictif` | toujours `false` |

### Champs d'une variante

| Champ | Source |
|---|---|
| `defaultCode` | `default_code` |
| `referenceFabricant` | `product_code` du fournisseur principal, sinon `barcode`, sinon `null` |
| `configuration` | valeurs d'attributs jointes par « , » (ex. « Taille 1 (18-26 cm), Raccord rapide ») ; `null` sans attribut |
| `attributs` | `{ nom de l'attribut : valeur }` |
| `prixHt` | `lst_price` (prix de vente + suppléments de variante), arrondi au centime |
| `tauxTva` | somme des taux des taxes de vente hors taxes ; `SANS_TVA` si aucune |
| `offreMiseADisposition` | propriétés de mise à disposition, montants en centimes ; `contenuPack` = `[]` |
| `quantiteParLot` | propriété « Quantité par lot », défaut 1 |
| `paliers` | règles de la liste par défaut à quantité minimale > 1 sur cette variante ou son modèle, triées |
| `mensualitesForcees` | `[]` au lot 1 |
| `composants` | `[]` au lot 1 (question 4) |
| `logicielInclus` | `null` au lot 1 |

## Stock (lecture)

| Opération | Source en mode réel |
|---|---|
| `lireDisponibilite(references)` | R6 : `free_qty` dans l'entrepôt `WH` ; `delai` = `seller_ids[0].delay` jours ; `quantiteDisponible` = `free_qty` ; `delaiReassortJours` = ce délai ou `null` ; `miseADisposition` = `null` si l'article n'est pas proposé en mise à disposition, sinon `disponible` s'il existe un numéro de série libre en stock, sinon `indisponible` |
| `reserver`, `liberer`, `lireDisponibiliteParc`, `reserverAppareil`, `libererAppareil` | lots 3 et 4 : `ConfigurationIncomplete` au lot 1 |

## Erreurs (R9)

| Situation Odoo | Erreur du connecteur |
|---|---|
| réseau, délai > 10 s, HTTP 429, 502, 503 (après 2 nouvelles tentatives en lecture) | `ServiceUnavailable` |
| authentification refusée (clé révoquée, expirée, identifiant faux) | `ServiceUnavailable`, détail `{ cause: "acces_refuse" }` |
| droit insuffisant sur un modèle | `ServiceUnavailable`, détail `{ cause: "droit_insuffisant", modele }` |
| référence ou partenaire introuvable | `NotFound` |
| écriture en recette sur une base non neutralisée, ou en production sur une base neutralisée | `OperationRefused` |
| variable manquante, domaine non livré | `ConfigurationIncomplete` |

Aucun message d'erreur, détail ou ligne de journal ne contient la clé API.
