# Data Model: F18 — Ajustements du site (lot A)

**Aucune migration.** Aucune entité n'est créée ni modifiée.

## Règle de livraison (dérivée, non stockée)

Une adresse de **livraison** est livrable en ligne si :

- le pays est la France (valeur par défaut du champ « Pays » de F16) ;
- le code postal a 5 chiffres ;
- ses deux premiers chiffres sont compris entre 01 et 95, **sauf 20** (Corse-du-Sud et
  Haute-Corse, codes 20000 à 20999).

Sinon, le refus porte le message unique (spec FR-002) et le lien de contact « Commande hors
métropole ».

| Exemple | Livrable |
|---|---|
| 75008 Paris, 69003 Lyon, 06000 Nice | oui |
| 20000 Ajaccio, 20200 Bastia, 20090 Ajaccio | non (Corse) |
| 97411 Saint-Paul, 98000 Monaco | non (outre-mer, étranger) |
| Pays « Autre pays » | non |

L'adresse de **facturation** n'est pas soumise à la règle.

## Données existantes

- **Adresses en Corse déjà enregistrées** (comptes, commandes, devis) : conservées telles
  quelles. La règle s'applique quand une adresse sert à une nouvelle commande, à un nouveau
  devis ou à la commande d'un devis.
- **Locations en cours livrées en Corse** : inchangées (échéances, résiliation, retour).
