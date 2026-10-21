---
description: "Liste des tâches — F13 Back-office du site"
---

# Tasks: F13 — Back-office du site (contenus et paramètres)

**Input**: documents de conception de `specs/013-back-office/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md) ;
socles de F11 à F10 livrés ; décisions D1 à D11 validées le 2026-10-21.

**Tests** : exigés par la constitution (principe X) et par SC-001 à SC-011 ; écrits **avant**
l'implémentation qu'ils vérifient.

## Format : `[ID] [P?] [Story] Description`

- **[P]** : réalisable en parallèle (fichiers différents, sans dépendance non terminée)
- **[Story]** : US1 à US9

## Conventions communes

Celles de F11 à F10 : TypeScript strict ; français au vouvoiement ; tokens de la charte ;
aucune modification de produit, prix, stock, client, commande ou facture (FR-014) ; chaque
action sensible journalisée (`JournalAction`) ; rappel « aucune donnée de patient » au-dessus
des zones de texte libre et d'ajout d'images (FR-035) ; un test qui modifie un paramètre ou un
rôle le rétablit ; pages nouvelles ajoutées aux contrôles transverses (`no-egress`,
`accessibilite-charte`, largeurs de 768 à 1 920 px : back-office conçu pour ordinateur et
tablette).

---

## Phase 1: Setup

- [ ] T001 Compléter `prisma/site/schema.prisma` (migration `scripts/nouvelle-migration.sh site f13_back_office`) selon [data-model.md](data-model.md) : `Utilisateur` + `desactiveLe`, `desactivePar`, `inviteLe` ; enum `EtatMessage` `nouveau|en_cours|traite` et `MessageContact` + `notes` (2 000 caractères au plus), `traitePar`, `traiteLe`, `modifieLe` (valeurs existantes conservées : « nouveau ») ; `DemandeDevis` + `traitePar`, `modifieLe` ; paramètres `securite.inactivite_minutes` (30) et `connecteurs.seuil_alerte` (5) dans `src/lib/parametres.ts`

---

## Phase 2: Foundational (prérequis bloquants)

- [ ] T002 [P] Écrire `tests/unit/back-office/droits.test.ts` : `peut(role, rubrique, action)` conforme au tableau de [contracts/droits.md](contracts/droits.md) pour chaque rôle et chaque rubrique (dont les droits fins `comptes.valider`, `comptes.suspendre`, `comptes.rgpd`, `cloud.agir`, `parametres.bienvenue`) ; et un test statique : chaque fonction exportée de chaque `app/(back-office)/admin/**/actions.ts` appelle `exigerDroit` ou `exigerAdministrateur` avant tout effet
- [ ] T003 Créer `src/lib/droits.ts` (`Rubrique`, `DroitFin`, `peut`, `exigerDroit`, `rubriquesVisibles`) ; ajouter une `layout.tsx` de garde à chaque rubrique existante (`comptes`, `assistance`, `catalogue`, `contenus`, `commandes`, `locations`, `logiciels-cloud`, `financements`, `devis`, `emails`, `demonstration`) ; mettre chaque action serveur existante sous `exigerDroit` (les gardes actuelles plus larges ou absentes sont corrigées) ; les boutons et formulaires interdits ne sont pas rendus (`peut`)
- [ ] T004 Navigation regroupée (D1) dans `app/(back-office)/admin/layout.tsx` construite depuis `rubriquesVisibles(role)` ; liens existants conservés (redirections `/admin/comptes*`, `/admin/assistance` → `/admin/clients` faites en US1 et US5)

**Checkpoint** : aucune page ni action du back-office ne s'ouvre sans le droit de son rubrique.

---

## Phase 3: User Story 9 — Gérer l'équipe et les rôles (P2, en premier : socle des droits)

- [ ] T005 [P] [US9] Écrire `tests/unit/back-office/equipe.test.ts` : inviter (utilisateur créé avec le rôle, email d'invitation dans la boîte), changer de rôle, désactiver (sessions supprimées, connexion refusée avec le message habituel), réactiver ; dernier administrateur actif ni rétrogradé ni désactivé ; actions journalisées
- [ ] T006 [P] [US9] Écrire `tests/e2e/f13/roles.spec.ts` : pour chaque rôle (admin, commercial créé par invitation, support), ouvrir **toutes** les pages du back-office et comparer au tableau attendu (accès ou « réservée à un autre rôle ») ; support : aucun bouton de modification sur la fiche client, le catalogue, les contenus ; commercial : Paramètres → Offre de bienvenue seulement ; désactivation puis tentative de connexion refusée ; axe-core sur Équipe (SC-003, SC-008)
- [ ] T007 [US9] Créer `src/domaine/equipe/` (`inviter`, `changerRole`, `desactiver`, `reactiver`, `listerEquipe`) et l'écran `app/(back-office)/admin/equipe/` (liste, invitation, rôle, désactivation) ; crochet de connexion refusant un utilisateur désactivé (`src/lib/auth.ts`) ; email d'invitation (modèle `invitation_equipe`, transactionnel, catalogue de F10)

---

## Phase 4: User Story 1 — Valider les comptes professionnels (P1) 🎯 MVP

- [ ] T008 [P] [US1] Écrire `tests/e2e/f13/clients.spec.ts` (partie comptes) : À traiter → comptes en attente, prioritaires (mise à disposition express) en tête, plus anciens ensuite ; valider (fiche dans la base fictive, email, journal) en moins d'une minute (SC-004) ; refuser exige un motif ; suspendre réservé à l'administrateur ; Odoo en panne : validation mise en attente puis reprise sans doublon (US1 #6)
- [ ] T009 [US1] Créer `app/(back-office)/admin/clients/` (liste avec onglets « À valider » et « Tous », recherche) et `clients/[id]/` (reprend la fiche de compte de F02 et ses actions selon le droit) ; `/admin/comptes`, `/admin/comptes/[id]` redirigent ; tableau de bord « À traiter » (`app/(back-office)/admin/page.tsx`) : comptes à valider, demandes et messages nouveaux, accès Cloud en attente, erreurs de connecteurs, selon le rôle (D1)

---

## Phase 5: User Story 2 — Mettre à jour les contenus du site (P1)

- [ ] T010 [P] [US2] Écrire `tests/unit/back-office/contenus.test.ts` (verrou optimiste : enregistrement refusé si le contenu a changé depuis la lecture, avec l'auteur et l'heure ; saisie renvoyée) et `tests/unit/back-office/textes-pages.test.ts` (sans contenu publié : le fichier `contenus/<nom>.md` ; contenu publié : le texte du back-office, nettoyé ; brouillon invisible ; retour à l'origine)
- [ ] T011 [P] [US2] Écrire `tests/e2e/f13/contenus.spec.ts` : message du bandeau en préparation → Aperçu (cadres ordinateur et mobile) → Publier → visible sur le site en moins d'une minute (SC-001) ; texte de la page Assistance modifié, aperçu, publié, revenu à l'origine ; image sans texte de remplacement refusée ; deux onglets sur le même contenu : la seconde est prévenue ; coordonnées du bloc Contact vidées puis remises (F01) ; axe-core
- [ ] T012 [US2] Aperçu : route `app/(public)/apercu/[type]/[id]/page.tsx` (équipe seulement, `noindex`) pour bandeau, tuile, actualité, page, contenu d'aide ; bouton « Aperçu » et cadres 1 280 / 390 px dans les écrans d'édition ; texte de remplacement exigé par chaque action qui enregistre une image (tuiles, actualités, marques, photos de produit, centre d'aide, FR-008), avec un test unitaire par action ; verrou optimiste (`modifieLe`) dans les actions de `app/(back-office)/admin/contenus/` ; textes des pages : `src/domaine/textes.ts` (`lireTexte` lit d'abord le `Contenu` de type `page` publié) et écran `app/(back-office)/admin/contenus/pages/` (liste, `[cle]` : brouillon Markdown, aperçu, publier, revenir à l'origine)

---

## Phase 6: User Story 3 — Habiller les produits d'Odoo (P1)

- [ ] T013 [P] [US3] Écrire `tests/e2e/f13/catalogue.spec.ts` : la liste indique ce qui manque à chaque produit (texte, photo, catégorie, publication) ; une photo ajoutée s'affiche sur la fiche (SC-002) ; aucun champ de prix, stock ou nom d'Odoo modifiable (SC-007)
- [ ] T014 [US3] Colonne « Ce qui manque » dans `app/(back-office)/admin/catalogue/page.tsx` (`src/domaine/catalogue/administration.ts`) ; vérifier que la fiche produit n'expose aucune donnée d'Odoo en saisie

---

## Phase 7: User Story 4 — Régler le fonctionnement du site (P1)

- [ ] T015 [P] [US4] Écrire `tests/unit/back-office/parametres.test.ts` : catalogue des paramètres (chaque clé lue par le site y figure ou est un texte de contenu) ; validations (heure `HH:MM`, entier borné, téléphone international, dates, horaires, liste des spécialités non vide et sans doublon) refusées avec l'explication ; écriture historisée (auteur, date, avant, après — SC-006) ; « Remettre cette valeur » ajoute une ligne ; verrou optimiste ; commercial : seulement l'offre de bienvenue
- [ ] T016 [P] [US4] Écrire `tests/e2e/f13/parametres.spec.ts` : heure limite passée à 13:00 → date proposée d'une mise à disposition conforme ; « 25:00 » refusé ; numéro WhatsApp et horaires modifiés → pied de page à jour ; historique → remettre l'ancienne valeur ; rappel Odoo affiché (FR-017) ; commercial refusé hors offre de bienvenue ; valeurs rétablies en fin de test
- [ ] T017 [US4] Créer `src/domaine/parametres/` (catalogue, validation, `historique`, `remettre`) et `app/(back-office)/admin/parametres/` (thèmes, dont « Comptes » : mode de validation et liste des spécialités proposées à l'inscription, FR-004 ; historique par paramètre) + `parametres/bienvenue/` ; retirer de « Coordonnées et textes » les paramètres de fonctionnement (livraison, virement, rappels, WhatsApp et horaires) et de « Réglages des comptes » la validation et l'offre de bienvenue, avec un lien vers leur nouvel emplacement

---

## Phase 8: User Story 5 — Aider un client qui écrit sur WhatsApp (P2)

- [ ] T018 [P] [US5] Compléter `tests/e2e/f13/clients.spec.ts` (partie support) : support retrouve `client.droits` par téléphone, email, RPPS, cabinet en moins de 15 secondes (SC-005) ; la fiche affiche droits, locations, accès Cloud, commandes récentes avec suivi, factures, en lecture seule ; client sans droits : absence signalée avec l'assistance à l'acte ; Odoo en panne : blocs signalés indisponibles, le reste s'affiche
- [ ] T019 [US5] Créer `src/domaine/clients/` (recherche étendue à l'email et au SIRET, fiche réunissant compte, droits, locations, accès Cloud, 10 dernières commandes, factures) et compléter `app/(back-office)/admin/clients/[id]/` ; `/admin/assistance` redirige vers `/admin/clients`

---

## Phase 9: User Story 6 — Suivre les demandes et les accès Cloud (P2)

- [ ] T020 [P] [US6] Écrire `tests/e2e/f13/demandes.spec.ts` : message de contact nouveau → en cours → traité avec note ; demande de devis en cours → traitée avec note ; financement : filtres par statut (existant) ; support refusé ; actions journalisées
- [ ] T021 [US6] Créer `app/(back-office)/admin/demandes/messages/` (liste filtrable, état, note, verrou optimiste) et rendre `app/(back-office)/admin/devis/` modifiable ; domaine `src/domaine/contact.ts` et `src/domaine/catalogue/devis.ts` ; rubrique « Demandes » du menu (financements, devis, messages)

---

## Phase 10: User Story 7 — Surveiller les connecteurs (P2)

- [ ] T022 [P] [US7] Écrire `tests/unit/back-office/journal.test.ts` (filtres, pagination ; seuil : 5 erreurs successives d'un connecteur → une notification d'équipe, pas deux dans l'heure ; succès intermédiaire → compteur remis à zéro ; FR-033 : chaque action sensible — validation, refus, suspension, publication, retrait, modification de paramètre, ouverture ou fermeture d'un accès Cloud, changement de rôle, désactivation, réinitialisation — laisse une ligne `JournalAction` avec son auteur) et `tests/e2e/f13/journal.spec.ts` (panne simulée Odoo, erreurs retrouvées par filtre ; onglet Actions de l'équipe ; réservé à l'administrateur)
- [ ] T023 [US7] Créer `src/domaine/journal/` (lecture filtrée, `verifierSeuil`) branché sur `src/connecteurs/journal.ts`, et `app/(back-office)/admin/journal/` (onglets Connecteurs et Actions)

---

## Phase 11: User Story 8 — Préparer la démonstration (P2)

- [ ] T024 [US8] Vérifier par `tests/e2e/f13/roles.spec.ts` et un test unitaire que chaque outil de démonstration exige l'administrateur (garde de rubrique, T003) et disparaît en mode réel (`outilsDemonstrationDisponibles`) ; corriger les écarts

---

## Phase 12: Polish & Cross-Cutting Concerns

- [ ] T025 [P] Inactivité (D5) : `src/lib/inactivite.ts` et `proxy.ts` (cookie d'activité sur `/admin`, redirection `/connexion?raison=inactivite`, session supprimée) ; message sur la page de connexion ; `tests/unit/back-office/inactivite.test.ts` et un parcours e2e avec le délai réglé à 1 minute
- [ ] T026 [P] Ajouter les pages de F13 aux contrôles transverses (`no-egress`, `accessibilite-charte`, largeurs 768 à 1 920 px) ; mettre à jour les tests de F02, F03, F06, F09, F12 touchés par les redirections et les nouvelles gardes ; contrôle automatique : chaque formulaire du back-office comportant une zone de texte libre ou un ajout d'image affiche le rappel « aucune donnée de patient » (FR-035)
- [ ] T027 [P] `docs/demonstration.md` (rubriques, rôles, équipe, paramètres, journal, aperçu) et `tests/e2e/parcours/README.md`
- [ ] T028 Dérouler [quickstart.md](quickstart.md) et corriger les écarts
- [ ] T029 Vérifier la conformité finale : `npm run typecheck`, `npm run lint`, `npm run check:contrast`, `npm test`, `npm run test:e2e` (ordinateur et mobile), `npm run test:lighthouse`, puis en intégration continue

---

## Dependencies & Execution Order

- US9 (P2) passe avant US1 (P1) : elle crée les comptes commercial et support dont dépendent
  les tests de rôle de toutes les stories suivantes.
- Setup (T001) → Foundational (T002–T004) → US9 (équipe, comptes de test des rôles) → US1
  (MVP) → US2, US3, US4 → US5 à US8 → Polish.
- T003 avant toute story ; T009 avant T019 (même fiche) ; T017 dépend de T003 (droit
  `parametres.bienvenue`) ; T024 dépend de T006.

## Parallel Opportunities

- Les tests marqués [P] de chaque story ensemble ; US2, US3, US4 indépendantes ; US6, US7,
  US8 indépendantes.

## Implementation Strategy

1. Socle des droits (T001–T004) et équipe (US9) : plus aucune page ouverte sans droit.
2. US1 : validation des comptes et « À traiter ».
3. US2 à US4 : contenus, catalogue, paramètres.
4. US5 à US8 : fiche client, demandes, journal, démonstration ; puis finitions (T025–T029).
