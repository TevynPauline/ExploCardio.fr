# Tasks: F20 — Animation « Les trois temps » et nouvel ordre de l'accueil

**Input**: [spec.md](./spec.md), [plan.md](./plan.md)

## Phase 1: Foundational

- [X] T001 Textes de départ de l'animation (clés `accroche`, `mot-1` à `mot-3`, type `argument`) à la place des arguments dans prisma/site/seed/contenus-initiaux.ts
- [X] T002 Suppression des anciens arguments (clés `intro`, `1` à `4`) au remplissage des contenus de départ, appelé au déploiement, dans prisma/site/seed/contenus-initiaux.ts
- [X] T003 `lireAnimation()` (accroche et trois mots, avec valeurs de repli) à la place de `lireArguments()` dans src/domaine/vignettes.ts

## Phase 2: User Story 1 + 2 — Animation et contrôle (P1)

- [X] T004 [P] [US1] Tests unitaires de la chronologie (durée 8–10 s, diamètres égaux pendant les mots, positions finales sur le logo, deux boucles) dans tests/unit/f20/chronologie.test.ts
- [X] T005 [US1] Chronologie et génération des `@keyframes`, géométrie du logo, dans src/ui/accueil/trois-temps/chronologie.ts
- [X] T006 [US1] Composant `TroisTemps` (formes, mots, logo officiel, `<h1>` d'accroche, lien « Découvrir l'offre », ligne fixe des mots en mouvement réduit) dans src/ui/accueil/trois-temps/TroisTemps.tsx
- [X] T007 [US2] Bouton Pause / Lecture / Revoir (fin après deux boucles, reprise, onglet en arrière-plan) dans src/ui/accueil/trois-temps/TroisTemps.tsx
- [X] T008 [US1] Ancre `#acces-rapide` sur les sections de l'accueil dans src/ui/accueil/Section.tsx

## Phase 3: User Story 3 — Nouvel ordre (P1)

- [X] T009 [US3] Nouvel ordre (animation, cartes, carrousel, contact) et suppression du `<h1>` masqué dans app/(public)/page.tsx
- [X] T010 [US3] Suppression de src/ui/accueil/Pourquoi.tsx, OffreDigitale.tsx et ServiceFidelite.tsx et de leurs usages

## Phase 4: User Story 4 — Back-office (P2)

- [X] T011 [US4] Écran « Animation de l'accueil » (accroche 80 car., trois mots 16 car., aperçu) dans app/(back-office)/admin/contenus/accueil/page.tsx
- [X] T012 [US4] Action `enregistrerAnimation` (validation, écrasement concurrent, journal, cache) dans app/(back-office)/admin/contenus/actions.ts
- [X] T013 [US4] Libellé « Animation de l'accueil » dans app/(back-office)/admin/contenus/page.tsx ; retrait des champs « Engagements de réactivité » et « Badge Logiciel Cloud », qui ne servaient qu'aux sections retirées, dans app/(back-office)/admin/contenus/coordonnees/page.tsx

## Phase 5: Tests et finitions

