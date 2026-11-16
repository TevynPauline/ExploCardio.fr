# Tasks: F24 — Branchement de Stripe

**Input**: `specs/024-branchement-stripe/` (plan.md, spec.md, research.md R1–R14, data-model.md,
contracts/stripe-reel.md, quickstart.md)

**Tests** : demandés (SC-001, FR-030, FR-031) — écrits avant le code de chaque phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]** : parallélisable (fichiers différents, sans dépendance en cours)
- **[Story]** : US1 à US5 de la spec

---

## Phase 1: Setup

- [X] T001 Ajouter la dépendance `stripe` (SDK officiel, dernière version stable) dans `package.json` (`npm install stripe`) ; vérifier que `eslint.config.mjs` interdit déjà l'import de `stripe` hors de `src/connecteurs/` (sinon ajouter `stripe` à la liste des paquets restreints)
- [X] T002 `src/lib/config.ts` : `STRIPE_ENVIRONNEMENT` dans `VARIABLES_MODE_REEL.stripe` et `VALEURS_ADMISES` (`["recette", "production"]`) ; fonction `environnementStripe(env)` ; `variablesManquantes("stripe")` DOIT compter `STRIPE_SECRET_KEY` manquante si son préfixe ne correspond pas : recette → `sk_test_` ou `rk_test_`, production → `sk_live_` ou `rk_live_` ; fonction `cleStripeIncoherente(env)` (vrai si mode réel, environnement valide et préfixe incohérent)
- [X] T003 [P] Documenter `CONNECTOR_STRIPE`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_ENVIRONNEMENT` (sans valeur) dans `docs/deploiement-scalingo.md`, section « Paiements réels par Stripe (F24) », avec la liste des permissions de la clé restreinte (research R2) et des événements du webhook (research R12)

---

## Phase 2: Foundational (bloquant)

**But** : contrat étendu dans les deux modes ; socle du mode réel (SDK, erreurs, faux Stripe).

### Tests (à écrire d'abord)

- [X] T004 [P] `tests/unit/stripe-reel/config.test.ts` : environnement absent/invalide → manquant ; `sk_live_` en recette et `sk_test_` en production → `STRIPE_SECRET_KEY` manquante ; `rk_test_` en recette et `rk_live_` en production → complet ; `cleStripeIncoherente`
- [X] T005 [P] `tests/unit/stripe-reel/erreurs.test.ts` : correspondance de contracts/stripe-reel.md (connexion, API, 429 → `ServiceUnavailable` ; authentification et permission → `ConfigurationIncomplete(["STRIPE_SECRET_KEY"])` ; `resource_missing` → `NotFound` ; message sans la clé)
- [X] T006 Étendre `tests/contract/stripe.test.ts` : `ouvrirGestionMoyenPaiement` renvoie une URL pour un client connu et `NotFound` pour un inconnu ; en démonstration, un événement signé de type `contestation` est restitué typé ; un événement démo inconnu n'est jamais `null`

### Implémentation

- [X] T007 Contrat `src/connecteurs/stripe/interfaces/index.ts` : `TypeEvenementPaiement` + `"contestation"` ; `verifierEvenement` → `Promise<EvenementPaiement | null>` (commentaire : `null` = événement sans usage, accepté et ignoré) ; nouvelle opération `ouvrirGestionMoyenPaiement(d: { partenaireRef: string; urlRetour: string }): Promise<{ url: string }>` ; mettre à jour `specs/011-connecteurs-base-demonstration/contracts/stripe.md` (renvoi vers F24)
- [X] T008 Démonstration `src/connecteurs/stripe/demo/index.ts` : `ouvrirGestionMoyenPaiement` → `NotFound` si aucune session pour ce `partenaireRef`, sinon URL `/demo/moyen-paiement?retour=<urlRetour encodée>` ; créer la page `app/demo/moyen-paiement/page.tsx` (accessible seulement si `CONNECTOR_STRIPE` ≠ `real`, comme `/demo/paiement` ; texte « Démonstration : ici, le client mettrait à jour sa carte ou son compte bancaire chez Stripe » + bouton « Revenir au site » vers l'URL de retour, chemin interne uniquement)
- [X] T009 Route `app/api/evenements/paiement/route.ts` : si `verifierEvenement` renvoie `null` → `Response.json({ ignore: true })` (200), sans appel à `traiterEvenementPaiement`
- [X] T010 Effet `contestation` (le journal `paiement.contestation` est déjà inscrit par le gestionnaire des paiements : pas de second journal) dans `src/domaine/commande/effets.ts` : `ajouterEffet("contestation", …)` → `notifierEquipe` (objet « Contestation d'un paiement », texte avec `paiementRef`, `commandeRef`/`abonnementRef`, montant, « à traiter dans le tableau de bord Stripe »), clé `contestation:<evt.id>`, et journal `paiement.contestation` ; test dans `tests/unit/commande/contestation.test.ts`
- [X] T011 [P] `src/connecteurs/stripe/real/erreurs.ts` : `traduireErreurStripe(e, masquer)` (fait passer T005) ; `src/connecteurs/stripe/real/sdk.ts` : `creerSdk(cle)` (version d'API figée, `timeout: 15000`, `maxNetworkRetries: 1`, `appInfo: { name: "ExploCardio.fr" }`) ; type `SdkStripe` = sous-ensemble des méthodes utilisées, pour l'injection en test
- [X] T012 [P] Faux Stripe `tests/unit/stripe-reel/faux-stripe.ts` : objet conforme à `SdkStripe` qui enregistre chaque appel (méthode, paramètres, `idempotencyKey`), renvoie des objets plausibles (`cs_`, `pi_`, `sub_`, `cus_`, `sub_sched_`, `re_`) et permet d'injecter une erreur Stripe typée
- [X] T013 Squelette `src/connecteurs/stripe/real/index.ts` : `creerStripeReel(manquantes, env, options?: { sdk?: SdkStripe })` → `implementationRefusee` si `manquantes.length` ; enveloppe chaque appel SDK avec `traduireErreurStripe` ; `src/connecteurs/registre.ts` passe `env`

**Checkpoint** : `npx vitest run tests/unit/stripe-reel tests/contract/stripe.test.ts tests/unit/commande/contestation.test.ts` vert en démonstration.

---

## Phase 3: User Story 5 — Basculer du test à la production sans risque (P2) 🎯 MVP (vérifiable sans clé)

**Test indépendant** : quickstart Phase 1 + étape 8.

- [X] T014 [P] [US5] Tests `tests/unit/stripe-reel/garde.test.ts` : registre isolé (`creerRegistre`) avec `CONNECTOR_STRIPE=real`, `STRIPE_ENVIRONNEMENT=recette` et une clé `sk_live_…` → chaque opération lève `ConfigurationIncomplete` citant `STRIPE_SECRET_KEY` ; aucun appel au SDK ; mode démonstration inchangé
- [X] T015 [US5] Alerte `app/(back-office)/admin/page.tsx` : si `cleStripeIncoherente()` → bandeau `role="alert"` « Clé Stripe incohérente avec l'environnement : les paiements sont bloqués. Utilisez une clé de test sur la recette et une clé de production sur le site public. »

---

## Phase 4: User Story 4 — Recevoir les événements de Stripe en toute sécurité (P1)

**Test indépendant** : quickstart étape 7.

- [X] T016 [P] [US4] Tests `tests/unit/stripe-reel/evenements.test.ts` (événements construits et signés avec `stripe.webhooks.generateTestHeaderString` et un secret de test) : signature fausse ou absente → `InvalidSignature` ; chaque ligne de research R12 → bon type, `id` = id de l'événement Stripe, `sessionId`, `commandeRef`/`abonnementRef` (métadonnées), `paiementRef` (`pi_…`), `montantTtc` (centimes), `moyen` (`carte`/`sepa`), `carte` (`visa`/`mastercard`/`amex`, sinon `null`) ; `invoice.paid` de motif `subscription_create` → `null` ; type inconnu → `null`
- [X] T017 [US4] `src/connecteurs/stripe/real/evenements.ts` (API 2026-10-28 : `abonnementRef` lu dans `invoice.parent.subscription_details.metadata`, PaymentIntent de la facture via `invoicePayments.list`) : `verifierEvenement` (via `webhooks.constructEvent` avec `STRIPE_WEBHOOK_SECRET`) et `traduireEvenement(evt, sdk)` ; pour un abonnement, `paiementRef` = PaymentIntent de la dernière facture (lecture `subscriptions.retrieve` + `invoices.retrieve`), `abonnementRef` = `subscription.metadata.abonnementRef` ; SEPA « en cours » à la signature → `paiement_reussi` (research R6)

---

## Phase 5: User Story 1 — Payer un achat par carte (P1)

**Test indépendant** : quickstart étape 2.

- [X] T018 [P] [US1] Tests `tests/unit/stripe-reel/clients.test.ts` : client existant trouvé par `metadata['partenaireRef']` (pas de création) ; sinon création avec `email`, `metadata.partenaireRef` et `idempotencyKey` `client:<partenaireRef>` ; aucun nom ni adresse transmis
- [X] T019 [P] [US1] Tests `tests/unit/stripe-reel/sessions-paiement.test.ts` : `checkout.sessions.create` avec `mode: "payment"`, `allowed_payment_method_types: ["card"]` (nom du champ dans l'API 2026-10-28), une ligne `price_data` (`currency: "eur"`, `unit_amount` = montant TTC, `product_data.name` « Commande <ref> »), `customer`, `client_reference_id` et `metadata.commandeRef`, `payment_intent_data.metadata.commandeRef` et `statement_descriptor_suffix` (référence, 22 caractères max), `success_url`/`cancel_url`, `locale: "fr"`, aucun `automatic_tax` ni `invoice_creation` ; `idempotencyKey` = clé ; renvoie `{ sessionId, url }`
- [X] T020 [US1] `src/connecteurs/stripe/real/clients.ts` (`clientStripe(sdk, client)`) et `ouvrirSessionPaiement` dans `src/connecteurs/stripe/real/sessions.ts`

---

## Phase 6: User Story 2 — Souscrire une mise à disposition ou un abonnement logiciel (P1)

**Test indépendant** : quickstart étapes 3, 4, 5, 9.

- [X] T021 [P] [US2] Tests `tests/unit/stripe-reel/sessions-abonnement.test.ts` : `mode: "subscription"` ; `allowed_payment_method_types` `["card"]` ou `["sepa_debit"]` ; un article `price_data` mensuel récurrent (`recurring.interval: "month"`) par élément avec `metadata.element` (via `subscription_data` / `product_data.metadata`) ; `subscription_data.metadata.abonnementRef` ; premier > mensuel → ligne ponctuelle de l'écart ; premier < mensuel → coupon `amount_off` = écart total, `duration: "once"`, `currency: "eur"`, idempotence `coupon:<clé>` ; `debutPrelevements` → `subscription_data.trial_end` (secondes) et aucune ligne ni coupon ; sans éléments → un article unique au montant mensuel
- [X] T022 [US2] `ouvrirSessionAbonnement` dans `src/connecteurs/stripe/real/sessions.ts` (prise d'effet à moins de 48 h : reportée au minimum exigé par Stripe ; adresses de retour rendues absolues avec `SITE_URL`)
- [X] T023 [P] [US2] Tests `tests/unit/stripe-reel/portail.test.ts` : `billingPortal.sessions.create({ customer, return_url })` ; client inconnu (aucun client pour ce `partenaireRef`) → `NotFound`
- [X] T024 [US2] `ouvrirGestionMoyenPaiement` réel dans `src/connecteurs/stripe/real/index.ts` (portail client ; la configuration du portail est faite dans le tableau de bord, research R13)
- [X] T025 [US2] Lien « Mettre à jour ma carte ou mon compte bancaire » dans `app/(public)/mon-compte/locations/page.tsx` quand le client a au moins une location ou un abonnement en cours : action serveur dans `src/actions/` qui appelle `registre.stripe().ouvrirGestionMoyenPaiement({ partenaireRef, urlRetour: "<site>/mon-compte/locations" })` et redirige ; en cas d'erreur de connecteur, message « Service momentanément indisponible, réessayez dans quelques instants. » ; test e2e `tests/e2e/f05/moyen-paiement.spec.ts` en démonstration (lien → page de démonstration → retour)

---

## Phase 7: User Story 3 — Opérations de l'équipe sur les locations (P2)

**Test indépendant** : quickstart étape 6.

- [ ] T026 [P] [US3] Tests `tests/unit/stripe-reel/abonnements.test.ts` : abonnement retrouvé par `subscriptions.search` sur `metadata['abonnementRef']` (inconnu → `NotFound`) ; retrait d'un élément à une date → schedule créé depuis l'abonnement, phase courante jusqu'à la date puis phase sans l'article, `proration_behavior: "none"` ; même retrait rejoué → aucun appel d'écriture ; rétablir → phases recalculées, schedule libéré s'il ne reste aucun retrait ; résilier → `cancel_at` (ou dernière phase + `end_behavior: "cancel"` si schedule)
- [ ] T027 [P] [US3] Tests `tests/unit/stripe-reel/ponctuel.test.ts` : `paymentIntents.create` (`amount`, `currency: "eur"`, `customer`, `payment_method` par défaut de l'abonnement, `off_session: true`, `confirm: true`, `metadata.abonnementRef`/`libelle`, `idempotencyKey` = clé) ; `succeeded` et `processing` → `payee` ; `card_declined` et `authentication_required` → `refusee` ; `metadata.autorisationLiberee = "true"` → `OperationRefusee` ; libérer → `paymentMethods.detach` + métadonnée posée
- [ ] T028 [P] [US3] Tests `tests/unit/stripe-reel/remboursements.test.ts` : `refunds.create({ payment_intent, amount, metadata.motif })` avec `idempotencyKey` ; PaymentIntent inconnu → `NotFound` ; montant supérieur au restant (`amount_too_large` / `charge_already_refunded`) → `OperationRefusee`
- [ ] T029 [US3] `src/connecteurs/stripe/real/abonnements.ts` : `retirerElementAbonnement`, `retablirElementAbonnement`, `resilierAbonnement`, `preleverPonctuel`, `libererAutorisation`
- [ ] T030 [US3] `rembourser` dans `src/connecteurs/stripe/real/index.ts`

---

## Phase 8: Polish & vérifications

- [ ] T031 [P] Vérifier que le journal des connecteurs (`src/connecteurs/journal.ts`) ne reçoit que des références pour Stripe (aucune URL de session ni email) ; ajuster si besoin
- [ ] T032 Lancer `npx tsc --noEmit`, `npx eslint .`, `npx vitest run tests/unit tests/contract` (démonstration)
- [ ] T033 Lancer la suite e2e une seule fois : `SITE_URL=http://localhost:3100 npm run test:e2e` (jamais deux suites en parallèle) — non-régression de la démonstration (SC-006)
- [ ] T034 Préparer pour Régis et Pauline la fiche « réglages Stripe » : informations « matériel médical » (avant le 28/11/2026), SEPA activé, réglages de research R14, création de la clé restreinte de test et du webhook de test, saisie dans Scalingo (étapes cliquées, sans valeur)
- [ ] T035 [Phase 3] Dérouler le quickstart sur le site de recette (après création de l'application de recette, F15)

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (bloquante) → US5 (garde, vérifiable sans clé) → US4 (événements) →
  US1 → US2 → US3 → Polish.
- US1, US2 et US3 ne dépendent que de la Phase 2 ; US2 et US3 partagent
  `src/connecteurs/stripe/real/index.ts` : à faire l'une après l'autre.
- T017 dépend de T011–T013 ; T022 dépend de T020 (client) ; T025 dépend de T024 et T008.

## Parallel Example: Phase 2

```text
T004, T005 (tests) et T011, T012 (erreurs/SDK, faux Stripe) en parallèle ;
puis T007 → T008 → T009 → T010 (contrat, démonstration, route, effet) en série.
```

## Implementation Strategy

1. **Lot 1** : Phases 1 à 4 — configuration, contrat étendu, garde des clés, événements
   signés. Vérifiable sans clé Stripe.
2. **Lot 2** : US1 et US2 — achat et abonnements, portail.
3. **Lot 3** : US3 — opérations de l'équipe (schedules, ponctuel, remboursements).
4. **Recette** : clés de test saisies par Régis ou Pauline, quickstart complet.
