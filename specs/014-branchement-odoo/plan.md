# Implementation Plan: F14 — Branchement d'Odoo

**Branch**: `014-branchement-odoo` | **Date**: 2026-11-06 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/014-branchement-odoo/spec.md`

## Summary

F14 donne au connecteur Odoo son mode réel, par lots. Ce plan détaille le **lot 1** :
lecture du catalogue, du stock et des prix client, plus le rapport de contrôle des données
qui servira de liste de travail à Régis pendant qu'il remplit Odoo. C'est un lot de **lecture
seule**, utile tout de suite sur la copie neutralisée lue le 2026-11-06 (Odoo 20). Les lots 2
à 5 (clients, commandes, location et factures, masquage de la fidélité) sont esquissés et
seront détaillés à réception des réponses de Régis et de l'intégrateur.

Choix principaux (voir [research.md](research.md)) :

- API externe JSON-RPC d'Odoo avec clé, client maison sans dépendance (R1) ;
- données propres au site (marque, type, offre de mise à disposition) dans les **propriétés
  produit** d'Odoo, sans Studio (R2) ;
- correspondance catégories Odoo → rubriques du site, paramètre du back-office (R3) ;
- prix client lus d'après les règles de liste de prix ; le montant de commande reste calculé
  par Odoo (R5) ;
- garde de neutralisation par `database.is_neutralized` (R8).

## Technical Context

**Language/Version**: TypeScript strict, Node.js 24

**Primary Dependencies**: Next.js 16, React 19, Prisma 7 ; aucune nouvelle dépendance (client
JSON-RPC sur `fetch`)

**Storage**: base du site (PostgreSQL) : un paramètre ajouté ; aucune donnée de gestion
copiée — Odoo reste la source, avec le cache existant de 5 minutes (`unstable_cache`,
`src/domaine/catalogue/lecture.ts`)

**Testing**: Vitest (unitaires avec réponses d'Odoo enregistrées, sans réseau ; tests de
contrat communs aux deux modes), Playwright (non-régression de la démonstration)

**Target Platform**: Scalingo (osc-fr1) ; nouvelle application de recette, distincte de
`explocardio` (démonstration et page d'attente)

**Project Type**: application web (site et back-office dans le même projet Next.js)

**Performance Goals**: pages catalogue et fiche < 2 s dans 95 % des cas (SC-006) ; lecture
Odoo mesurée à ≈ 60 ms ; une seule lecture groupée par page grâce au cache

**Constraints**: aucune écriture dans Odoo au lot 1 ; secrets hors du dépôt ; aucune donnée
fictive vers Odoo ; changement Odoo visible en ≤ 15 min (cache 5 min)

**Scale/Scope**: catalogue de l'ordre de 100 à 300 variantes ; quelques centaines de clients

## Constitution Check

| Principe | Vérification | État |
|---|---|---|
| III. Trois phases et des connecteurs | mode réel derrière l'interface existante ; activation par configuration ; aucune page modifiée pour le branchement ; tests de contrat communs ; garde des données fictives inchangée | ✅ |
| III. Odoo source de vérité | aucune donnée de gestion copiée dans la base du site ; cache court seulement | ✅ |
| III. Ne pas dupliquer les règles | le prix client affiché applique les règles lues dans Odoo (R5), sous-ensemble signalé ; le montant de commande est calculé par Odoo. Écart justifié en Complexity Tracking | ⚠️ justifié |
| IV. Aucune donnée patient | rien de tel lu ni envoyé | ✅ |
| V. Sécurité | clé saisie par Pauline ; jamais journalisée ; garde de neutralisation | ✅ |
| VI. Règles au bon endroit | montants (mise à disposition, valeur de remplacement) dans Odoo ; correspondance des rubriques = fonctionnement du site, back-office | ✅ |
| VIII. Accessibilité | page de contrôle du back-office : tableau accessible, mêmes composants que les autres listes | ✅ |
| X. Petits incréments | lot 1 livrable seul ; critères [Phase 1] et [Phase 3] | ✅ |

Re-vérification après conception : inchangée.

## Architecture du lot 1

```text
Pages (inchangées) → domaine/catalogue (cache 5 min) → registre → odoo/real
                                                                 ├─ client.ts       JSON-RPC, délais, reprises, erreurs, masquage de la clé
                                                                 ├─ instantane.ts   lecture groupée (≈ 10 appels, gardée 1 min) et anomalies
                                                                 ├─ neutralisation.ts  garde avant écriture (prête pour le lot 3)
                                                                 ├─ correspondance.ts  catégories Odoo → rubriques du site
                                                                 ├─ proprietes.ts   lecture des propriétés produit
                                                                 ├─ prix.ts         règles de liste de prix (R5)
                                                                 ├─ catalogue.ts    domaine Catalogue
                                                                 ├─ stock.ts        domaine Stock (lectures)
                                                                 └─ controle.ts     rapport de contrôle
