# Modèle de données — F06 Fidélité, bons d'achat et droits d'assistance

## 1. Base fictive d'Odoo — changements

| Objet | Changement |
|---|---|
| `CommandeVente` | **Ajout** `reglesFidelite` (JSON figé au paiement : taux, palier, validité en mois, seuil et durée des droits) ; `bonsManquantsCentimes` (bons déjà dépensés déduits d'un remboursement) |
| `MouvementCagnotte` | Types : `credit`, `utilisation`, `retrait`, `restitution`, `expiration`, `ajustement` ; **ajouts** `lotId` (lot consommé ou rendu), `regles` (JSON), `motif`, `auteur` |
| `LotBons` — **nouveau** (`loyalty_lot`) | Partenaire, origine (crédit, restitution, ajustement), montant initial, reste, date de fin de validité, commande ; consommé dans l'ordre des fins de validité |
| `DroitAssistance` | **Ajouts** `historique` (JSON : ouvertures, prolongations, retraits, ajustements avec motif et auteur) |
| `InterventionPayee` — **nouveau** (`assistance_ticket`) | Partenaire, commande, facture, état `disponible` / `consommee`, achetée le, consommée le, auteur |
| `Promotion` | **Ajouts** `limites` (JSON : usages max, par client, montant minimum, nouveaux clients), `annoncee` (bool : codes à afficher) ; compteur d'usages par commande |
| Article de service | « Assistance à l'acte — une intervention » (`EC-ASSISTANCE-ACTE`), prix = `RegleAssistance.prixActeCentimes` |

Le solde de la cagnotte reste la somme des mouvements (FR-022).

## 2. Base du site — changements

| Objet | Changement |
|---|---|
| `Panier` | **Ajout** `bonsDemandesHt` (montant choisi ; `null` = maximum utilisable) |
| `SuiviFidelite` — **nouveau** | Partenaire ; dernier mouvement notifié ; dernière fin de droits notifiée ; rappels envoyés (fin de droits, expiration de lot) |
| `Parametre` | `fidelite.bons_au_panier` = `true` ; `fidelite.rappel_droits_jours` (7) ; `fidelite.rappel_expiration_jours` (30) |

Aucune règle du programme n'est stockée sur le site (FR-020, FR-029).
