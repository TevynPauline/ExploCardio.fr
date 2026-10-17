# Évolutions du contrat du connecteur Odoo — F04

À reporter dans [../../011-connecteurs-base-demonstration/contracts/odoo.md](../../011-connecteurs-base-demonstration/contracts/odoo.md),
avec leurs tests de contrat communs aux deux modes.

## Opérations ajoutées

| Domaine | Opération | Entrée | Sortie | Erreurs |
|---|---|---|---|---|
| Commandes | **Calculer un devis** | client (facultatif), lignes (référence, formule, quantité), code promo, bons demandés, mode de livraison | lignes avec prix appliqué et remises ; remise du code promo ou motif du refus ; bons retenus ; frais de port (forfait, franco, frais des équipements volumineux) ; TVA ; totaux HT et TTC ; montants des mises à disposition (1er mois, mois suivants) ; modes de livraison disponibles ; texte de la règle de cumul des remises appliquée | `NotFound`, `ServiceUnavailable` |
| Commandes | **Créer une commande à régler par virement** | comme « Créer une commande payée », clé | référence, échéance de réservation | `OutOfStock` |
| Commandes | **Lister les changements de commandes** | depuis (date) | commandes modifiées : statut, transporteur, suivi, remboursements | — |
| Commandes | **Lister les remboursements à exécuter** | — | remboursements décidés dans Odoo, non exécutés (commande, paiement, montant, motif) | — |
| Commandes | **Enregistrer un remboursement** | commande, montant, source (`odoo` ou `stripe`), référence Stripe, clé | avoir (numéro) | `NotFound` |
| Commandes | **Annuler une commande en attente** | commande, motif | — (stock libéré) | `NotFound` |

## Types modifiés

```text
StatutCommande = en_attente_paiement | payee | en_preparation | expediee | livree
               | annulee | remboursee_partiellement | remboursee
Commande + transporteur, suivi (déjà), echeancePaiement (virement), remboursementsTtc
NouvelleCommande.livraison + mode (code d'Odoo) ; frais calculés par le devis
```

## Règles vérifiées par les tests de contrat

| Opération | Règle |
|---|---|
| Calculer un devis | Totaux = somme des lignes − remises + port ; TVA par taux d'article ; franco au-delà du seuil ; frais des équipements volumineux hors franco ; code invalide ou expiré → refusé avec motif ; bons plafonnés au solde et au montant éligible ; total jamais négatif |
| Calculer un devis | Express absent si un article n'est pas en stock |
| Créer une commande payée | Même clé → même commande (idempotence) ; montants identiques au devis |
| Commande par virement | Statut `en_attente_paiement`, stock réservé, échéance = date + délai |
| Annuler une commande en attente | Stock rendu ; statut `annulee` |
| Enregistrer un remboursement | Avoir numéroté à la suite ; total → `remboursee`, partiel → `remboursee_partiellement` ; même clé → même avoir |

## Démonstration (opérations réservées, hors contrat)

« Virement reçu », « Marquer expédiée / livrée », « Décider un remboursement », appelées par
l'écran de démonstration.