```

- `creerOdooReel` construit `catalogue` et `stock` réels ; les autres domaines, et les
  opérations d'écriture du stock, restent `implementationRefusee` (ConfigurationIncomplete).
- Une lecture groupée par appel de page : modèles, variantes, catégories, taxes, règles de
  prix et quantités sont lus en quelques `search_read` puis assemblés.
- La correspondance des catégories est lue dans la base du site par le domaine et passée au
  connecteur à sa construction (le connecteur ne lit pas la base du site lui-même).

## Project Structure

### Documentation (this feature)

```text
specs/014-branchement-odoo/
├── spec.md
├── plan.md              # ce fichier
├── research.md          # constats sur la copie et décisions R1–R11
├── data-model.md        # correspondance avec Odoo 20, propriétés, anomalies
├── quickstart.md        # vérifications
├── contracts/
│   └── odoo-reel.md     # origine de chaque valeur en mode réel, erreurs
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/connecteurs/odoo/
├── interfaces/catalogue.ts      # + type Anomalie, opération controlerDonnees
├── demo/catalogue.ts            # + controlerDonnees sur la base fictive
└── real/
    ├── index.ts                 # catalogue + stock réels, autres domaines refusés
    ├── client.ts
    ├── instantane.ts            # lecture groupée et assemblage
    ├── normaliser.ts
    ├── neutralisation.ts
    ├── correspondance.ts
    ├── proprietes.ts
    ├── prix.ts
    ├── catalogue.ts
    ├── stock.ts
    └── controle.ts
src/lib/config.ts                # + ODOO_ENVIRONNEMENT exigée en mode réel
src/domaine/parametres/catalogue.ts   # + catalogue.correspondance_categories
src/domaine/catalogue/controle.ts     # rapport pour le back-office, export CSV
app/(back-office)/admin/catalogue/controle/page.tsx   # page « Contrôle des données Odoo »
src/connecteurs/README.md        # documentation du mode réel

tests/unit/odoo-reel/            # client, prix, propriétés, correspondance, contrôle, neutralisation
  └── fixtures/                  # réponses d'Odoo 20 enregistrées depuis la copie, anonymisées
tests/contract/odoo/references.ts     # jeux de références « demo » et « copie »
tests/contract/odoo/catalogue.test.ts # + controlerDonnees ; références par environnement
```

**Structure Decision**: tout le mode réel reste sous `src/connecteurs/odoo/real/`, seul
endroit autorisé par le lint à parler à Odoo. Les pages ne changent pas ; seule la page de
contrôle est ajoutée au back-office.

## Secrets et configuration

| Environnement | `CONNECTOR_ODOO` | Base Odoo | `ODOO_ENVIRONNEMENT` |
|---|---|---|---|
| Poste de Pauline | `demo` (travail courant), `real` pour les essais | copie | `recette` |
| `explocardio` (démonstration, page d'attente) | `demo` — inchangé | — | — |
| Application de recette (à créer) | `real` | copie | `recette` |
| Production (ouverture) | `real` | base réelle | `production` |

Les fixtures enregistrées depuis la copie sont **anonymisées** (aucun client, aucun email) et
ne contiennent ni l'adresse de la base ni la clé.

## Lots suivants (esquisse)

| Lot | Contenu | Dépend de |
|---|---|---|
| 2 | Clients (créer ou retrouver par SIRET puis email, coordonnées, situation, archivage), opportunités CRM | réponses §4 du questionnaire |
| 3 | Commandes, devis, réservation de stock, virement, remboursements ; frais de port par produit « Livraison » ; garde de neutralisation active | jeu de test de Régis ; Stripe test |
| 4 | Location (module Location, numéros de série, facturation mensuelle déclenchée par le site), factures et relances | questions §3 et §5 ; parc saisi |
| 5 | Masquage de la fidélité (FR-026) et offre de bienvenue en ligne gratuite (FR-026b) | — (peut avancer en parallèle, phase 1) |

## Décisions à confirmer par Régis et l'intégrateur

Les cinq questions de [research.md](research.md#questions-ajoutées-pour-régis-et-lintégrateur) :
propriétés produit, correspondance des catégories, calcul de prix exposé, packs, barème de
financement. Le lot 1 est construit avec les propositions par défaut ; un changement de
réponse ne touche que `real/`.

## Complexity Tracking

| Écart | Pourquoi nécessaire | Alternative plus simple rejetée |
|---|---|---|
| Le connecteur applique un sous-ensemble des règles de liste de prix pour l'affichage (R5) | Odoo ne propose aucune méthode publique de calcul de prix ; le prix client doit s'afficher sur les fiches | Devis brouillon dans Odoo à chaque consultation : écritures massives dans la gestion ; l'écart est limité à l'affichage, le montant de commande est calculé par Odoo, et toute règle non gérée est signalée |
