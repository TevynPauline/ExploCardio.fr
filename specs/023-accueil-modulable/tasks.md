# Tasks: F23 — Accueil modulable

**Input**: [spec.md](./spec.md), [plan.md](./plan.md)

Construit par-dessus F20 (branche `020-animation-accueil`, non fusionnée). Tests e2e lancés un
fichier à la fois avec `E2E_BASE_URL=http://localhost:3000` (serveur partagé).

## Phase 1: Foundational

- [X] T001 [P] Module sans base des blocs : `BLOCS_ACCUEIL` (`animation`, `gammes`, `pourquoi`, `offre-digitale`, `offres` ; nom affiché, ancre), `ORGANISATION_DEFAUT` (offre digitale masquée), `normaliserOrganisation()` (JSON illisible → défaut, inconnus et doublons ignorés, absents ajoutés masqués, aucun affiché → défaut) et `validerOrganisation()` stricte (5 blocs connus, sans doublon, ≥ 1 affiché) dans src/domaine/organisation-accueil.ts
- [X] T002 [P] Module sans base des six cartes : `RAISONS_DEFAUT` (titres et phrases du tableau FR-008), `LONGUEURS_RAISONS` (titre 50, phrase 160), `textesRaisons(lignes)` avec repli dans src/domaine/textes-raisons.ts
- [X] T003 [P] Tests unitaires de T001 et T002 (défaut, normalisation, refus « aucun bloc affiché », doublons, longueurs, replis) dans tests/unit/f23/organisation.test.ts et tests/unit/f23/raisons.test.ts
- [X] T004 Lectures en cache « contenus » : `lireOrganisation()` (paramètre `accueil.organisation` normalisé), `lireRaisons()` (clés `raison-1` à `raison-6`), `lireTuiles()` limité à 3, dans src/domaine/contenus.ts
- [X] T005 Contenus de départ : six raisons (`upsert` sans mise à jour) ; suppression des tuiles dont le lien n'est pas `/holter-ecg`, `/holter-tensionnel` ou `/epreuve-effort`, dans prisma/site/seed/contenus-initiaux.ts

## Phase 2: User Story 1 — Gammes phares et « Pourquoi choisir » (P1)

