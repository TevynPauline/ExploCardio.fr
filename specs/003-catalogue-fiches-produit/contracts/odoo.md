# Évolutions du contrat du connecteur Odoo — F03

À reporter dans [../../011-connecteurs-base-demonstration/contracts/odoo.md](../../011-connecteurs-base-demonstration/contracts/odoo.md)
(domaine Catalogue), avec leurs tests de contrat communs aux deux modes
(`tests/contract/odoo/catalogue.test.ts`). Aucune nouvelle opération.

## Types

```text
VarianteArticle
  + quantiteParLot: entier ≥ 1            (unités par conditionnement ; 1 par défaut)
  + paliers: [{ quantiteMin, prixUnitaireHt }]   (liste de prix publique, triés par quantité)

Article
  + mensualitesForcees: [{ dureeMois, montantHt }]   (valables pour tous)

PrixClient
  - mensualiteForceeHt
  + mensualitesForcees: [{ dureeMois, montantHt }]   (propres au client, prioritaires)
```

## Règles vérifiées par les tests de contrat

| Opération | Règle |
|---|---|
| `lireArticle` | Toute variante a `quantiteParLot ≥ 1` ; `paliers` triés par `quantiteMin` croissante, prix unitaire décroissant |
| `lireArticle` | Chaque mensualité forcée porte une durée présente dans `baremeFinancement` |
| `lirePrixClient` | Un client sans liste de prix → `mensualitesForcees: []` ; le Dr Delvaux-Arnoux (démonstration) → une mensualité forcée sur `EC-DMS-3004L-CLOUD` |
| `lirePrixClient` | Client inconnu → `NotFound` |

## Correspondance avec Odoo réel (phase 2, F14)

| Contrat | Odoo |
|---|---|
| `quantiteParLot` | `product.packaging.qty` (ou attribut de variante « conditionnement ») |
| `paliers` | `product.pricelist.item` de la liste publique avec `min_quantity` |
| `mensualitesForcees` | `product.pricelist.item` d'une liste dédiée au financement (champ personnalisé de durée) — à confirmer avec l'intégrateur Odoo |
