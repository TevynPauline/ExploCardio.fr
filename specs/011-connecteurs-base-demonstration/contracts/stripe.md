# Contrat du connecteur Stripe

Aucune donnée de carte ne touche le site, dans aucun mode (principe V).

## Opérations

| Opération | Entrée | Sortie | Erreurs | Utilisée par |
|---|---|---|---|---|
| Ouvrir une session de paiement | commande, montant TTC, moyens autorisés (cartes, SEPA, virement exclu), client, clé | adresse de la page de paiement | `ServiceUnavailable` | F04 |
| Ouvrir une session d'abonnement | client, objet (mise à disposition, logiciel), premier montant, montant mensuel, éléments (un par location, F05), moyens (carte, SEPA), clé | adresse de la page de paiement | `ServiceUnavailable` | F04, F05, F12 |
| Rembourser | paiement, montant, motif, clé | remboursement | `NotFound`, `ServiceUnavailable` | F04 |
| Résilier un abonnement | abonnement, date de fin | — | `NotFound` | F05, F12 |
| Retirer / rétablir un élément d'abonnement | abonnement, élément (location), date d'effet, clé | prélèvements mensuels de l'élément arrêtés ; autorisation conservée | `NotFound` | F05 |
| Prélever un montant ponctuel | abonnement, montant TTC, libellé, clé | paiement, état (`payee` / `refusee`) | `NotFound`, `OperationRefusee` (autorisation libérée) | F05 |
| Libérer l'autorisation | abonnement | — | `NotFound` | F05 |
| Vérifier un événement reçu | contenu, signature | événement typé | `InvalidSignature` | gestionnaire d'événements |

## Événements (identiques dans les deux modes)

| Événement | Effet attendu sur le site |
|---|---|
| Paiement réussi | Commande créée dans Odoo une seule fois, emails, panier vidé |
| Paiement refusé | Message clair, panier conservé (F04) |
| Authentification forte requise | Retour vers l'étape d'authentification |
| Échéance d'abonnement payée | Facture de l'échéance (Odoo), email |
| Échéance d'abonnement refusée | Relances et règles d'impayé (F05, F10) |
| Remboursement | Statut mis à jour dans « Mon compte », avoir (Odoo) |

Chaque événement est traité **une seule fois** (table des événements traités), même s'il
arrive en retard ou plusieurs fois (F04).

## Mode démonstration

- La « page de paiement » est une page de démonstration du site, accessible seulement quand
  `CONNECTOR_STRIPE=demo`. Elle affiche le montant et propose : type de carte (Visa,
  Mastercard, American Express) ou SEPA, puis l'issue (accepté, refusé, authentification
  forte), ainsi que deux options de test : « confirmation tardive » et « confirmation
  répétée ».
- Elle émet les **mêmes événements** que Stripe vers le **même gestionnaire**, avec une
  signature de démonstration vérifiée par l'implémentation `demo`.
- Les échéances mensuelles et les remboursements sont simulés depuis l'écran de
  démonstration du back-office (US7 de la spec).