- [X] T006 [US1] `GammesPhares` (titre « Nos gammes phares », trois points du logo, ancre `#acces-rapide`, grille 1 / 3 colonnes) à la place de src/ui/accueil/AccesRapide.tsx, dans src/ui/accueil/GammesPhares.tsx
- [X] T007 [US1] Six schémas (cercles qui se chevauchent, pilules, chaîne en trois étapes, jauge vers « Bon d'achat », frise Demande → Mise à disposition, deux cercles Vous / Nos spécialistes), formes et couleurs par tokens, mots `aria-hidden`, animations ≤ 2 s sous `.js-pourquoi:not([data-visible])`, neutralisées en mouvement réduit, dans src/ui/accueil/pourquoi/schemas.tsx
- [X] T008 [US1] Section « Pourquoi choisir ExploCardio.fr ? » (ancre `#pourquoi-choisir`, grille 1 / 2 / 3 colonnes, schéma + titre + phrase) dans src/ui/accueil/pourquoi/Pourquoi.tsx ; déclencheur client `IntersectionObserver` (seuil 40 %, une fois) dans src/ui/accueil/pourquoi/Apparition.tsx
- [X] T009 [US1] Offre digitale rétablie (version d'avant F20, liens WhatsApp) dans src/ui/accueil/OffreDigitale.tsx ; champ « Badge Logiciel Cloud » rétabli dans app/(back-office)/admin/contenus/coordonnees/page.tsx
- [X] T010 [US1] Accueil rendu dans l'ordre enregistré (table bloc → composant, blocs masqués et carrousel vide omis, contact en dernier) dans app/(public)/page.tsx
- [X] T011 [US1] Titre principal (FR-012) : prop `titrePrincipal` (`<h1>` ou `<p>` de même style) dans src/ui/accueil/trois-temps/TroisTemps.tsx ; `<h1 className="sr-only">` de remplacement dans app/(public)/page.tsx
- [X] T012 [US1] Animation hors de la tête : prop `differee` (lecture à l'entrée à l'écran, seuil 50 %) et prop `cible` du bouton « Voir l'offre » (premier bloc affiché suivant, sinon `#contact`) dans src/ui/accueil/trois-temps/TroisTemps.tsx et app/(public)/page.tsx
- [X] T013 [P] [US1] Tests e2e : ordre de départ, offre digitale absente, trois gammes et leurs liens, six cartes, schémas immobiles en mouvement réduit, un seul `<h1>`, accessibilité, débordement 320–1 920 px, haut des gammes visible à 1 440 × 760, dans tests/e2e/f23/accueil.spec.ts

## Phase 3: User Story 2 — Lien « Nos offres du moment » (P1)

- [X] T014 [US2] Carrousel : `id="offres-du-moment"`, `tabIndex={-1}`, `scroll-margin-top` dans src/ui/accueil/Carrousel.tsx
- [X] T015 [US2] `BandeauPromo` calcule `lienOffres` (carrousel affiché et au moins une vignette) ; `RotationBandeau` affiche le lien hors rotation, cible ≥ 44 px, focus sur le carrousel sur l'accueil, dans src/ui/BandeauPromo.tsx et src/ui/RotationBandeau.tsx
- [X] T016 [P] [US2] Tests e2e : lien depuis l'accueil (défilement et focus) et depuis une fiche produit ; lien absent si le carrousel est masqué ; carrousel déplacé en tête toujours atteint, dans tests/e2e/f23/lien-offres.spec.ts

## Phase 4: User Story 3 — Organisation de l'accueil (P2)

- [X] T017 [US3] Action `enregistrerOrganisation` (droit `contenus/modifier`, `validerOrganisation`, verrou par `modifieLe` du paramètre, `ecrireParametre`, journal `contenus.accueil.organisee` avec ancien et nouvel état, invalidation « contenus ») dans app/(back-office)/admin/contenus/actions.ts
- [X] T018 [US3] Écran « Organisation de l'accueil » : liste client (« Monter » / « Descendre » désactivés aux extrémités, focus conservé, annonce `aria-live`, case « Affiché sur l'accueil », mention carrousel sans offre), bouton « Enregistrer », messages de succès et d'erreur, dans app/(back-office)/admin/contenus/organisation/page.tsx et ListeBlocs.tsx
- [X] T019 [US3] Menu « Contenus » : entrées « Organisation de l'accueil », « Gammes phares (3 cartes) », « Textes de l'accueil », dans app/(back-office)/admin/contenus/page.tsx et app/(back-office)/admin/contenus/tuiles/page.tsx
- [X] T020 [P] [US3] Tests e2e : carrousel monté en tête et visible en public, offre digitale réaffichée, animation masquée → `<h1>` de remplacement unique, refus « aucun bloc affiché », journal, modification concurrente, clavier ; remise en état par le formulaire, dans tests/e2e/f23/organisation-admin.spec.ts

## Phase 5: User Story 4 — Textes des six cartes (P3)

- [X] T021 [US4] Action `enregistrerRaisons` (titre 1–50, phrase 1–160, verrou, journal `contenus.raisons.modifiees`) dans app/(back-office)/admin/contenus/actions.ts ; formulaire « Pourquoi choisir ExploCardio.fr ? » et titre « Textes de l'accueil » dans app/(back-office)/admin/contenus/accueil/page.tsx
- [X] T022 [P] [US4] Test e2e : phrase de la carte 4 modifiée visible sur l'accueil, titre vide refusé, remise en état, dans tests/e2e/f23/raisons-admin.spec.ts

## Phase 6: Finitions

- [X] T023 Mise à jour des tests existants (six tuiles → trois gammes, titre de section, ancre, offre digitale) : tests/e2e/f01/accueil.spec.ts, tests/e2e/f01/back-office-contenus.spec.ts, tests/e2e/f16/accueil.spec.ts, tests/e2e/f16/images-accueil.spec.ts, tests/e2e/f20/animation.spec.ts et autres références trouvées
- [X] T024 [P] Charte § 8 (ordre de départ, blocs déplaçables, schémas des six cartes) dans docs/brand/design-system.md
- [X] T025 Vérification visuelle (1 440 × 760, 768 et 390 px, mouvement normal et réduit, trois organisations), lint, types, tests unitaires et e2e ; captures dans docs/captures-f23/
