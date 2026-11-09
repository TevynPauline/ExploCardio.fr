# Data Model: F22 — Affichage des prix TTC

F22 ne crée ni ne modifie aucune donnée stockée. Tous les montants restent en **centimes HT**
(Odoo, base fictive, domaine du site). Les notions ci-dessous sont des valeurs d'affichage.

## Prix affiché

| Champ | Origine | Règle |
|---|---|---|
| `ht` | Odoo (prix, ligne, total) | centimes, entier |
| `tauxTva` | taxe de l'article (Odoo) | pourcentage ; requis si `ttc` absent |
| `ttc` | calculé ou lu | `prixTtc(ht, tauxTva)` = `round(ht × (100 + taux) / 100)`, sauf montant déjà calculé par Odoo (totaux, commandes, factures) |
| `aPartirDe` | catalogue | « À partir de » devant les deux montants |
| `periode` | mise à disposition, financement, services | « / mois » après chacun des deux montants |
| `barre` | prix catalogue sous un prix client, prix avant remise | même présentation, barrée |

Validation : `ht` et `ttc` entiers ≥ 0 ; un montant nul s'affiche « Offert » ou
« 0,00 € TTC » sans ligne HT ; un article sans taux connu n'est pas affiché (rapport de
contrôle, F14).

## Totaux d'achat (inchangés, lus du connecteur)

`sousTotalHt`, `remisesAutomatiquesHt`, `remiseCodePromoHt`, `bonsHt`, `fraisPortHt`,
`fraisSpecifiquesHt`, `totalHt`, `tva`, `totalTtc`.

Invariant vérifié par les tests (SC-002), bons d'achat exclus :

```text
Σ prixTtc(ligne.totalHt, ligne.tauxTva) + prixTtc(fraisPortHt + fraisSpecifiquesHt, 20) = totalTtc
```

## Totaux d'abonnement (inchangés)

`premierMoisHt`, `premierMoisTtc`, `moisSuivantsHt`, `moisSuivantsTtc`.
