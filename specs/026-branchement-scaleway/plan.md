# Implementation Plan: F26 — Branchement de Scaleway (stockage des fichiers)

**Branch**: `026-branchement-scaleway` (travail sur `main`) | **Date**: 2026-11-18 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/026-branchement-scaleway/spec.md`

## Summary

Créer un cinquième connecteur, **stockage**, et y faire passer les fichiers téléversés au
back-office. Démonstration : la table `fichier_stocke` de la base du site (comportement
actuel). Réel : un compartiment Scaleway privé à Paris, propre à chaque site, choisi par
`CONNECTOR_STOCKAGE=real`. Le site garde ses contrôles, ses adresses `/stockage/…` et ses
en-têtes ; il relit les fichiers dans le compartiment (par plages pour les vidéos). Une
commande de reprise copie les fichiers déjà en base, rejouable et vérifiée. Amendement de la
constitution (2.4.0).

## Technical Context

**Language/Version**: TypeScript 5 (Node 24), Next.js (App Router) — inchangé

**Primary Dependencies**: `@aws-sdk/client-s3` (nouveau, connecteur réel uniquement, R1)

**Storage**: PostgreSQL du site — table `fichier_stocke` existante, aucune migration ;
Scaleway Object Storage `fr-par` en mode réel

**Testing**: Vitest (tests de contrat communs, tests unitaires du mode réel avec client S3
simulé), Playwright inchangé

**Target Platform**: Scalingo (site de recette, puis site public)

**Project Type**: application web (site + back-office), structure existante

**Performance Goals**: image déjà vue affichée en moins d'une seconde (cache navigateur
7 jours, inchangé) ; vidéo lue par plages sans charger 50 Mo en mémoire

**Constraints**: compartiments privés ; clé hors dépôt ; aucun fichier contenant des données
de patient ou personnelles ; adresses publiques inchangées

**Scale/Scope**: quelques centaines de fichiers, vidéos de 50 Mo au plus

## Constitution Check

| Principe | Vérification | État |
|---|---|---|
| III. Connecteurs | Seul `src/connecteurs/stockage/real/` parle à Scaleway ; bascule par configuration ; mêmes erreurs ; tests de contrat communs ; lint étendu à `@aws-sdk/*` | ✅ |
| Connecteurs et services externes | Nouveau service externe → **amendement 2.4.0** (R10), fait avec ce plan | ✅ (amendé) |
| IV. Aucune donnée patient | Seuls les fichiers du back-office ; aucune donnée de patient ni personnelle (FR-016) | ✅ |
| V. Sécurité | Clé dans Scalingo seulement, limitée au stockage du projet ; compartiment privé ; en-têtes de sécurité conservés | ✅ |
| X. Incréments testables | [Phase 1] démonstration et garde ; [Phase 3] recette sur Scaleway | ✅ |

Réévaluée après conception : inchangée.

## Project Structure

### Documentation (this feature)

```text
specs/026-branchement-scaleway/
├── plan.md
├── research.md          # décisions R1–R10
├── data-model.md        # aucune migration ; configuration
├── quickstart.md        # vérifications démonstration et recette
├── contracts/stockage.md
└── checklists/requirements.md
```

### Source Code (repository root)

```text
.specify/memory/constitution.md           # 2.4.0 : stockage de fichiers (R10)
eslint.config.mjs                         # + motif @aws-sdk/* interdit hors connecteurs
src/lib/config.ts                         # + connecteur « stockage », variables, garde du nom
src/connecteurs/stockage/
├── interfaces/index.ts                   # ConnecteurStockage, Plage (contrat)
├── chemins.ts                            # validation des chemins et des plages (commune)
├── demo/index.ts                         # table fichier_stocke
└── real/
    ├── index.ts                          # creerStockageReel(manquantes, env)
    ├── client.ts                         # client S3 Scaleway, délais, erreurs → contrat
    └── reprise.ts                        # copie vérifiée base → compartiment
src/connecteurs/registre.ts               # + stockage()
src/lib/stockage.ts                       # contrôles inchangés ; dépôt par le connecteur ; lecture avec secours
app/stockage/[...chemin]/route.ts         # flux, plages, 503 en panne ; en-têtes inchangés
app/(back-office)/admin/{catalogue,contenus,contenus/aide}/actions.ts  # message « momentanément indisponible »
app/(back-office)/admin/page.tsx          # alerte compartiment incohérent
scripts/reprise-stockage.ts               # npm run stockage:reprise [--effacer-la-base]
tests/contract/stockage.test.ts
tests/unit/stockage-reel/*.test.ts        # client, erreurs, reprise, garde
src/connecteurs/README.md, docs/deploiement-scalingo.md   # mode d'emploi
```

**Structure Decision**: même organisation que les modes réels de Stripe et Brevo : client
isolé, correspondance des erreurs, garde d'environnement.

## Phases de mise en œuvre

1. **Lot 1 — Connecteur et démonstration** [Phase 1] : amendement, configuration et garde,
   contrat, mode démonstration, passage de `src/lib/stockage.ts` et de la route par le
   connecteur, messages de panne, alerte. Aucune différence visible ; toute la suite passe.
2. **Lot 2 — Mode réel et reprise** : client S3, lectures par plage en flux, tests unitaires
   avec client simulé, script de reprise, documentation Scalingo.
3. **Recette** [Phase 3] : compartiment de recette, quickstart §3 à §5.

## Actions hors code (Pauline / Régis)

- Créer le compte Scaleway professionnel d'ExploCardio.fr (aucun n'existe : le domaine a
  été acheté par o2switch), avec un moyen de paiement.
- Créer le projet `ExploCardio.fr`, les compartiments privés `explocardio-recette` puis
  `explocardio-production` (région Paris), et une application IAM par site avec la
  politique de R8.
- Générer la clé au moment de la saisie dans Scalingo ; ne jamais la transmettre dans une
  conversation.

## Complexity Tracking

Aucune entorse à justifier (le nouveau service est couvert par l'amendement 2.4.0).
