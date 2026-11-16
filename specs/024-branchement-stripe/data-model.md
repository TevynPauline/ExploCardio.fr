# Data Model — F24 Branchement de Stripe

Aucune migration. Les correspondances vivent dans les métadonnées Stripe ; le site garde ses
modèles existants (`CommandeSite`, `EvenementPaiementTraite`, journaux).

## Configuration (variables d'environnement)

| Variable | Obligatoire | Valeurs | Rôle |
|---|---|---|---|
| `CONNECTOR_STRIPE` | non (défaut `demo`) | `demo` \| `real` | mode du connecteur |
| `STRIPE_SECRET_KEY` | en `real` | `sk_test_…`/`rk_test_…` en recette ; `sk_live_…`/`rk_live_…` en production | secret |
| `STRIPE_WEBHOOK_SECRET` | en `real` | `whsec_…` du webhook de l'environnement | secret de signature |
| `STRIPE_ENVIRONNEMENT` | en `real` | `recette` \| `production` | garde clé/environnement |

Règle : préfixe de clé incohérent avec l'environnement = `STRIPE_SECRET_KEY` comptée
manquante (configuration incomplète + alerte « À traiter »).

## Métadonnées posées chez Stripe

| Objet Stripe | Métadonnées | Sert à |
|---|---|---|
| Customer | `partenaireRef` | retrouver le client (R3) |
| Checkout Session (paiement) / PaymentIntent | `commandeRef` | `paiement_reussi`, remboursements |
| Checkout Session (abonnement) / Subscription | `abonnementRef` (= référence de la commande du site) | échéances, opérations de l'équipe |
| Subscription | `autorisationLiberee` (`"true"`) | refus des prélèvements ponctuels |
| Subscription item | `element` (`<defaultCode>:<n>`) | retrait/rétablissement d'une location |
| PaymentIntent ponctuel | `abonnementRef`, `libelle` | traçabilité |
| Refund | `motif` | traçabilité |

## Événement de paiement (contrat, évolution)

`TypeEvenementPaiement` gagne `contestation`. `verifierEvenement` renvoie
`EvenementPaiement | null` (`null` = événement Stripe sans usage, accepté et ignoré).

## Correspondances d'identifiants

| Contrat | Stripe |
|---|---|
| `sessionId` | Checkout Session `cs_…` |
| `paiementRef` | PaymentIntent `pi_…` (achat, première facture, échéance, ponctuel) |
| `remboursementRef` | Refund `re_…` |
| `abonnementRef` | métadonnée de la Subscription (recherche par métadonnée) |
