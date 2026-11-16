# Tasks: F27 — Nouveau menu et page Informatique médicale

**Input**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

**Tests**: demandés par la constitution (principe X : tests de contrat communs aux deux modes de
chaque connecteur, critères [Phase 1] vérifiables) ; e2e lancés un fichier à la fois avec
`E2E_BASE_URL=http://localhost:3000 --workers=1` (serveur partagé).

**Organization**: tâches groupées par user story ; chaque story se livre et se teste seule une
fois la phase 2 terminée.

## Format: `[ID] [P?] [Story] Description`

- **[P]** : parallélisable (fichiers différents, sans dépendance sur une tâche non terminée)
- **[Story]** : US1 à US6 de la spec

---

## Phase 1: Setup

- [X] T001 Retirer le Sync Impact Report (commentaire HTML en tête) de .specify/memory/constitution.md une fois relu, avant le premier commit de F27
- [X] T002 [P] Mettre à jour le contrat Catalogue de référence (arbre des catégories, `listerArticles` avec sous-niveaux, `categorieDetail`) en reprenant contracts/odoo-catalogue.md dans specs/011-connecteurs-base-demonstration/contracts/odoo.md §1

---

## Phase 2: Foundational (bloquant pour toutes les stories)

**⚠️ Aucune story ne commence avant la fin de cette phase.**

### Connecteur Odoo : arbre des catégories

