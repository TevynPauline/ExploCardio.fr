# Contrat du connecteur Odoo

Découpé en huit domaines. Chaque domaine est une interface distincte, avec ses propres tests
de contrat. Les montants sont en euros, HT sauf mention TTC ; les objets reprennent le
vocabulaire d'Odoo (voir [../data-model.md](../data-model.md)).

## 1. Catalogue

| Opération | Entrée | Sortie | Erreurs | Utilisée par |
|---|---|---|---|---|
| Lister les catégories | — | catégories | `ServiceUnavailable` | F01, F03 |
| Lister les articles d'une catégorie | catégorie, filtres (marque, type, disponibilité) | articles avec prix « à partir de », formules, disponibilité | `ServiceUnavailable` | F03 |
| Lire un article | référence | modèle, variantes, prix HT, TVA, formules, offres de mise à disposition, barème de financement ; par variante (F03) : quantité par lot, paliers dégressifs, mensualités de financement forcées pour tous, composants d'un pack | `NotFound`, `ServiceUnavailable` | F03, F13 |
| Lire les prix d'un client | client, références | prix applicables (liste de prix, remises) et mensualités de financement forcées pour ce client, par durée (F03) | `NotFound` | F03, F04 |
| Rechercher | texte, référence | articles correspondants | `ServiceUnavailable` | F01 |
| Lister les références | — | une ligne par variante : référence interne, référence fabricant, référence de l'article, nom, marque, type, catégorie, configuration, prix HT, disponibilité, marque « fictif » | `ServiceUnavailable` | F01 (index de recherche), F03 |

Détail des champs ajoutés par F03 : [../../003-catalogue-fiches-produit/contracts/odoo.md](../../003-catalogue-fiches-produit/contracts/odoo.md).

## 2. Stock et parc

| Opération | Entrée | Sortie | Erreurs | Utilisée par |
|---|---|---|---|---|
| Lire la disponibilité | références | état (`disponible`, `delai` avec jours, `indisponible`) par formule | `ServiceUnavailable` | F03, F04 |
| Réserver | références, quantités, clé | réservation | `OutOfStock` | F04 |
| Lire la disponibilité du parc | article, date souhaitée | première date de livraison possible | `ServiceUnavailable` | F05 |

## 3. Clients

| Opération | Entrée | Sortie | Erreurs | Utilisée par |
|---|---|---|---|---|
| Créer ou retrouver un partenaire | identité, RPPS ou SIRET, cabinet, adresses, clé | référence du partenaire | `ServiceUnavailable` | F02, F13 |
| Mettre à jour les coordonnées | partenaire, coordonnées | — | `NotFound` | F02 |
| Lire la situation d'un client | partenaire | commandes récentes, factures, locations, droits d'assistance | `NotFound` | F13 |
| Archiver un partenaire | partenaire, clé | — (Odoo conserve les factures, obligation légale de 10 ans) | `NotFound` | F02 (suppression RGPD) |

## 4. Commandes

| Opération | Entrée | Sortie | Erreurs | Utilisée par |
|---|---|---|---|---|
| Créer une commande payée | partenaire, lignes, livraison, paiement, clé | référence de commande | `OutOfStock`, `ServiceUnavailable` | F04 |
| Lire les commandes d'un client | partenaire | commandes et statuts, suivi | — | F02, F04 |
| Lire une commande | référence | détail, statut, expédition | `NotFound` | F04 |

Ajouts de F04 (détail : [../../004-panier-paiement-financement/contracts/odoo.md](../../004-panier-paiement-financement/contracts/odoo.md)) :

| Opération | Entrée | Sortie | Erreurs | Utilisée par |
|---|---|---|---|---|
| Calculer un devis | client (facultatif), lignes, code promo, bons demandés, mode de livraison | prix appliqués, remises, code promo (ou motif), bons, frais de port, TVA, totaux, blocs achat et abonnement, modes de livraison, règle de cumul | `NotFound`, `ServiceUnavailable` | F04 |
| Créer une commande à régler par virement | comme une commande payée, clé | référence, échéance de réservation | `OutOfStock` | F04 |
| Annuler une commande en attente | commande, motif | — (stock libéré) | `NotFound` | F04 |
| Lister les changements de commandes | depuis (date) | statut, transporteur, suivi, remboursements | — | F04 |
| Lister les remboursements à exécuter | — | remboursements décidés dans Odoo | — | F04 |
| Enregistrer un remboursement | commande, montant, source, référence Stripe, clé | avoir | `NotFound` | F04 |

Statuts d'une commande (F04) : `en_attente_paiement`, `payee`, `en_preparation`, `expediee`,
`livree`, `annulee`, `remboursee_partiellement`, `remboursee`. Le stock gagne « Libérer une
réservation » (clé), utilisée quand un paiement est refusé ou abandonné.

## 5. Factures

| Opération | Entrée | Sortie | Erreurs | Utilisée par |
|---|---|---|---|---|
| Lister les factures d'un client | partenaire | factures et avoirs, état de paiement | — | F02, F04 |
| Obtenir le PDF | facture | fichier PDF (mention « FICTIVE » en démonstration) | `NotFound` | F04 |

## 6. Location et abonnements

| Opération | Entrée | Sortie | Erreurs | Utilisée par |
|---|---|---|---|---|
| Créer un abonnement | partenaire, objet (`mise_a_disposition` ou `logiciel`), article, date de début, clé | référence | `OutOfStock` | F04, F05, F12 |
| Résilier / annuler la résiliation | abonnement, date | date de fin | `NotFound` | F05, F12 |
| Lister les locations d'un client | partenaire | locations, numéros de série, échéances | — | F05, F13 |

## 7. Fidélité

| Opération | Entrée | Sortie | Erreurs | Utilisée par |
|---|---|---|---|---|
| Lire la cagnotte | partenaire | solde, mouvements, prochaine expiration | — | F06 |
| Lire les droits d'assistance | partenaire | statut, date de fin, origine | — | F06, F09, F13 |
| Estimer les gains d'un panier | partenaire, lignes | bons d'achat et droits que la commande rapporterait | — | F03, F04 |
| Appliquer les règles à une commande payée | commande | mouvements créés | — | F04, F06 |
| Lire l'offre de bienvenue | — | article offert (référence) et disponibilité, ou « aucune offre » | `ServiceUnavailable` | F02, F04 |

En mode démonstration, ce domaine **applique les mêmes règles qu'Odoo** à partir des
paramètres de la base (principe III) ; en mode réel, c'est Odoo qui calcule.

## 8. Opportunités commerciales

| Opération | Entrée | Sortie | Erreurs | Utilisée par |
|---|---|---|---|---|
| Copier une demande | type (`financement`, `devis`), référence de la demande du site, contenu, clé | référence de l'opportunité | `ServiceUnavailable` | F04, F12, F13 |

## Opérations réservées au mode démonstration

Ces opérations n'existent que sur l'implémentation `demo` et ne font pas partie du contrat
commun : remplir la base, la réinitialiser, modifier un prix, un stock ou un paramètre
commercial fictif (FR-019, FR-024). Elles sont appelées par l'écran de démonstration du
back-office et par la commande de remplissage.
