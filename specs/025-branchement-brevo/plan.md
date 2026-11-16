# Implementation Plan: F25 — Branchement de Brevo

**Branch**: `025-branchement-brevo` (travail sur `main`) | **Date**: 2026-11-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/025-branchement-brevo/spec.md`

## Summary

Écrire le mode réel du connecteur emailing (`src/connecteurs/emailing/real/`) sur l'API
transactionnelle de Brevo, activé par `CONNECTOR_EMAILING=real`. Le site garde tout ce qu'il
fait déjà (F10) : une ligne `Envoi` par clé, reprise après panne, suivi relevé par tâche
planifiée, suspension des adresses qui rejettent. F25 ajoute :

- le transport réel (envoi, suivi, contacts), avec idempotence par étiquette de clé ;
- la **garde de recette** : variables `EMAILING_ENVIRONNEMENT` et
  `EMAILING_ADRESSES_AUTORISEES`, appliquée dans le domaine (envoi annulé et conservé,
  consultable) et redoublée dans le connecteur (jamais d'envoi hors liste) ;
- le relevé du suivi toutes les 5 minutes (au lieu de 15), sans webhook ;
- la remontée des **plaintes** (signalement comme indésirable), qui retirent le consentement
  commercial ;
- le repli des notifications d'équipe demandées par SMS vers l'email.

## Technical Context

**Language/Version**: TypeScript 5 (Node 24), Next.js (App Router) — inchangé

**Primary Dependencies**: aucune nouvelle ; appels HTTP par `fetch` (pas de SDK Brevo, R1)

**Storage**: PostgreSQL du site (Prisma) — modèles `Envoi`, `AdresseRejetee`,
`MessageDemonstration` existants ; aucune migration (R8)

**Testing**: Vitest (tests de contrat communs, tests unitaires du client avec `fetch`
injecté), Playwright inchangé

**Target Platform**: Scalingo (site de recette, puis site public)

**Project Type**: application web (site + back-office), structure existante

**Performance Goals**: email parti en moins de 2 minutes après l'événement ; état de remise
visible en moins de 5 minutes (SC-003)

**Constraints**: 300 emails par jour (offre gratuite) ; clé API hors dépôt ; aucune donnée
de patient ni de carte ; recette sans envoi aux vrais clients

**Scale/Scope**: quelques dizaines à quelques centaines d'emails par jour

## Constitution Check

| Principe | Vérification | État |
|---|---|---|
| III. Connecteurs | Seul `src/connecteurs/emailing/real/` parle à Brevo ; bascule par configuration ; mêmes erreurs ; tests de contrat communs | ✅ |
| III. Données fictives | La garde existante (`garde-donnees-fictives`) reste devant le mode réel | ✅ |
| IV. Aucune donnée patient | Seuls adresse, objet, rendu, texte, étiquette technique transmis (FR-009) | ✅ |
| V. Sécurité | Clé dans la configuration Scalingo seulement, masquée dans erreurs et journaux | ✅ |
| VI. Règles paramétrables | Destinataires d'alertes au back-office (existant) ; liste d'adresses autorisées = configuration d'environnement, pas une règle commerciale | ✅ |
| X. Incréments testables | Critères [Phase 1] (configuration, garde, démo inchangée) et [Phase 3] (envois réels) | ✅ |

Aucune violation. Réévaluée après conception : inchangée.

## Project Structure

### Documentation (this feature)

```text
specs/025-branchement-brevo/
├── plan.md              # ce fichier
├── research.md          # décisions R1–R12
├── data-model.md        # configuration, correspondances, états
├── quickstart.md        # vérification en recette
├── contracts/
│   └── emailing-reel.md # évolution du contrat + correspondance Brevo
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/lib/config.ts                         # + EMAILING_ENVIRONNEMENT, adresses autorisées
src/connecteurs/emailing/
├── interfaces/index.ts                   # SuiviEnvoi + plainte (R5)
├── demo/index.ts                         # plainte simulée (@plainte.demo.explocardio.test)
└── real/
    ├── index.ts                          # creerEmailingReel(manquantes, env)
    ├── client.ts                         # appels HTTP Brevo, délai, masquage de la clé
    ├── correspondance.ts                 # événements Brevo → SuiviEnvoi ; erreurs → erreurs du contrat
    (garde de recette : src/lib/garde-recette-emailing.ts, partagée avec le domaine)
src/connecteurs/registre.ts               # passe env au mode réel emailing
src/domaine/emailing/envoi.ts             # garde de recette avant envoi ; transactionnels d'abord
src/domaine/emailing/suivi.ts             # plainte → consentement commercial retiré
src/file-attente/travailleurs.ts          # emails-suivi toutes les 5 minutes
app/(back-office)/admin/emails/page.tsx   # envois « bloqués en recette » consultables
tests/contract/emailing.test.ts           # destinataire de test réel, cas propres au mode
tests/unit/emailing-reel/*.test.ts        # client, correspondance, garde
```

**Structure Decision**: même organisation que le mode réel d'Odoo (F14) : un client HTTP
isolé, une couche de correspondance, une garde d'environnement.

## Phases de mise en œuvre

1. **Configuration et garde** [Phase 1] : variables, validation, garde de recette (domaine et
   connecteur), affichage des envois bloqués. Testable sans clé Brevo.
2. **Client et envoi** : envoi, en-têtes de désinscription, idempotence, erreurs.
3. **Suivi** : correspondance des événements, plaintes, relevé toutes les 5 minutes.
4. **Contacts et équipe** : reflet des consentements, repli SMS → email.
5. **Recette** [Phase 3] : clé de test sur le site de recette, scénarios du quickstart.

## Actions hors code (Pauline / Régis)

- Créer la clé API Brevo (SMTP et API › Clés API) au moment de la recette et la saisir dans
  Scalingo (`EMAILING_API_KEY`), une par site ; ne jamais la transmettre dans une
  conversation.
- Renseigner `EMAILING_ADRESSES_AUTORISEES` sur le site de recette (adresses de l'équipe et
  boîtes de test).
- Vérifier en recette que Brevo n'ajoute aucun pied de page ni logo (offre gratuite, R10).

## Complexity Tracking

Aucune entorse à justifier.