- [X] T014 [P] Tests e2e : séquence, diamètres égaux, pause et reprise, arrêt après deux boucles, mouvement réduit, lecteur d'écran, débordement 320–1 920 px, cartes visibles à 1 280 × 800, dans tests/e2e/f20/animation.spec.ts
- [X] T015 [P] Test e2e du back-office (mot modifié visible sur l'accueil) dans tests/e2e/f20/animation-admin.spec.ts
- [X] T016 Mise à jour des tests existants de l'accueil (ordre, titre de niveau 1, sections retirées) : tests/e2e/f01/accueil.spec.ts, tests/e2e/f16/accueil.spec.ts et autres références
- [X] T017 [P] Exception d'animation (§ 7) et structure de l'accueil (§ 8) dans docs/brand/design-system.md
- [X] T018 Vérification visuelle (1 280 et 390 px, mouvement normal et réduit), lint, types, tests unitaires et e2e ; captures « après » dans docs/captures-f20/

## Phase 6: Bandeau compact (FR-021, demande du 2026-11-09)

- [X] T019 [US2] Styles du bandeau compact et du mouvement réduit dans src/ui/accueil/trois-temps/chronologie.ts ; fin des boucles, fondu, réduction de hauteur, défilement préservé et « Revoir » dans src/ui/accueil/trois-temps/TroisTemps.tsx
- [X] T020 [US2] Tests e2e : bandeau après deux boucles, page déjà défilée, mouvement réduit en bandeau, dans tests/e2e/f20/animation.spec.ts ; remise en état par le formulaire dans tests/e2e/f20/animation-admin.spec.ts
- [X] T021 Charte (§ 7 et § 8) et captures « après » dans docs/captures-f20/

## Phase 7: Six arguments commerciaux (FR-022, décision du 2026-11-09)

- [X] T022 Six arguments (`argument-1` à `argument-6`, valeurs de départ) dans src/domaine/vignettes.ts et prisma/site/seed/contenus-initiaux.ts
- [X] T023 [US1] Liste des six arguments en cascade, bouton « Voir l'offre », hauteurs de scène et bouton « Pause » en haut, dans src/ui/accueil/trois-temps/TroisTemps.tsx et chronologie.ts ; arguments sur une ligne dans le bandeau compact
- [X] T024 [US4] Six champs (40 caractères) et validation dans app/(back-office)/admin/contenus/accueil/page.tsx et actions.ts
- [X] T025 Tests unitaires et e2e (arguments, bouton, bandeau, mouvement réduit, back-office) ; charte § 7 et § 8

## Phase 8: Catalogue visible dès l'arrivée (FR-010, FR-023, décision du 2026-11-09)

- [X] T026 [US2] Une seule lecture (`BOUCLES = 1`) dans src/ui/accueil/trois-temps/chronologie.ts ; tests unitaires et e2e ajustés
- [X] T027 [US1] Scène moins haute (disques, logo, mots et hauteurs réduits ; arguments en deux colonnes sur téléphone et tablette) dans src/ui/accueil/trois-temps/chronologie.ts et TroisTemps.tsx
- [X] T028 [US3] Surtitre « Accès rapide » retiré, trois points du logo devant le titre, dans src/ui/accueil/Section.tsx et AccesRapide.tsx ; charte § 8

## Phase 9: Nouvelle phrase d'accroche (décision du 2026-11-09)

- [X] T029 Phrase « Une offre pensée pour la cardiologie libérale » (ancienne phrase remplacée au déploiement si non modifiée) et retrait de l'argument « Une offre pour la cardiologie libérale » (`argument-1` supprimé) dans src/domaine/textes-animation.ts et prisma/site/seed/contenus-initiaux.ts ; cinq arguments en ligne dans TroisTemps.tsx, back-office et tests

## Phase 10: Liberté, Expertise, Fidélité (FR-022, décision du 2026-11-09)

- [X] T030 Mots « Liberté », « Expertise », « Fidélité » et cinq arguments (`argument-a` à `argument-e`) dans src/domaine/textes-animation.ts ; remplacement des anciens textes de départ et suppression de `argument-1` à `argument-6` dans prisma/site/seed/contenus-initiaux.ts
- [X] T031 [US1] (remplacée par T033) Trois colonnes avec explications dès 1 200 px
- [X] T032 [US4] (explications retirées par T034) Champ « Explication » par argument et journalisation dans app/(back-office)/admin/contenus/accueil/page.tsx et actions.ts ; tests unitaires et e2e ; charte § 7 et § 8

## Phase 11: Titres sous les bulles, scène plus basse (FR-022, FR-023, décisions du 2026-11-09)

- [X] T033 [US1] Titres des arguments sous leur disque (à droite sur téléphone) pendant les mots, phase des mots allongée (séquence de 10,4 s), image finale en titres seuls, disques de 140 px et scène de 300 px dès 1 200 px, dans src/ui/accueil/trois-temps/chronologie.ts et TroisTemps.tsx
- [X] T034 [US4] Explications retirées (textes, back-office, action) ; arguments de 30 caractères au plus ; tests unitaires et e2e ; spécification, plan et charte
