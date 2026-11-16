# Research — F24 Branchement de Stripe

## R1. SDK officiel, isolé dans le connecteur

- **Decision** : paquet npm `stripe` (version d'API figée dans le code), utilisé seulement dans
  `src/connecteurs/stripe/real/` (la règle de lint du principe III interdit tout import
  ailleurs). Délai 15 s, 1 reprise réseau du SDK ; clés d'idempotence = clés du contrat.
- **Rationale** : vérification de signature des webhooks fournie, typage complet, idempotence
  native (`idempotencyKey`), contrairement à Brevo (F25) où `fetch` suffisait.
- **Alternatives** : `fetch` direct (il faudrait réécrire la vérification de signature).

## R2. Clés et environnements (FR-002 à FR-006)

- **Decision** : nouvelle variable obligatoire `STRIPE_ENVIRONNEMENT` (`recette` |
  `production`), comme `ODOO_ENVIRONNEMENT` et `EMAILING_ENVIRONNEMENT`. Le préfixe de la clé
  doit correspondre : recette → `sk_test_` ou `rk_test_` ; production → `sk_live_` ou
  `rk_live_`. Incohérence = variable manquante (`STRIPE_SECRET_KEY`) → `ConfigurationIncomplete`
  et bandeau d'alerte au back-office (« À traiter »).
- **Clé restreinte recommandée** (`rk_…`, FR-005) avec les seules permissions : Customers,
  Checkout Sessions, Coupons, Payment Intents, Payment Methods, Prices/Products (écriture),
  Refunds, Subscriptions, Subscription Schedules, Invoices (lecture), Billing Portal (écriture),
  Webhook Endpoints (lecture). Liste reprise dans le quickstart.

## R3. Client Stripe

- **Decision** : un client Stripe par partenaire Odoo. Recherche par
  `metadata['partenaireRef']`, sinon création avec la clé d'idempotence
  `client:<partenaireRef>` (24 h) — protège des doublons pendant le délai d'indexation de la
  recherche. Données transmises : email, `metadata.partenaireRef` ; pas de nom ni d'adresse
  (FR-026).
- **Alternatives** : table de correspondance locale (migration inutile).

## R4. Achat par carte (US1)

- **Decision** : Checkout Session `mode: "payment"`, `allowed_payment_method_types: ["card"]` (nouveau nom du champ dans l'API 2026-10-28) (Apple Pay
  et Google Pay sont des portefeuilles de la carte), une ligne `price_data` « Commande
  <ref> » au montant TTC exact (FR-008), `customer`, `client_reference_id` et
  `metadata.commandeRef`, `payment_intent_data.metadata.commandeRef`,
  `payment_intent_data.statement_descriptor_suffix` = référence de commande (FR-009),
  `locale: "fr"`, ni taxe automatique ni facture Stripe (FR-027, FR-028).
- Le refus d'une carte reste sur la page de Stripe (le client réessaie) ; l'abandon revient
  par `urlAnnulation` (panier conservé). La session expirée est ignorée.

## R5. Abonnement : premier mois, mensualités, éléments (US2)

- **Decision** : Checkout Session `mode: "subscription"`, `allowed_payment_method_types` = `["card"]`
  ou `["sepa_debit"]` selon le choix du client ; **un article d'abonnement par élément**
  (`price_data` mensuel, `metadata.element`, FR-011) ; `subscription_data.metadata.abonnementRef`.
  Écart entre premier mois et mensualité (par élément, puis totalisé) :
  - premier > mensuel → ligne ponctuelle de l'écart, facturée sur la première facture ;
  - premier < mensuel → coupon `amount_off` de l'écart, `duration: "once"` (créé pour la
    session, clé d'idempotence dérivée) ;
  - premier = 0 avec `debutPrelevements` (F12) → `subscription_data.trial_end` à cette date :
    autorisation recueillie, rien prélevé (FR-013). Stripe exige au moins 48 h : une date plus
    proche est reportée à ce minimum (le client n'est jamais prélevé plus tôt que prévu).
- **Alternatives** : mode `setup` puis abonnement créé par le site (premier paiement hors
  session, authentification forte risquée) ; écarts de prix par « schedules » (impossible
  dans Checkout).

## R6. SEPA : confirmation à la signature (FR-012, option A)

- **Decision** : `checkout.session.completed` d'un abonnement SEPA (paiement « en cours ») →
  `paiement_reussi` immédiat (la commande part). `checkout.session.async_payment_failed` ou
  `invoice.payment_failed` de la première facture → `echeance_refusee` (règles d'impayé F05)
  + alerte administrateur.

## R7. Retirer et rétablir un élément à une date (FR-016)

- **Decision** : **Subscription Schedule** créé depuis l'abonnement au premier retrait ; phase
  courante jusqu'à `dateEffet`, puis phase sans l'article retiré (`proration_behavior: none`).
  Rétablir = recalcul des phases sans ce retrait ; plus aucun retrait → schedule libéré.
  Idempotent : retrait déjà prévu à la même date = aucun changement.
- **Alternatives** : suppression immédiate de l'article par une tâche quotidienne (course avec
  la facture du mois) ; `cancel_at` (vaut pour tout l'abonnement seulement).

## R8. Résiliation (FR-018)

- **Decision** : `cancel_at` = date de fin, sans prorata ; si un schedule existe, sa dernière
  phase se termine à la date de fin avec `end_behavior: "cancel"`.

## R9. Échéances et règles d'impayé (FR-014)

- **Decision** : `invoice.paid` (motif `subscription_cycle`) → `echeance_payee` ;
  `invoice.payment_failed` → `echeance_refusee`. Dans le tableau de bord : nouvelles
  tentatives automatiques **désactivées** et « laisser l'abonnement impayé » (pas
  d'annulation par Stripe) ; les relances et la suspension restent celles de F05 (Odoo).
  `invoice.payment_action_required` (carte demandant une authentification) → `echeance_refusee`
  (le client met sa carte à jour par le lien de FR-015).

## R10. Prélèvement ponctuel et libération (FR-017)

- **Decision** : PaymentIntent `off_session: true, confirm: true` sur le moyen de paiement par
  défaut de l'abonnement, `metadata.abonnementRef`, idempotence par clé. `succeeded` → `payee` ;
  `processing` (SEPA) → `payee` provisoire, un échec ultérieur arrive en `echeance_refusee` ;
  refus ou authentification requise → `refusee`. Libérer : détacher le moyen de paiement et
  poser `metadata.autorisationLiberee = "true"` sur l'abonnement ; ensuite → `OperationRefusee`.

## R11. Remboursement (FR-019)

- **Decision** : `refunds.create({ payment_intent, amount, metadata.motif })`, idempotence par
  clé ; PaymentIntent inconnu → `NotFound` ; montant supérieur au restant → `OperationRefusee`.

## R12. Événements (US4, FR-021 à FR-024)

| Événement Stripe | Événement du site |
|---|---|
| `checkout.session.completed` (paiement payé ; abonnement carte ou SEPA) | `paiement_reussi` |
| `checkout.session.async_payment_failed` | `echeance_refusee` (abonnement) |
| `invoice.paid` (`subscription_cycle`) | `echeance_payee` |
| `invoice.payment_failed`, `invoice.payment_action_required` | `echeance_refusee` |
| `refund.created` | `remboursement` |
| `charge.dispute.created` | **`contestation`** (nouveau type, alerte administrateur) |
| tout autre | **ignoré** (`null`, réponse 200) |

- **Contrat** : `verifierEvenement` renvoie `EvenementPaiement | null` ; type `contestation`
  ajouté. La démonstration ne renvoie jamais `null` et peut émettre `contestation` depuis
  l'écran de démonstration.
- `paiementRef` : identifiant du PaymentIntent (y compris celui de la première facture d'un
  abonnement, pour les remboursements d'annulation).

## R13. Mise à jour du moyen de paiement (FR-015)

- **Decision** : nouvelle opération `ouvrirGestionMoyenPaiement(partenaireRef, urlRetour)` →
  session du portail client Stripe limité à la mise à jour du moyen de paiement (configuration
  du portail : aucune résiliation, aucune facture). Lien « Mettre à jour ma carte ou mon
  compte bancaire » dans Mon compte › Locations. Démonstration : page de démonstration.

## R14. Réglages du tableau de bord (hors code)

Reçus et emails de facture Stripe désactivés ; nouvelles tentatives désactivées ; abonnement
laissé impayé ; portail client configuré (R13) ; webhook déclaré (adresse
`/api/evenements/paiement`, événements de R12) ; prélèvement SEPA activé.