- [X] T003 Étendre l'interface : `Categorie` + `rubrique` (code de rubrique) et `niveau` (0, 1 ou 2) ; `Article`, `ResumeArticle` et `ReferenceArticle` + `categorieDetail: string` (code de la catégorie la plus précise, ramenée au niveau 2, sinon la rubrique) dans src/connecteurs/odoo/interfaces/catalogue.ts
- [X] T004 [P] Tests de contrat communs aux deux modes : les 7 cas de contracts/odoo-catalogue.md (rubriques au niveau 0 dans l'ordre fixe, parent de « Câbles pour Holter ECG », `listerArticles` avec sous-niveaux et sur une sous-sous-catégorie, catégories techniques absentes, `categorieDetail` d'un câble HDMI, SaniCuff `mapa` + `consommable`) dans tests/contract/odoo/categories.test.ts
- [X] T005 [P] Codes stables des sous-catégories : `codeSousCategorie(rubrique, cheminRelatif)` = `<rubrique>/<segments slugifiés joints par « / »>`, niveau tronqué à 2, avec tests (accents, ponctuation, « / » dans les noms, profondeur 4 rattachée au niveau 2) dans src/connecteurs/odoo/real/correspondance.ts et tests/unit/odoo-reel/correspondance.test.ts
- [X] T006 Mode réel : `assembler()` conserve, pour chaque modèle relié, le chemin Odoo relatif à sa rubrique et calcule `categorieDetail` ; construit l'arbre des catégories reliées (ids, noms, parents) dans l'instantané, dans src/connecteurs/odoo/real/instantane.ts
- [X] T007 Mode réel : `listerCategories()` renvoie les rubriques puis l'arbre (ordre alphabétique sous chaque parent) ; `listerArticles(code)` accepte un code de sous-catégorie et inclut les sous-niveaux ; `categorieDetail` dans `resumer()`, `lireArticle()`, `listerReferences()`, dans src/connecteurs/odoo/real/catalogue.ts
- [X] T008 Base de démonstration : sous-catégories du rangement proposé à Régis sous chaque rubrique (Enregistreurs / Logiciels / Kits / Accessoires Holter ECG → Câbles, Sacoches ; Enregistreurs MAPA, Accessoires MAPA → Brassards, Sacoches, Adaptateurs ; Consommables MAPA ; Ergomètres et tables, Systèmes d'épreuve d'effort, Accessoires d'effort ; Électrocardiographes, Systèmes par aspiration ; Électrodes) et champ `sousCategorie` (chemin) sur chaque modèle du seed, type « consommable » vérifié pour les consommables, dans prisma/demo/seed/catalogue.ts (et son insertion dans prisma/demo/seed/index.ts)
- [X] T009 Mode démonstration : `listerCategories()` avec `rubrique` et `niveau` calculés en remontant les parents ; `listerArticles(code)` avec sous-niveaux ; `categorieDetail` sur les articles, dans src/connecteurs/odoo/demo/catalogue.ts
- [X] T010 Faire passer T004 dans les deux modes (`npm run test:contract`) et adapter les tests de contrat catalogue existants si besoin dans tests/contract/odoo/catalogue.test.ts

### Base du site

- [X] T011 Migration Prisma du site : modèle `DemandeInformatique` et énumération `EtatDemandeInformatique` (`nouvelle`, `en_cours`, `transmise`, `close`) selon data-model.md, index `(etat, creeLe)` ; suppression de `SousCategorie`, de `ContenuProduit.sousCategorieId`, de `ElementMenu`, `EntreeMenu`, `TypeElementMenu`, dans prisma/site/schema.prisma et une migration créée par scripts/nouvelle-migration.sh
- [X] T012 Retirer les seeds devenus sans objet (sous-catégories, éléments de menu) dans prisma/site/seed/catalogue.ts et prisma/site/seed/contenus-initiaux.ts

### Retrait des sous-catégories du site (F03) et des produits phares (F01)

- [X] T013 Lecture du catalogue sans `sousCategorie` : supprimer la jointure et le champ dans src/domaine/catalogue/lecture.ts et src/domaine/catalogue/administration.ts
- [X] T014 Filtre des pages de famille : remplacer le filtre « type » (sous-catégories F03) par un filtre `categorie` alimenté par l'arbre d'Odoo (`categorieDetail` et ses ancêtres) ; `?type=` ignoré ; adapter `Carte` (`categorieDetail` à la place de `typeSlug`) et `filtresDisponibles` dans src/domaine/catalogue/categories.ts, avec tests dans tests/unit/catalogue/categories.test.ts
- [X] T015 Pages de famille : lire `?categorie=`, afficher le filtre « Catégorie » et le fil d'Ariane jusqu'à la sous-catégorie, dans app/(public)/holter-ecg/page.tsx, app/(public)/holter-ecg/ecg-de-repos/page.tsx, app/(public)/holter-tensionnel/page.tsx, app/(public)/epreuve-effort/page.tsx, app/(public)/accessoires-consommables/page.tsx (et le composant de filtres partagé qu'elles utilisent)
- [X] T016 Back-office : supprimer la page app/(back-office)/admin/catalogue/sous-categories/, le champ « Sous-catégorie » de app/(back-office)/admin/catalogue/[reference]/FormulaireContenu.tsx et ses actions dans app/(back-office)/admin/catalogue/actions.ts ; supprimer app/(back-office)/admin/contenus/menus/ et ses actions dans app/(back-office)/admin/contenus/actions.ts ; retirer les liens correspondants des menus du back-office

**Checkpoint** : `npm run typecheck`, `npm run test:unit`, `npm run test:contract` verts ; les pages de famille filtrent par catégorie d'Odoo.

---

## Phase 3: User Story 1 — Menu « Produits » (P1) 🎯 MVP

**Goal**: panneau à quatre colonnes, trois niveaux tirés d'Odoo.

**Independent Test**: survoler « Produits », vérifier colonnes et niveaux, cliquer un lien de chaque niveau.

- [X] T017 [US1] Nouveau contrat de navigation (contracts/navigation.md) : types `Navigation`, `EntreeNavigation` (`colonnes`, `carte`), `Colonne`, `LienNiveau2`, `CarteAppel` ; construction de l'entrée `produits` à partir de `listerCategories()` et des articles publiés (catégories vides masquées, lien `<famille>?categorie=<code>`, `enGras` si enfants, repli « liens de famille seuls » si connecteur indisponible, lien final « Voir tous les produits » vers `/catalogue`) ; suppression de `ElementMenu` et des produits phares, dans src/domaine/navigation.ts
- [X] T018 [P] [US1] Tests unitaires de la construction `produits` (ordre des colonnes, trois niveaux, vides masqués, catégories techniques absentes, panne) dans tests/unit/f27/navigation-produits.test.ts
- [X] T019 [US1] `MegaMenu` à colonnes : titre de colonne (lien), liens de niveau 2 (gras si enfants) et sous-liens de niveau 3 plus petits, carte d'appel optionnelle, sans motif « trois points » ; comportement de survol, clavier et Échap inchangés, dans src/ui/en-tete/MegaMenu.tsx
- [X] T020 [P] [US1] Tests e2e ordinateur : quatre colonnes dans l'ordre, « Accessoires Holter ECG » → « Sacoches » mène aux seules sacoches, titre de famille → tous les produits, aucune catégorie technique, accessibilité axe du panneau ouvert, dans tests/e2e/f27/produits.spec.ts

**Checkpoint** : US1 démontrable seule (les autres entrées peuvent encore être les anciennes).

---

## Phase 4: User Story 2 — Page Informatique médicale et questionnaire (P1)

**Goal**: page complète, questionnaire en trois étapes, demande enregistrée et notifiée.

**Independent Test**: parcourir la page, envoyer le questionnaire déconnecté, retrouver la demande et la notification simulée.

- [X] T021 [P] [US2] Textes de la page : clés `informatique.*` (en-tête, trois bénéfices, trois étapes dont « On vous appelle » / « Nous précisons avec vous votre cabinet et vos logiciels », hébergement, prestataire, partenaire, mentions HDS, ISO 27001, RGPD, CNCF), valeurs par défaut de la maquette, longueurs maximales, `textesInformatique(lignes)` avec repli, dans src/domaine/informatique/textes.ts, avec tests dans tests/unit/f27/textes-informatique.test.ts
- [X] T022 [P] [US2] Validation du questionnaire (zod) par étape et complète, messages de contracts/questionnaire.md, bornes et listes fermées de data-model.md, aucun champ libre long, dans src/domaine/informatique/questionnaire.ts, avec tests dans tests/unit/f27/questionnaire.test.ts
- [X] T023 [US2] Enregistrement : `enregistrerDemandeInformatique()` (anti-robots `src/domaine/anti-robots.ts`, limites `src/domaine/limites.ts`, compte de la session, consentement daté, création `nouvelle`, puis `notifierEquipe` clé `informatique:<id>` vers l'adresse d'équipe des messages de contact, objet « Nouvelle demande Informatique médicale ») dans src/domaine/informatique/demandes.ts
- [X] T024 [US2] Server Action `envoyerDemandeInformatique` (réponses `ok`, `erreurs`, `motif`) dans app/(public)/informatique-medicale/actions.ts
- [X] T025 [P] [US2] Sections statiques sans motif « trois points » : `EnTete` (titre, phrase, trois mentions, boutons « Décrire mon besoin » → `#questionnaire` et « Découvrir PCA » → `#pca`, schéma cabinet / domicile / secrétariat / congés en formes de la charte, animation légère neutralisée en mouvement réduit), `Benefices` (`#pca`), `Etapes`, `Hebergement` (`#hebergement`, « Nous sommes fiers de vous présenter notre partenariat avec PCA »), `Prestataire` (`#prestataire`, partenaire 2i), `Partenaire` (« Patient Care Anywhere®, par Indoor Informatique (2i) ») dans src/ui/informatique-medicale/
- [X] T026 [US2] Composant client `Questionnaire` (`#questionnaire`) : trois étapes avec barre de progression, validation par étape (T022), focus sur le titre de l'étape, erreurs liées aux champs, préremplissage des coordonnées si connecté, mention « Aucune donnée de patient… » sur chaque étape, confirmation finale avec focus, dans src/ui/informatique-medicale/Questionnaire.tsx
- [X] T027 [US2] Page publique (titre et description SEO, ordre des sections FR-016, textes lus en cache « contenus », session pour le préremplissage) dans app/(public)/informatique-medicale/page.tsx
- [X] T028 [US2] Redirection permanente `/services/hebergement-donnees-sante` → `/informatique-medicale#hebergement` dans next.config.ts ; suppression de app/(public)/services/hebergement-donnees-sante/ ; mise à jour des liens internes dans src/domaine/liens.ts, src/domaine/pages.ts, src/domaine/recherche/index.ts, app/(public)/services/page.tsx, app/(public)/catalogue/page.tsx, src/ui/accueil/OffreDigitale.tsx ; page ajoutée au plan du site dans app/sitemap.ts
- [X] T029 [US2] Éditeur des textes « Contenus → Informatique médicale » (même modèle que les six cartes de F23, journalisé) dans app/(back-office)/admin/contenus/informatique-medicale/page.tsx et app/(back-office)/admin/contenus/actions.ts
- [X] T030 [US2] Registre RGPD : ajouter le traitement « Demandes Informatique médicale » (finalité, base légale consentement, conservation 3 ans, destinataire l'équipe) là où le registre et les durées de conservation sont tenus (src/domaine/consentement.ts ou la page de confidentialité de app/(public)/[legale]/)
- [X] T031 [P] [US2] Tests e2e : ordre des sections, étape 2 sans prénom, questionnaire déconnecté (étape vide refusée, envoi, confirmation, demande en base, envoi simulé dans « Emails »), connecté (préremplissage, compte rattaché), redirection 308, axe, mouvement réduit, dans tests/e2e/f27/informatique-medicale.spec.ts
- [X] T032 [US2] Adapter les tests de l'ancienne page Hébergement (redirection au lieu du contenu) dans tests/e2e/f12/hebergement.spec.ts, tests/e2e/f12/transverses.spec.ts, tests/e2e/f03/services.spec.ts, tests/e2e/accessibilite-charte.spec.ts, tests/e2e/no-egress.spec.ts et tests/e2e/f01/outils.ts

**Checkpoint** : US2 démontrable seule, même avec l'ancienne barre (lien direct).

---

## Phase 5: User Story 3 — Consommables (P2)

**Goal**: consommables par examen, présents aussi dans « Produits ».

**Independent Test**: SaniCuff visible sous « Pour la MAPA » et dans Produits → MAPA.

- [X] T033 [US3] Lecture des consommables publiés (type « consommable »), groupés par rubrique (« Pour le Holter ECG », « Pour la MAPA », « Pour l'épreuve d'effort », « Pour l'ECG de repos », « Autres consommables » pour `accessoires`), dans src/domaine/catalogue/consommables.ts, avec tests dans tests/unit/f27/consommables.test.ts
- [X] T034 [US3] Entrée `consommables` de la navigation (colonnes non vides, 6 fiches au plus par colonne, carte « Vos consommables » vers Mon compte, lien « Tous les consommables ») dans src/domaine/navigation.ts
- [X] T035 [US3] Page `/consommables` (sections par examen, cartes produit existantes, prix TTC puis HT, titre et description SEO, plan du site) dans app/(public)/consommables/page.tsx et app/sitemap.ts
- [X] T036 [P] [US3] Tests e2e : SaniCuff aux deux endroits, article non consommable absent, colonne vide masquée, page `/consommables`, dans tests/e2e/f27/consommables.spec.ts

---

## Phase 6: User Story 4 — Barre à cinq entrées et menu mobile (P2)

**Goal**: cinq entrées, deux liens discrets, menu mobile à listes dépliables.

**Independent Test**: vérifier la barre, les panneaux Location et financement et Services, le menu mobile.

- [X] T037 [US4] Entrées `informatique` (liens `#pca`, `#prestataire`, `#hebergement`, `#questionnaire`, carte d'appel « Un projet informatique ? » « Décrivez votre besoin en 2 minutes, nous vous rappelons. »), `location` et `services` (FR-014, FR-015, sans Hébergement), `liensSecondaires`, ordre final des cinq entrées, dans src/domaine/navigation.ts
- [X] T038 [US4] `BarreNavigation` : cinq entrées sur une ligne dès 1 024 px, liens « Qui sommes-nous » et « Contact » à droite, survol a62ebf2 conservé, dans src/ui/en-tete/BarreNavigation.tsx
- [X] T039 [US4] `MenuMobile` : mêmes entrées et liens secondaires, listes dépliables imbriquées jusqu'au niveau 3 (`aria-expanded`), cibles ≥ 44 px, dans src/ui/en-tete/MenuMobile.tsx
- [X] T040 [US4] Mettre à jour les liens internes qui visaient les anciennes entrées (pied de page, plan du site, page Services) dans src/domaine/liens.ts, src/domaine/pages.ts et app/(public)/services/page.tsx
- [X] T041 [P] [US4] Adapter les tests de navigation F01 (cinq entrées, liens secondaires, survol, clavier, Échap, menu mobile à trois niveaux, cibles 44 px, une seule ligne à 1 024 px) dans tests/e2e/f01/navigation.spec.ts et tests/e2e/f01/outils.ts ; tests unitaires des entrées fixes dans tests/unit/f27/navigation-entrees.test.ts

---

## Phase 7: User Story 5 — Suivi des demandes dans le back-office (P2)

**Goal**: Régis voit, filtre et suit les demandes Informatique médicale.

**Independent Test**: envoyer une demande, la suivre (états, note), vérifier le journal.

- [X] T042 [US5] Suivi : `ETATS_INFORMATIQUE` (Nouvelle, En cours, Transmise à 2i, Close), `suivreDemandeInformatique()` avec verrou optimiste, notes ≤ 2 000 car., journal `demandes.informatique.suivi`, dans src/domaine/demandes/suivi.ts, avec tests dans tests/unit/f27/suivi-informatique.test.ts
- [X] T043 [US5] Onglet « Informatique médicale » : liste (date, cabinet, intérêts, créneau, état ; filtre « non traitées »), fiche détaillée avec `SuiviForm`, dans app/(back-office)/admin/demandes/informatique/page.tsx, app/(back-office)/admin/demandes/informatique/[id]/page.tsx, app/(back-office)/admin/demandes/Onglets.tsx et app/(back-office)/admin/demandes/actions.ts
- [X] T044 [P] [US5] Tests e2e back-office : demande visible comme nouvelle, changement d'état et note journalisés, filtre, accès réservé à l'équipe, dans tests/e2e/f27/demandes-informatique.spec.ts

---

## Phase 8: User Story 6 — Lien suivi vers PCA (P3)

**Goal**: lien sortant paramétrable, avec code de suivi quand il existe.

**Independent Test**: renseigner le paramètre, vérifier les liens ; le vider, vérifier le défaut.

- [X] T045 [US6] Paramètre de fonctionnement `partenaire.pca.lien` (adresse https, défaut `https://patient-care-anywhere.com/`, validation) dans src/domaine/parametres/index.ts et src/domaine/parametres/validation.ts ; champ dans app/(back-office)/admin/parametres/page.tsx
- [X] T046 [US6] Liens sortants vers PCA et 2i lus depuis le paramètre, nouvel onglet, `rel="noopener"`, mention « (nouvel onglet) » pour les lecteurs d'écran, dans src/ui/informatique-medicale/Partenaire.tsx et src/ui/informatique-medicale/Prestataire.tsx
- [X] T047 [P] [US6] Tests : unitaire de validation du paramètre dans tests/unit/f27/lien-pca.test.ts ; e2e lien avec et sans code dans tests/e2e/f27/informatique-medicale.spec.ts ; vérifier que tests/e2e/no-egress.spec.ts n'appelle pas le site du partenaire

---

## Phase 9: Polish & Cross-Cutting

- [X] T048 Lancer `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:contract` et corriger
- [X] T049 Lancer les e2e touchés un fichier à la fois (f27, f01, f03, f12, accessibilité, no-egress) sur mobile et desktop et corriger
- [X] T050 Mesurer localement le CLS et le LCP de l'accueil (build prod sur :3200) puis `npm run test:lighthouse` ; corriger si CLS > 0,1 ou LCP > 2 s
- [X] T051 [P] `npm run check:contrast` et revue visuelle (ordinateur 1 024 / 1 280 / 1 440 px, téléphone 390 px) de la barre, des cinq panneaux et de la page, comparée à la maquette validée
- [X] T052 Dérouler quickstart.md de bout en bout et cocher les scénarios
- [X] T053 Retirer l'entrée « maquette » ajoutée pour la démonstration dans .claude/launch.json
- [X] T054 Mettre à jour la mémoire du projet et proposer le commit (vérification des secrets avant) à Pauline

---

## Dependencies & Execution Order

- **Phase 1** : T001 avant le premier commit ; T002 libre.
- **Phase 2** bloque tout : T003 → (T005, T008) → T006/T007 (réel) et T009 (démo) → T010 ; T011 → T012, T013 → T014 → T015 ; T016 après T011.
- **US1** (T017–T020) après la phase 2.
- **US2** (T021–T032) après la phase 2 ; indépendante de US1 (page atteignable par adresse).
- **US3** (T033–T036) après la phase 2 ; T034 touche src/domaine/navigation.ts comme T017 et T037 : à faire après T017.
- **US4** (T037–T041) après US1 (même fichier de navigation et mêmes composants d'en-tête) ; T037 après T034 si US3 est faite avant.
- **US5** (T042–T044) après T023 (la demande doit exister).
- **US6** (T045–T047) après T025.
- **Polish** après les stories retenues.

### Parallel Opportunities

- Phase 2 : T004 et T005 en parallèle ; T008 en parallèle de T006/T007.
- US2 : T021, T022 et T025 en parallèle ; T031 en parallèle de T029/T030.
- Entre stories : US2 peut avancer pendant US1 (fichiers distincts), sauf les e2e (serveur partagé, un fichier à la fois).

## Implementation Strategy

1. **MVP** : phases 1–2, puis US1 (menu Produits) et US2 (page et questionnaire) — les deux P1.
2. Puis US4 (barre complète et mobile) pour livrer le nouveau menu entier, avec US3 (consommables).
3. Puis US5 (suivi) et US6 (lien suivi).
4. Chaque étape : tests verts, démonstration à Pauline, commit après accord et vérification des secrets.
