---
description: "Liste des tâches — F11 Connecteurs et base de démonstration (phase 1)"
---

# Tasks: F11 — Connecteurs et base de démonstration (phase 1)

**Input**: documents de conception de `specs/011-connecteurs-base-demonstration/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md),
[demo-references.md](demo-references.md)

**Tests** : demandés par la spec (FR-006, SC-003, SC-004) et par la constitution
(principe X). Les tests de contrat et de parcours sont donc inclus et écrits **avant**
l'implémentation qu'ils vérifient.

**Organisation** : par user story de la spec, pour que chaque story soit réalisable et
vérifiable seule.

## Format : `[ID] [P?] [Story] Description`

- **[P]** : réalisable en parallèle (fichiers différents, sans dépendance à une tâche non
  terminée)
- **[Story]** : user story concernée (US1 à US8)
- Chemins relatifs à la racine du dépôt, selon la structure de [plan.md](plan.md)

## Conventions communes à toutes les tâches

- TypeScript en mode strict ; textes visibles en français, au vouvoiement.
- Aucune couleur, police ni rayon codé en dur : uniquement les variables `--ec-*` et le thème
  `styles/theme.css` (principe VII).
- Aucune page ni composant n'importe une implémentation de connecteur ni un SDK externe :
  seulement les interfaces de `src/connecteurs/*/interfaces` via `src/connecteurs/registre.ts`
  (principe III).
- Aucune donnée de patient, de carte bancaire ni mot de passe en clair dans les données, les
  journaux ou les messages (principes IV et V).
- Toute écriture vers un connecteur reçoit une clé d'idempotence ([contracts/common.md](contracts/common.md)).

---

## Phase 1: Setup (infrastructure partagée)

**Purpose** : créer l'application et ses outils.

- [ ] T001 Initialiser l'application Next.js (App Router, TypeScript strict) à la racine du dépôt : `package.json`, `tsconfig.json` (`"strict": true`), `next.config.ts`, `app/layout.tsx`, `app/page.tsx` provisoire, `.nvmrc` (Node.js LTS)
- [ ] T002 [P] Configurer ESLint et Prettier dans `eslint.config.mjs` et `.prettierrc`, avec les règles TypeScript et Next.js recommandées
- [ ] T003 [P] Configurer Vitest dans `vitest.config.ts` (dossiers `tests/unit` et `tests/contract`) et Playwright dans `playwright.config.ts` (dossier `tests/e2e`, intégration `@axe-core/playwright`)
- [ ] T004 [P] Créer `.env.example` listant, **sans aucune valeur réelle** : `SITE_MODE` (`demo` ou `prod`), `CONNECTOR_ODOO`, `CONNECTOR_STRIPE`, `CONNECTOR_PCA`, `CONNECTOR_EMAILING` (`demo` ou `real`, défaut `demo`), `PCA_DEMO_SUBMODE` (`auto` ou `manual`), `DATABASE_URL`, `DEMO_DATABASE_URL`, `AUTH_SECRET` ; compléter `.gitignore` pour exclure tous les `.env*` sauf `.env.example`
- [ ] T005 [P] Ajouter les fichiers de la police Inter (graisses 300, 400, 500, 600 et italiques 300, 400) dans `public/fonts/inter/` et déclarer la police locale dans `app/fonts.ts` ; aucun appel à Google Fonts
- [ ] T006 Retirer la ligne `@import url("https://fonts.googleapis.com/…")` de `docs/brand/tokens.css` (F11, FR-042) et importer `docs/brand/tokens.css` dans `app/globals.css`
- [ ] T007 Créer `styles/theme.css` : bloc `@theme` de Tailwind CSS 4 déclarant couleurs, police, rayons et espacements **uniquement à partir des variables `--ec-*`** de `docs/brand/tokens.css` ; l'importer dans `app/globals.css`
- [ ] T008 [P] Créer les composants à la charte dans `src/ui/` : `Button.tsx` (`ec-btn` principal et secondaire), `Card.tsx` (`ec-card`), `Kicker.tsx` (`ec-kicker` avec `ec-dots`), `Badge.tsx` (`ec-badge`), `Placeholder.tsx` (`ec-placeholder`), `Logo.tsx` (SVG de `docs/brand/assets/`, versions horizontale, empilée et blanche, jamais recomposées en texte)
- [ ] T009 Ajouter dans `package.json` les scripts prévus par [quickstart.md](quickstart.md) : `dev`, `build`, `lint`, `test`, `test:contract`, `test:e2e`, `test:no-egress`, `test:lighthouse`, `check:contrast`, `demo:seed`, `demo:reset`, `db:migrate`

---

## Phase 2: Foundational (prérequis bloquants)

**Purpose** : socle commun à toutes les user stories.

**⚠️ CRITICAL** : aucune user story ne commence avant la fin de cette phase.

### Bases de données

- [ ] T010 Créer le schéma de la base du site dans `prisma/site/schema.prisma` selon [data-model.md](data-model.md) §1 : `Utilisateur` (rôle : `client`, `admin`, `commercial`, `support`), `CompteClient` (type : `medecin` ou `structure` ; statut : `email_a_confirmer`, `en_attente`, `valide`, `refuse`, `suspendu` ; `odoo_partner_ref` ; drapeau « compte de démonstration »), `Adresse` (type : `cabinet`, `livraison`, `facturation`), `Consentement`, `Session`, `Contenu` (type : `bandeau`, `tuile`, `actualite`, `page`, `faq`, `tutoriel`, `notice` ; état : `preparation`, `publie`, `retire`), `ContenuProduit` (rattaché par `default_code`), `Parametre`, `HistoriqueParametre`, `DemandeFinancement` (statut : `recue`, `en_etude`, `accordee`, `refusee`), `DemandeDevis` (statut : `recue`, `en_cours`, `traitee`), `MessageContact`, `JournalConnecteur`, `JournalAction`, `EvenementPaiementTraite`, `MessageDemonstration` (type : `email_client`, `notification_equipe_email`, `notification_equipe_sms`), `PanneSimulee` ; « un RPPS par compte » en contrainte d'unicité
- [ ] T011 Créer le schéma de la base de démonstration dans `prisma/demo/schema.prisma` selon [data-model.md](data-model.md) §2, avec le vocabulaire d'Odoo : `Partenaire`, `Categorie`, `ModeleArticle` (type : `equipement`, `consommable`, `accessoire`, `logiciel`, `service`), `Variante` (`default_code`, référence fabricant, référence fictive signalée, prix HT, taux de TVA, **drapeau « prix inventé »**), `Stock` (état : `disponible`, `delai`, `indisponible` ; délai en jours), `NumeroSerie` (statut du parc : `disponible`, `loue`, `en_retour`, `en_maintenance`), `ListePrix`, `BaremeFinancement`, `OffreMiseADisposition`, `CommandeVente`, `LigneCommande`, `Abonnement` (objet : `mise_a_disposition`, `logiciel`), `Facture` (avoirs inclus), `ProgrammeFidelite`, `MouvementCagnotte`, `DroitAssistance`, `Promotion`, `Opportunite` (type : `financement`, `devis`), `AccesCloud` (état : `a_ouvrir`, `actif`, `grace`, `suspendu`, `ferme`) ; chaque entité porte `est_fictif` à vrai par défaut ; **aucune entité de garantie ni de SAV**
- [ ] T012 Créer les deux clients de base de données dans `src/lib/db/site.ts` et `src/lib/db/demo.ts` ; le client de démonstration refuse de s'initialiser si `SITE_MODE` ne vaut pas `demo` ou si `DEMO_DATABASE_URL` est absente
- [ ] T013 Générer les migrations initiales des deux bases (`prisma/site/migrations/`, `prisma/demo/migrations/`) et brancher le script `db:migrate`

### Connecteurs : socle

- [ ] T014 [P] Créer les erreurs typées communes dans `src/connecteurs/erreurs.ts` : `ServiceUnavailable`, `PaymentDeclined`, `AuthenticationRequired`, `OutOfStock`, `CloudAccessDenied`, `NotFound`, `ConfigurationIncomplete`, `DemoDataRejected`, chacune avec un code stable et un message en français pour l'équipe ([contracts/common.md](contracts/common.md))
- [ ] T015 [P] Créer la validation de la configuration dans `src/lib/config.ts` : lecture de `SITE_MODE` et des `CONNECTOR_*` (défaut `demo`) ; liste des variables exigées par chaque connecteur en mode `real` ; aucune variable de service réel exigée en mode `demo`
- [ ] T016 Créer le registre des connecteurs dans `src/connecteurs/registre.ts` : seul point d'accès aux connecteurs ; choisit l'implémentation `demo` ou `real` par connecteur selon `src/lib/config.ts` ; un connecteur `real` incomplet lève `ConfigurationIncomplete` à chaque appel et ne bascule jamais seul en démonstration (FR-007)
- [ ] T017 [P] Créer l'enveloppe de journalisation dans `src/connecteurs/journal.ts` : chaque appel inscrit dans `JournalConnecteur` (connecteur, mode, opération, objet, résultat, motif, durée), sans donnée de carte, de patient ni mot de passe
- [ ] T018 [P] Créer la file d'attente dans `src/file-attente/index.ts` avec pg-boss sur la base du site : clé d'idempotence obligatoire, reprises espacées, alerte à l'administrateur après 5 échecs successifs d'une même tâche
- [ ] T019 [P] Créer le harnais des tests de contrat dans `tests/contract/harness.ts` : exécute une même suite contre l'implémentation désignée par `CONNECTOR_*` ; ignore les suites `real` si les identifiants de test sont absents

### Contrôles automatiques

- [ ] T020 Ajouter à `eslint.config.mjs` une règle d'imports restreints : interdit d'importer `src/connecteurs/**/demo/**`, `src/connecteurs/**/real/**` et tout SDK de service externe (Stripe, client Odoo, client de l'outil d'emailing) hors de `src/connecteurs/` (principe III)
- [ ] T021 [P] Ajouter les règles de charte : dans `eslint.config.mjs`, interdiction des couleurs hexadécimales, `rgb()`, `hsl()` et noms de police littéraux, y compris dans les valeurs arbitraires Tailwind (`bg-[#…]`), hors de `docs/brand/` et `styles/theme.css` ; configuration équivalente dans `.stylelintrc.json`
- [ ] T022 [P] Créer `scripts/check-contrast.ts` : lit `docs/brand/tokens.json`, vérifie les paires texte/fond autorisées par `docs/brand/design-system.md` (≥ 4,5:1 texte, ≥ 3:1 composants) et échoue si une couleur pastel (`euca`, `sage`, `blue`, `mint`) est déclarée comme couleur de texte
- [ ] T023 [P] Créer l'intégration continue dans `.github/workflows/ci.yml` : vérification des types, lint (dont charte), `check:contrast`, tests unitaires et de contrat en mode `demo`, parcours Playwright avec axe-core, `test:no-egress`, Lighthouse, scan des secrets (configuration dans `.gitleaks.toml`)

### Authentification et back-office (socle minimal pour F11)

- [ ] T024 Configurer Better Auth dans `src/lib/auth.ts` avec l'adaptateur Prisma de la base du site : email et mot de passe, réinitialisation, double authentification par application avec codes de secours ; double authentification **obligatoire** pour les rôles `admin`, `commercial`, `support`
- [ ] T025 Créer les gardes de rôle dans `src/lib/roles.ts` et la mise en page du back-office `app/(back-office)/admin/layout.tsx`, accessible aux seuls rôles d'équipe ; F13 l'étendra
- [ ] T026 Créer la mise en page commune `app/layout.tsx` avec la police locale, le thème, et un emplacement pour le bandeau de démonstration (rempli par US8)

**Checkpoint** : socle prêt ; les user stories peuvent commencer.

---

## Phase 3: User Story 1 — Parcourir le site avec des données fictives crédibles (Priority: P1) 🎯 MVP

**Goal** : le connecteur Odoo de démonstration sert des données réalistes (catalogue de la
brochure, médecins fictifs, historiques, cas utiles) et applique les règles commerciales
comme le fera Odoo.

**Independent Test** : `npm run demo:seed`, puis `npm run test:contract` (domaines Odoo) et
`tests/unit/seed.test.ts` : catalogue complet, 15 médecins fictifs, cas utiles de FR-015
présents, cinq comptes de démonstration créés, règles de fidélité appliquées comme dans F06.

### Tests de contrat (écrits avant l'implémentation)

- [ ] T027 [P] [US1] Tests de contrat du domaine catalogue dans `tests/contract/odoo/catalogue.test.ts` (catégories, articles d'une catégorie avec filtres, lecture d'un article, prix d'un client, recherche) selon [contracts/odoo.md](contracts/odoo.md) §1
- [ ] T028 [P] [US1] Tests de contrat du domaine stock et parc dans `tests/contract/odoo/stock.test.ts` (disponibilité par formule, réservation avec `OutOfStock`, première date de livraison du parc)
- [ ] T029 [P] [US1] Tests de contrat du domaine clients dans `tests/contract/odoo/clients.test.ts` (créer ou retrouver un partenaire sans doublon avec la même clé, mise à jour, situation d'un client)
- [ ] T030 [P] [US1] Tests de contrat des domaines commandes et factures dans `tests/contract/odoo/commandes.test.ts` et `tests/contract/odoo/factures.test.ts` (commande payée créée une seule fois par clé, lecture, factures et avoirs, PDF)
- [ ] T031 [P] [US1] Tests de contrat du domaine location et abonnements dans `tests/contract/odoo/location.test.ts` (objets `mise_a_disposition` et `logiciel`, résiliation et annulation de résiliation)
- [ ] T032 [P] [US1] Tests de contrat du domaine fidélité dans `tests/contract/odoo/fidelite.test.ts` : avec les paramètres par défaut, une commande éligible de 1 200 € HT crédite 120 € ; 0 % sous 500 €, 5 % de 500 € à 1 000 €, 10 % au-dessus ; seuls consommables et accessoires éligibles ; droits d'assistance ouverts et prolongés ; retrait au remboursement (règles de F06)
- [ ] T033 [P] [US1] Tests de contrat du domaine opportunités dans `tests/contract/odoo/opportunites.test.ts` (copie d'une demande de financement ou de devis, sans doublon par clé)

### Interfaces et implémentations de démonstration

- [ ] T034 [P] [US1] Déclarer les huit interfaces du connecteur Odoo dans `src/connecteurs/odoo/interfaces/` (`catalogue.ts`, `stock.ts`, `clients.ts`, `commandes.ts`, `factures.ts`, `location.ts`, `fidelite.ts`, `opportunites.ts`) selon [contracts/odoo.md](contracts/odoo.md)
- [ ] T035 [US1] Implémenter les domaines catalogue et stock en démonstration dans `src/connecteurs/odoo/demo/catalogue.ts` et `src/connecteurs/odoo/demo/stock.ts`, sur la base de démonstration
- [ ] T036 [US1] Implémenter les domaines clients, commandes et location en démonstration dans `src/connecteurs/odoo/demo/clients.ts`, `commandes.ts` et `location.ts`, avec idempotence par clé
- [ ] T037 [US1] Implémenter le domaine factures en démonstration dans `src/connecteurs/odoo/demo/factures.ts` et la génération des PDF dans `src/connecteurs/odoo/demo/factures-pdf.ts` : numérotation continue, mention « FICTIVE » en en-tête et en filigrane sur toute facture et tout avoir (principe V, FR-032)
- [ ] T038 [US1] Implémenter le domaine fidélité en démonstration dans `src/connecteurs/odoo/demo/fidelite.ts` : applique les règles de F06 à partir des paramètres de `ProgrammeFidelite` et `DroitAssistance` de la base de démonstration ; ce code ne sert qu'en mode démonstration (principe III)
- [ ] T039 [US1] Implémenter le domaine opportunités en démonstration dans `src/connecteurs/odoo/demo/opportunites.ts`
- [ ] T040 [US1] Enregistrer les implémentations Odoo de démonstration dans `src/connecteurs/registre.ts`, chacune enveloppée par `src/connecteurs/journal.ts`

### Jeu de données de départ

- [ ] T041 [P] [US1] Créer le catalogue de démonstration dans `prisma/demo/seed/catalogue.ts` à partir de [demo-references.md](demo-references.md) : marques et modèles de la brochure, vraies références quand elles sont connues (par exemple SunTech Oscar 2 `99-0133-00`, brassards Orbit `98-0239-21` à `98-0239-24`, DMS300-ABP `dms25`), références fictives signalées sinon (Microlife, IEM, Norav, Ergoline, RAM, SunTech Tango M2) ; **prix inventés plausibles, marqués « prix inventé »** ; configurations, consommables compatibles, offres de mise à disposition, barèmes de financement ; aucune lampe MedLED
- [ ] T042 [P] [US1] Créer les partenaires fictifs dans `prisma/demo/seed/partenaires.ts` : une quinzaine de médecins et cabinets, noms, RPPS et SIRET ne correspondant à aucun professionnel réel (FR-016), adresses en France métropolitaine
- [ ] T043 [US1] Créer les historiques et les cas utiles dans `prisma/demo/seed/historiques.ts` : commandes, factures, locations, bons d'achat ; cas de FR-015 : client sans droits d'assistance, client aux droits actifs, location en cours, location en retard de retour, produit en rupture, produit en « délai X jours », bénéficiaire de l'offre de bienvenue, compte en attente de validation
- [ ] T044 [US1] Créer les cinq comptes de démonstration dans `prisma/demo/seed/comptes-demo.ts` (base du site, adresses en `@demo.explocardio.test`) : client avec droits, client sans droits, compte en attente, administrateur, support ; rattachés aux partenaires fictifs correspondants (FR-041) ; identifiants affichés à la fin du remplissage, jamais commités en clair
- [ ] T045 [US1] Créer le point d'entrée `prisma/demo/seed/index.ts` (script `demo:seed`) qui enchaîne T041 à T044 et inscrit le remplissage dans `JournalAction`
- [ ] T046 [US1] Écrire `tests/unit/seed.test.ts` : présence de tout le catalogue, de 15 partenaires environ, de chaque cas de FR-015, des cinq comptes de démonstration, et du drapeau « prix inventé » sur chaque prix (SC-006)

**Checkpoint** : la base de démonstration est complète et le connecteur Odoo de démonstration
passe ses tests de contrat.

---

## Phase 4: User Story 2 — Ne toucher à aucun service réel (Priority: P1)

**Goal** : prouver qu'aucune donnée ne sort vers un service réel en phase 1.

**Independent Test** : `npm run test:no-egress` ne relève aucune requête vers Odoo, Stripe,
la plateforme PCA, l'outil d'emailing ni Google Fonts (SC-003, SC-014).

- [ ] T047 [P] [US2] Écrire `tests/unit/garde-reseau.test.ts` : en mode `demo`, une requête vers un domaine de service réel est refusée et journalisée comme erreur
- [ ] T048 [P] [US2] Écrire `tests/e2e/no-egress.spec.ts` : enregistre toutes les requêtes du navigateur pendant les parcours disponibles et échoue si l'une vise Odoo, Stripe, la plateforme PCA, l'outil d'emailing ou `fonts.googleapis.com` / `fonts.gstatic.com`
- [ ] T049 [US2] Implémenter le garde réseau dans `src/connecteurs/garde-reseau.ts` et l'activer au démarrage du serveur dans `instrumentation.ts` dès qu'un connecteur est en mode `demo` (liste des domaines par connecteur)
- [ ] T050 [US2] Implémenter le refus des données fictives dans `src/connecteurs/garde-donnees-fictives.ts` : toute donnée marquée `est_fictif` transmise à une implémentation `real` lève `DemoDataRejected` et est signalée (FR-017) ; brancher ce contrôle dans le registre
- [ ] T051 [US2] Écrire `tests/unit/donnees-fictives.test.ts` : une donnée de démonstration passée à une implémentation `real` (simulée) est refusée (SC-012)

**Checkpoint** : la non-sortie est vérifiée automatiquement à chaque envoi.

---

## Phase 5: User Story 3 — Basculer un connecteur sans toucher aux pages (Priority: P1)

**Goal** : chaque connecteur se choisit par configuration ; les emplacements du mode réel
existent et refusent de fonctionner sans configuration.

**Independent Test** : passer `CONNECTOR_STRIPE=real` sans identifiants : aucune page modifiée,
le connecteur lève `ConfigurationIncomplete`, la page de paiement de démonstration disparaît ;
configuration mixte fonctionnelle (SC-005).

- [ ] T052 [P] [US3] Écrire `tests/unit/registre.test.ts` : choix `demo`/`real` par variable, défaut `demo`, `ConfigurationIncomplete` en `real` incomplet, aucun repli automatique en démonstration, configuration mixte (un connecteur `real`, les autres `demo`)
- [ ] T053 [P] [US3] Créer les emplacements du mode réel, vides et sûrs : `src/connecteurs/odoo/real/index.ts`, `src/connecteurs/stripe/real/index.ts`, `src/connecteurs/pca/real/index.ts`, `src/connecteurs/emailing/real/index.ts` ; chacun déclare l'interface et lève `ConfigurationIncomplete` tant que F14 ne l'a pas implémenté
- [ ] T054 [US3] Écrire `tests/unit/imports-connecteurs.test.ts` qui exécute la règle de T020 sur `app/` et `src/ui/` et échoue si une page ou un composant importe une implémentation ou un SDK externe
- [ ] T055 [US3] Documenter la bascule dans `src/connecteurs/README.md` : variables, valeurs, comportement en configuration incomplète, lien vers F14

**Checkpoint** : la bascule est prête, sans aucun appel réel possible en phase 1.

---

## Phase 6: User Story 4 — Repartir d'un état propre (Priority: P1)

**Goal** : réinitialiser en moins d'une minute, depuis le back-office ou par une commande.

**Independent Test** : après des commandes et des modifications, `npm run demo:reset` puis la
réinitialisation depuis le back-office : état de départ retrouvé en moins d'une minute,
contenus et paramètres intacts, cinq comptes de démonstration utilisables (SC-002, SC-013).

- [ ] T056 [P] [US4] Écrire `tests/e2e/reinitialisation.spec.ts` : séance (commande, modification de prix, compte créé), réinitialisation, vérification du périmètre de [data-model.md](data-model.md) §4, durée inférieure à une minute, connexion immédiate avec chacun des cinq comptes de démonstration
- [ ] T057 [US4] Créer `scripts/demo-reset.ts` (script `demo:reset`) : vide et recrée la base de démonstration, supprime l'activité de test de la base du site (comptes créés pendant les séances, demandes de financement et de devis, messages de contact, boîte de démonstration, pannes simulées), conserve contenus, contenus produits, paramètres et leur historique, recrée le jeu de départ et les cinq comptes ; refuse de s'exécuter si un connecteur concerné est en mode `real` (FR-023)
- [ ] T058 [US4] Ajouter un verrou de réinitialisation dans `src/lib/demo/verrou.ts` : pendant l'opération, les pages affichent un message d'attente au lieu d'un état partiel, et une commande en cours est interrompue avec un message au testeur
- [ ] T059 [US4] Créer l'action de réinitialisation du back-office dans `app/(back-office)/admin/demonstration/reinitialiser/page.tsx` et son action serveur : administrateur uniquement, confirmation explicite, inscription dans `JournalAction` (auteur, date)

**Checkpoint** : chaque séance de critique peut repartir d'un état propre.

---

## Phase 7: User Story 5 — Tester des variantes de prix et de règles (Priority: P2)

**Goal** : écran de démonstration du back-office pour modifier prix, stocks et paramètres
commerciaux fictifs ; absent en mode réel.

**Independent Test** : modifier un prix, un stock et un taux de bons d'achat ; effet visible en
moins de 5 secondes ; paramètres incohérents refusés ; écran inaccessible au commercial et au
support, absent avec `CONNECTOR_ODOO=real` (SC-009, SC-008 de F13).

- [ ] T060 [P] [US5] Écrire `tests/e2e/ecran-demonstration.spec.ts` couvrant les scénarios de la US5 (modification, délai, refus, rôles, disparition en mode réel)
- [ ] T061 [US5] Ajouter au connecteur Odoo de démonstration les opérations réservées à la démonstration dans `src/connecteurs/odoo/demo/administration.ts` : lire et modifier prix, stocks (état `disponible`, `delai` avec jours, `indisponible`) et paramètres commerciaux (tarifs de mise à disposition, remises, promotions, paliers et taux des bons d'achat, seuil et durée des droits d'assistance) ; validation : pas de prix négatif, paliers sans chevauchement ni trou
- [ ] T062 [US5] Créer l'écran `app/(back-office)/admin/demonstration/page.tsx` (consultation de la base) et ses sous-pages `prix/`, `stocks/`, `parametres-commerciaux/` : administrateur uniquement, présent seulement si `CONNECTOR_ODOO=demo` (FR-027)
- [ ] T063 [US5] Revalider le cache après chaque modification dans `src/lib/cache.ts` (étiquettes du catalogue et des prix), pour un effet visible en moins de 5 secondes
- [ ] T064 [US5] Journaliser chaque modification dans `JournalAction` (auteur, date, ancienne et nouvelle valeur)

**Checkpoint** : l'offre peut être essayée pendant la critique sans développeur.

---

## Phase 8: User Story 6 — Relire les emails et les notifications (Priority: P2)

**Goal** : connecteur emailing de démonstration et boîte de démonstration du back-office.

**Independent Test** : déclencher un email client et une notification d'équipe (email et SMS) ;
les retrouver dans la boîte, séparés et filtrables ; aucun envoi réel (SC-007).

- [ ] T065 [P] [US6] Écrire `tests/contract/emailing.test.ts` selon [contracts/emailing.md](contracts/emailing.md) (email transactionnel, notification d'équipe `email` et `sms`, contact marketing, état de remise)
- [ ] T066 [P] [US6] Déclarer l'interface dans `src/connecteurs/emailing/interfaces/index.ts`
- [ ] T067 [P] [US6] Créer le gabarit d'email à la charte dans `src/emails/Gabarit.tsx` (React Email : logo SVG, Inter avec police de repli, couleur d'action, ton sobre, coordonnées WhatsApp fictives en démonstration) et un modèle d'essai `src/emails/Essai.tsx`
- [ ] T068 [US6] Implémenter `src/connecteurs/emailing/demo/index.ts` : aucun envoi réel ; enregistre chaque message dans `MessageDemonstration` avec type (`email_client`, `notification_equipe_email`, `notification_equipe_sms`), destinataire, objet, rendu et déclencheur ; état de remise simulé à « remis », ou « rejeté » pour les adresses de test prévues ; enregistrement dans le registre
- [ ] T069 [US6] Créer la boîte de démonstration `app/(back-office)/admin/demonstration/boite/page.tsx` : administrateur uniquement, mode démonstration uniquement, filtres par destinataire, type et date, emails clients séparés des notifications d'équipe, aperçu du rendu

**Checkpoint** : tous les messages du site sont relisibles sans en envoyer aucun.

---

## Phase 9: User Story 7 — Simuler les paiements et les imprévus (Priority: P2)

**Goal** : connecteurs Stripe et PCA de démonstration, page de paiement de démonstration,
gestionnaire d'événements idempotent, pannes simulées.

**Independent Test** : paiements accepté, refusé et avec authentification forte (Visa,
Mastercard, American Express, SEPA) ; confirmations tardive et répétée sans doublon ; échéance
et remboursement simulés ; accès Cloud ouvert, suspendu, fermé dans les deux sous-modes ; panne
simulée d'un connecteur.

### Tests

- [ ] T070 [P] [US7] Écrire `tests/contract/stripe.test.ts` selon [contracts/stripe.md](contracts/stripe.md) : sessions de paiement et d'abonnement, remboursement, résiliation, vérification d'événement, événements identiques dans les deux modes
- [ ] T071 [P] [US7] Écrire `tests/contract/pca.test.ts` selon [contracts/pca.md](contracts/pca.md) : ouvrir, délai de grâce, suspendre, rétablir, fermer, lire ; sous-modes `auto` et `manual` (état `a_ouvrir` en manuel)
- [ ] T072 [P] [US7] Écrire `tests/e2e/paiement-demo.spec.ts` : issue « accepté » par American Express, « refusé », « authentification forte » ; confirmation répétée et tardive traitées une seule fois

### Paiement

- [ ] T073 [P] [US7] Déclarer l'interface `src/connecteurs/stripe/interfaces/index.ts` et les types d'événements communs
- [ ] T074 [US7] Implémenter `src/connecteurs/stripe/demo/index.ts` : sessions renvoyant l'adresse de la page de démonstration, signature de démonstration, remboursement et résiliation simulés ; enregistrement dans le registre
- [ ] T075 [US7] Créer la page de paiement de démonstration `app/demo/paiement/page.tsx` : montant TTC, choix Visa, Mastercard, American Express ou SEPA, issue (accepté, refusé, authentification forte), options « confirmation tardive » et « confirmation répétée » ; présente seulement si `CONNECTOR_STRIPE=demo` ; aucun champ de numéro de carte
- [ ] T076 [US7] Créer le gestionnaire d'événements `app/api/evenements/paiement/route.ts` : vérification de signature par le connecteur, traitement idempotent via `EvenementPaiementTraite`, mêmes effets quel que soit le mode
- [ ] T077 [US7] Ajouter à l'écran de démonstration la simulation d'une échéance mensuelle (payée ou refusée) et d'un remboursement dans `app/(back-office)/admin/demonstration/paiements/page.tsx`

### Accès Cloud

- [ ] T078 [P] [US7] Déclarer l'interface `src/connecteurs/pca/interfaces/index.ts`
- [ ] T079 [US7] Implémenter `src/connecteurs/pca/demo/index.ts` : états `a_ouvrir`, `actif`, `grace`, `suspendu`, `ferme` tenus dans `AccesCloud` ; sous-mode selon `PCA_DEMO_SUBMODE` (en `manual`, création d'une tâche à confirmer) ; seules l'identité professionnelle, l'email, le RPPS ou SIRET, le cabinet et les logiciels sont manipulés ; enregistrement dans le registre

### Pannes simulées

- [ ] T080 [US7] Faire consulter `PanneSimulee` par chaque implémentation de démonstration (Odoo, Stripe, PCA, emailing) dans `src/connecteurs/panne-simulee.ts` : `ServiceUnavailable` si la panne est active (FR-025)
- [ ] T081 [US7] Ajouter à l'écran de démonstration l'activation et la désactivation d'une panne par connecteur dans `app/(back-office)/admin/demonstration/pannes/page.tsx` (administrateur, mode démonstration)

**Checkpoint** : paiements, accès Cloud et imprévus sont démontrables et testés.

---

## Phase 10: User Story 8 — Accéder au site de démonstration (Priority: P2)

**Goal** : site de démonstration protégé par mot de passe, non indexé, avec bandeau permanent.

**Independent Test** : aucune page sans mot de passe ; bandeau sur toutes les pages ;
`robots.txt` et en-têtes de non-indexation ; changement du mot de passe qui ferme les sessions
(SC-010).

- [ ] T082 [P] [US8] Écrire `tests/e2e/acces-demo.spec.ts` : accès refusé sans mot de passe, accordé avec, bandeau présent et non masquable, `robots.txt` interdisant tout, en-tête `X-Robots-Tag: noindex, nofollow`, sessions fermées après changement du mot de passe
- [ ] T083 [US8] Créer l'intergiciel `middleware.ts` : actif si `SITE_MODE=demo` ; vérifie un cookie signé portant le numéro de version du mot de passe ; sinon redirige vers `app/demo/acces/page.tsx` ; ajoute `X-Robots-Tag: noindex, nofollow` à toutes les réponses
- [ ] T084 [US8] Créer la page de saisie du mot de passe `app/demo/acces/page.tsx` et son action serveur : compare au mot de passe haché stocké dans `Parametre`, pose le cookie signé
- [ ] T085 [P] [US8] Créer `app/robots.ts` : interdiction totale quand `SITE_MODE=demo`
- [ ] T086 [P] [US8] Créer le bandeau `src/ui/BandeauDemo.tsx` « Version de démonstration — données fictives », non masquable, distinct du bandeau promotionnel, affiché par `app/layout.tsx` quand `SITE_MODE=demo`
- [ ] T087 [US8] Ajouter le changement du mot de passe de démonstration dans `app/(back-office)/admin/demonstration/acces/page.tsx` : administrateur uniquement ; incrémente la version, ce qui ferme toutes les sessions ; inscrit l'action dans `JournalAction`
- [ ] T088 [US8] Initialiser dans le jeu de départ les paramètres de démonstration : mot de passe initial (haché), numéro WhatsApp fictif, dans `prisma/demo/seed/parametres-demo.ts`

**Checkpoint** : le site de démonstration peut être publié sur `demo.explocardio.fr`.

---

## Phase 11: Polish & Cross-Cutting Concerns

- [ ] T089 [P] Configurer Lighthouse CI dans `tests/lighthouse/lighthouserc.json` (profil mobile, réseau 4G simulé, budget : élément principal affiché en moins de 2 s) sur les pages catalogue dès qu'elles existent (F03)
- [ ] T090 [P] Créer `tests/e2e/parcours/README.md` listant les parcours de bout en bout attendus par SC-001 (inscription, achat, mise à disposition, fidélité, demande de financement ou de devis) : chaque module F01 à F10 y ajoute son parcours en mode démonstration ; SC-001 est atteint quand tous passent
- [ ] T091 [P] Rédiger `docs/demonstration.md` pour l'équipe : ouvrir le site de démonstration, comptes de démonstration et cas illustrés, boîte de démonstration, écran de démonstration, réinitialisation, avertissement « prix inventés à remplacer avant toute présentation à un médecin »
- [ ] T092 Dérouler [quickstart.md](quickstart.md) de bout en bout et corriger les écarts
- [ ] T093 Vérifier la conformité finale : `npm run lint`, `npm run check:contrast`, `npm run test:contract`, `npm run test:e2e`, `npm run test:no-egress` passent en intégration continue

---

## Dependencies & Execution Order

### Phases

- **Setup (Phase 1)** : aucune dépendance.
- **Foundational (Phase 2)** : après la phase 1 ; bloque toutes les user stories.
- **US1 (Phase 3)** : après la phase 2. C'est le MVP.
- **US2 (Phase 4)** et **US3 (Phase 5)** : après la phase 2 ; indépendantes de US1 (elles
  s'appuient sur le registre), mais leurs tests sont plus parlants une fois US1 faite.
- **US4 (Phase 6)** : après US1 (elle recrée le jeu de départ).
- **US5 (Phase 7)** : après US1 (elle modifie la base remplie).
- **US6 (Phase 8)** : après la phase 2 ; indépendante.
- **US7 (Phase 9)** : après la phase 2 ; T077 et T081 utilisent l'écran de US5.
- **US8 (Phase 10)** : après la phase 2 ; indépendante. À faire tôt si l'on veut publier la
  démonstration rapidement.
- **Polish (Phase 11)** : après les user stories voulues.

### Dans chaque user story

Tests de contrat et de parcours d'abord (ils doivent échouer), puis interfaces, puis
implémentations de démonstration, puis écrans.

### Graphe de complétion

```text
Setup → Foundational ─┬─ US1 (MVP) ─┬─ US4
                      │             └─ US5 ─┐
                      ├─ US2               ├─ US7
                      ├─ US3               │
                      ├─ US6 ──────────────┘
                      └─ US8
                                       → Polish
```

## Parallel Example: User Story 1

```text
# Tests de contrat Odoo, en parallèle :
T027 catalogue · T028 stock · T029 clients · T030 commandes et factures
T031 location · T032 fidélité · T033 opportunités

# Puis, en parallèle :
T034 interfaces · T041 catalogue de démonstration · T042 partenaires fictifs
```

## Parallel Example: User Story 7

```text
T070 tests Stripe · T071 tests PCA · T072 parcours de paiement
T073 interface Stripe · T078 interface PCA
```

## Implementation Strategy

### MVP d'abord

1. Phase 1 (Setup) puis phase 2 (Foundational).
2. Phase 3 (US1) : base de démonstration complète et connecteur Odoo de démonstration.
3. **Valider** : tests de contrat Odoo et `tests/unit/seed.test.ts`.

### Livraison incrémentale

1. US1 → données crédibles.
2. US2 + US3 → garanties de non-sortie et de bascule.
3. US8 → publication possible de la démonstration protégée.
4. US4 → séances de critique répétables.
5. US6 + US7 → emails, paiements, accès Cloud, imprévus.
6. US5 → variantes de prix et de règles.
7. Polish.

### Remarque sur SC-001

F11 fournit les connecteurs, les données et les outils. Les parcours complets (inscription,
achat, mise à disposition, fidélité, demande de financement ou de devis) sont construits par
F01 à F10 ; chacun y ajoute son test de bout en bout en mode démonstration (T090). SC-001 est
atteint quand ces modules sont livrés et que leurs parcours passent.
