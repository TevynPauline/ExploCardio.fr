# Implementation Plan: F24 — Branchement de Stripe

**Branch**: `024-branchement-stripe` (travail sur `main`) | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/024-branchement-stripe/spec.md`

## Summary

Écrire le mode réel du connecteur Stripe (`src/connecteurs/stripe/real/`) avec le SDK
officiel, activé par `CONNECTOR_STRIPE=real`. Les parcours (F04, F05, F12), le gestionnaire
d'événements (`app/api/evenements/paiement`) et leur traitement idempotent existent déjà ;
F24 fournit :

- les pages de paiement hébergées : achat par carte ; abonnement par carte ou SEPA, un
  article par location, écart du premier mois par ligne ponctuelle ou coupon, prise d'effet
  différée ;
- les opérations de l'équipe : retrait et rétablissement d'une location à une date
  (Subscription Schedules), résiliation, prélèvement ponctuel, libération, remboursement ;
- la traduction signée des événements Stripe, dont `contestation` (nouveau) et les
  événements ignorés ;
- la garde test/production des clés (`STRIPE_ENVIRONNEMENT`) ;
- la mise à jour du moyen de paiement par le portail client (nouvelle opération).

## Technical Context

**Language/Version**: TypeScript 5 (Node 24), Next.js (App Router) — inchangé

**Primary Dependencies**: ajout du paquet `stripe` (SDK officiel), confiné au connecteur

**Storage**: PostgreSQL du site — aucune migration (correspondances portées par les
métadonnées Stripe : `partenaireRef`, `commandeRef`, `abonnementRef`, `element`)

**Testing**: Vitest (tests de contrat communs ; tests unitaires du mode réel avec un faux
Stripe injecté) ; recette avec Stripe en mode test et horloges de test (test clocks)

**Target Platform**: Scalingo (site de recette, puis site public)

**Project Type**: application web existante

**Performance Goals**: page de paiement ouverte en moins de 3 s ; commande confirmée en moins
de 2 minutes après le paiement (SC-002)

**Constraints**: aucune donnée de carte sur le site ; clés hors dépôt ; montants TTC en
centimes calculés par le site ; aucune taxe ni facture Stripe

**Scale/Scope**: quelques dizaines de paiements et d'abonnements par mois

## Constitution Check

| Principe | Vérification | État |
|---|---|---|
| III. Connecteurs | Seul `src/connecteurs/stripe/real/` importe le SDK ; bascule par configuration ; mêmes erreurs ; tests de contrat communs | ✅ |
| III. Données fictives | Garde existante devant le mode réel (références `FICT-` refusées) | ✅ |
| IV. Aucune donnée patient | Métadonnées limitées aux références ; email du client seulement | ✅ |
| V. Sécurité | Aucune donnée de carte (pages hébergées) ; clés dans Scalingo ; signature des événements vérifiée ; clé restreinte recommandée | ✅ |
| V. Factures par Odoo | Factures et reçus Stripe désactivés ; Odoo facture sur les événements | ✅ |
| VI. Règles paramétrables | Règles d'impayé dans Odoo (F05) ; Stripe ne relance pas | ✅ |
| X. Incréments testables | Phase 1 (configuration, garde, contrat démo) ; Phase 3 (mode test Stripe) | ✅ |

Évolutions de contrat (R12, R13) : `verifierEvenement` peut renvoyer `null` ; type
`contestation` ; opération `ouvrirGestionMoyenPaiement`. Les deux modes les implémentent.
Aucune violation.

## Project Structure

### Documentation (this feature)

```text
specs/024-branchement-stripe/
├── plan.md, research.md (R1–R14), data-model.md, quickstart.md
├── contracts/stripe-reel.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
package.json                                   # + stripe
src/lib/config.ts                              # STRIPE_ENVIRONNEMENT, cohérence clé/environnement
src/connecteurs/stripe/
├── interfaces/index.ts                        # null, contestation, ouvrirGestionMoyenPaiement
├── demo/index.ts (+ page de démonstration)    # nouvelle opération, contestation simulée
└── real/
    ├── index.ts                               # creerStripeReel(manquantes, env, { stripe? })
    ├── sdk.ts                                 # instance du SDK, version d'API, délai, masquage
    ├── clients.ts                             # client Stripe par partenaire (R3)
    ├── sessions.ts                            # achat et abonnement (R4, R5)
    ├── abonnements.ts                         # retrait/rétablissement, résiliation, ponctuel, libération (R7, R8, R10)
    ├── evenements.ts                          # signature + correspondance (R12)
    └── erreurs.ts                             # erreurs Stripe → erreurs du contrat
src/connecteurs/registre.ts                    # passe env au mode réel Stripe
app/api/evenements/paiement/route.ts           # null → 200 ignoré
src/domaine/commande/effets.ts                 # effet « contestation » → alerte
app/(public)/mon-compte/locations/page.tsx     # lien « Mettre à jour mon moyen de paiement »
app/(back-office)/admin/page.tsx               # alerte clé incohérente
tests/contract/stripe.test.ts                  # cas communs + réels
tests/unit/stripe-reel/*.test.ts               # faux Stripe
```

**Structure Decision**: même découpage que le mode réel d'Odoo (F14) : instance de service
isolée, modules par domaine d'opérations, correspondance des erreurs.

## Phases de mise en œuvre

1. **Configuration et contrat** [Phase 1] : `STRIPE_ENVIRONNEMENT`, garde des clés, évolutions
   de contrat dans les deux modes, route et effet `contestation`.
2. **Achat par carte** (US1) et **événements** (US4) : client, session de paiement,
   signature, correspondance.
3. **Abonnements** (US2) : session d'abonnement, écarts, SEPA, échéances, portail.
4. **Opérations de l'équipe** (US3) : schedules, résiliation, ponctuel, libération,
   remboursement.
5. **Recette** [Phase 3] : clés de test, webhook de test, horloges de test, quickstart.

## Actions hors code (Régis / Pauline)

- Fournir à Stripe les informations « matériel médical » **avant le 28 novembre 2026**.
- Vérifier que le prélèvement SEPA est toujours activé.
- Réglages R14 du tableau de bord (reçus, tentatives, portail).
- Au moment de la recette : créer une **clé restreinte de test** et le webhook de test, saisir
  la clé et le secret de signature dans Scalingo (jamais dans une conversation).

## Complexity Tracking

| Écart | Pourquoi | Alternative plus simple rejetée |
|---|---|---|
| Subscription Schedules pour arrêter une location à une date future | Stripe ne sait pas supprimer un article d'abonnement à une date donnée autrement | Tâche quotidienne de suppression : course avec la facture du mois, risque de mois facturé à tort |
| Coupon ou ligne ponctuelle pour le premier mois | Le premier mois a un autre prix que les suivants (F05) | Abonnement créé hors Checkout : authentification forte du premier paiement hors session |
