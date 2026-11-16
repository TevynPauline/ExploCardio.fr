# Contrat — connecteur Stripe, mode réel (F24)

Complète [specs/011-connecteurs-base-demonstration/contracts/stripe.md](../../011-connecteurs-base-demonstration/contracts/stripe.md).
Les deux modes passent `tests/contract/stripe.test.ts`.

## Évolutions communes aux deux modes

- `verifierEvenement(contenu, signature): Promise<EvenementPaiement | null>` — `null` pour un
  événement sans usage ; la route répond 200 sans traitement.
- `TypeEvenementPaiement` + `"contestation"` (effet : alerte administrateur, journal).
- `ouvrirGestionMoyenPaiement({ partenaireRef, urlRetour }): Promise<{ url: string }>` —
  réel : portail client Stripe ; démonstration : page de démonstration ; client inconnu →
  `NotFound`.

## Opérations en mode réel

| Opération | Appels Stripe | Points clés |
|---|---|---|
| `ouvrirSessionPaiement` | customers (recherche/création), checkout.sessions.create `mode: payment` | carte seule ; montant TTC exact ; suffixe de libellé = commande ; idempotence = clé |
| `ouvrirSessionAbonnement` | customers, coupons (si besoin), checkout.sessions.create `mode: subscription` | un article par élément ; écart premier mois (R5) ; `trial_end` si différé ; carte ou SEPA |
| `rembourser` | refunds.create | `NotFound` si paiement inconnu ; `OperationRefusee` si montant > restant |
| `resilierAbonnement` | subscriptions.update `cancel_at` ou schedule | sans prorata |
| `retirerElementAbonnement` / `retablirElementAbonnement` | subscriptionSchedules | phases recalculées ; idempotent |
| `preleverPonctuel` | paymentIntents.create `off_session, confirm` | `payee` / `refusee` ; `OperationRefusee` si autorisation libérée |
| `libererAutorisation` | paymentMethods.detach, subscriptions.update metadata | — |
| `verifierEvenement` | webhooks.constructEvent | `InvalidSignature` ; correspondance research R12 |
| `ouvrirGestionMoyenPaiement` | billingPortal.sessions.create | configuration limitée au moyen de paiement |

## Erreurs

| Situation Stripe | Erreur du contrat |
|---|---|
| Réseau, délai, 429, 5xx (`StripeConnectionError`, `StripeAPIError`, `StripeRateLimitError`) | `ServiceUnavailable` |
| Clé refusée (`StripeAuthenticationError`, `StripePermissionError`) | `ConfigurationIncomplete(["STRIPE_SECRET_KEY"])` |
| Ressource inconnue (`resource_missing`) | `NotFound` |
| Carte refusée lors d'un ponctuel (`card_declined`, `authentication_required`) | résultat `refusee` (pas d'erreur) |
| Montant de remboursement excessif, autorisation libérée | `OperationRefusee` |
| Signature absente ou fausse | `InvalidSignature` |
| Donnée de démonstration | `DemoDataRejected` (garde existante) |

La clé n'apparaît dans aucun message ni journal.
