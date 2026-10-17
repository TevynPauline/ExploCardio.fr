# Évolutions du contrat du connecteur Odoo — F03

Reportées dans [../../011-connecteurs-base-demonstration/contracts/odoo.md](../../011-connecteurs-base-demonstration/contracts/odoo.md)
(domaine Catalogue), avec leurs tests de contrat communs aux deux modes
(`tests/contract/odoo/catalogue.test.ts`). Aucune nouvelle opération.

## Types

```text
VarianteArticle
  + quantiteParLot: entier ≥ 1                     (unités par conditionnement ; 1 par défaut)
  + paliers: [{ quantiteMin, prixHt }]             (prix HT de la variante à partir de quantiteMin,
                                                    liste de prix publique, triés par quantité)
  + mensualitesForcees: [{ dureeMois, montantHt }] (financement, valables pour tous)
  + composants: [référence]                        (variantes d'un pack ; vide sinon)

Disponibilite (stock.lireDisponibilite)
  + quantiteDisponible: entier ≥ 0 | null          (quantité en stock à l'achat ; null pour un pack)
  + delaiReassortJours: entier | null              (délai quand le stock est épuisé ; null si indisponible)

PrixClient
  - mensualiteForceeHt
  + mensualitesForcees: [{ dureeMois, montantHt }] (financement, propres au client, prioritaires)
```

Les mensualités forcées sont portées par la **variante** (une configuration a son propre
prix, donc sa propre mensualité).

## Règles vérifiées par les tests de contrat

| Opération | Règle |
|---|---|
| `lireArticle` | Toute variante a `quantiteParLot ≥ 1` ; les électrodes Holter ont 50 et 500 |
| `lireArticle` | `paliers` triés par `quantiteMin` croissante et prix décroissant, sous le prix de base |
| `lireArticle` | Chaque mensualité forcée porte une durée présente dans `baremeFinancement` |
| `lirePrixClient` | Client sans mensualité forcée → `mensualitesForcees: []` ; le Dr Delvaux-Arnoux (démonstration) → une mensualité forcée sur `EC-DMS-3004L-CLOUD` |
| `lirePrixClient` | Client inconnu → `NotFound` |
| `stock.lireDisponibilite` | Un pack n'est jamais plus disponible que ses composants |
| `stock.lireDisponibilite` | Quantité en stock ≥ 0 ; article « indisponible » hors stock → `delaiReassortJours: null` |

## Correspondance avec Odoo réel (phase 2, F14)

| Contrat | Odoo |
|---|---|
| `quantiteParLot` | `product.packaging.qty` (ou attribut de variante « conditionnement ») |
| `paliers` | `product.pricelist.item` de la liste publique avec `min_quantity` |
| `mensualitesForcees` | `product.pricelist.item` d'une liste dédiée au financement (champ personnalisé de durée) — à confirmer avec l'intégrateur Odoo |
| `composants` | nomenclature de type « kit » (`mrp.bom`, `type = phantom`) |
| `quantiteDisponible`, `delaiReassortJours` | `qty_available` de l'article ; délai de réapprovisionnement (`sale_delay` ou règle de réassort) |
