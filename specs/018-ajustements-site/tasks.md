---
description: "Liste des tâches — F18 Ajustements du site (lot A)"
---

# Tasks: F18 — Ajustements du site (lot A)

**Input**: documents de conception de `specs/018-ajustements-site/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/ecrans.md](contracts/ecrans.md),
[quickstart.md](quickstart.md) ; F01 à F17 livrés ; décisions D1 à D8 validées par Pauline le
2026-11-02.

**Tests** : exigés par la constitution (principe X) et par SC-001 à SC-007 ; écrits **avant**
l'implémentation qu'ils vérifient.

## Format : `[ID] [P?] [Story] Description`

- **[P]** : réalisable en parallèle (fichiers différents, sans dépendance non terminée)
- **[Story]** : US1 à US5 (spec.md)

## Conventions communes

Celles de F11 à F17 : TypeScript strict ; français au vouvoiement ; tokens de la charte ;
WCAG 2.2 AA ; 320 à 1 920 px sans défilement horizontal ; e2e lancés contre le serveur de
développement (`E2E_BASE_URL=http://localhost:3000`) ; un test qui modifie un paramètre le
rétablit.

**Livraison** : un seul commit pour le lot A, après accord de Pauline. Aucune migration.

---

## Phase 1: Setup

- [X] T001 Créer `tests/unit/f18/` et `tests/e2e/f18/` (outils communs : `tests/e2e/f18/outils.ts`, réutilisant `../session.ts`, `../axe.ts` et les aides de connexion de `tests/e2e/f02/outils.ts`)

---

## Phase 2: Foundational

- [X] T002 [P] Composant `src/ui/FenetreConfirmation.tsx` : `<dialog>` natif ouvert par `showModal()` (comme `src/ui/en-tete/MenuMobile.tsx`), props `titre`, `texte`, `libelleConfirmer`, `onConfirmer`, `onFermer` ; « Annuler », Échap et clic sur le fond ferment ; focus rendu à l'élément d'origine ; boutons de la charte (`ec-btn`), cibles 44 px ; respect de `prefers-reduced-motion`
- [X] T003 [P] Composant `src/ui/ChampQuantite.tsx` : bouton « − », `input type="number"` (flèches natives masquées par CSS dans le composant ou `app/globals.css`), bouton « + » ; props `id`, `libelleArticle`, `valeur`, `min`, `max`, `onChange`, `onBlur`, `onEntree`, `desactive` ; boutons nommés « Diminuer la quantité de {article} » / « Augmenter la quantité de {article} », inactifs aux limites ; zone `aria-live="polite"` annonçant la quantité ; cibles 44 px

**Checkpoint** : les deux composants existent, sans encore être utilisés.

---

## Phase 3: User Story 1 — Livrer en France continentale, orienter la Corse (P1) 🎯

**Goal** : adresse de livraison en Corse refusée partout, avec le message unique et « Nous
contacter » ; plus aucun « Corse comprise » dans le site.

**Independent Test** : quickstart §1, §2 et §6.

- [X] T004 [P] [US1] Écrire `tests/unit/f18/livraison.test.ts` : `codePostalLivrable` (75008, 69003, 06000, 95100 oui ; 20000, 20090, 20200, 20620 non ; 97411, 98000 non ; « 2A000 », vide non) ; `refusLivraison` renvoie le message unique pour la Corse, l'outre-mer et « Autre pays », rien pour une adresse continentale ; `demanderDevis` refuse (motif `hors_metropole`, message unique) un compte dont l'adresse de livraison par défaut est en Corse ; « Commander » un devis déjà émis vers la Corse est refusé avec le même message, sans recomposer le panier (analyse C3)
- [X] T005 [P] [US1] Écrire `tests/unit/f18/textes-corse.test.ts` : aucun fichier de `src/`, `app/`, `contenus/`, `prisma/site/seed/` ni modèle d'email ne contient « Corse comprise » (recherche insensible à la casse)
- [X] T006 [P] [US1] Écrire `tests/e2e/f18/corse.spec.ts` : adresse de livraison 20000 Ajaccio refusée avec le message et le lien « Nous contacter » à l'inscription, dans Mon compte → Adresses et à l'étape adresses du tunnel ; facturation à Bastia + livraison à Lyon acceptée dans le tunnel ; location express (mise à disposition) avec une adresse corse refusée ; demande de devis depuis le panier refusée pour un compte livré en Corse (analyse C1) ; `/cgv` sans « Corse comprise » et avec « continentale » ; axe-core
- [X] T007 [US1] `src/domaine/comptes/adresses.ts` : renommer `codePostalMetropole` en `codePostalLivrable` (départements 01 à 95 sauf 20), nouveau `MESSAGE_HORS_METROPOLE` (spec FR-002), commentaire d'en-tête mis à jour (F18) ; adapter les appels (`src/domaine/commande/devis-client.ts`)
- [X] T008 [US1] `src/domaine/commande/devis-client.ts` : message `hors_metropole` = message unique ; vérifier l'adresse de livraison au moment de « Commander » un devis (avant de recomposer le panier) et renvoyer le refus avec le lien de contact (research R2) ; afficher ce refus dans `app/(public)/mon-compte/devis`
- [X] T009 [P] [US1] Textes d'aide et mentions : `aideCodePostal` « Livraison en France métropolitaine continentale (hors Corse). » dans `src/ui/commande/FormulaireAdresses.tsx`, `src/ui/comptes/FormulaireInscription.tsx`, `src/ui/comptes/FormulairesProfil.tsx` ; `src/ui/commande/MentionMetropole.tsx` « Livraison en France métropolitaine continentale. Corse, outre-mer et étranger : » + lien « nous contacter »
- [X] T010 [P] [US1] `contenus/cgv.md` : partie Livraison (France métropolitaine continentale ; Corse, outre-mer et étranger : nous contacter) et clause express sans la Corse ; garder la phrase « réservée aux livraisons en France métropolitaine » (test `tests/e2e/f16/presentation.spec.ts`) ou adapter ce test
- [X] T011 [US1] Mettre à jour les tests existants qui acceptent la Corse : `tests/unit/comptes/adresses.test.ts`, `tests/unit/f16/metropole.test.ts`, `tests/e2e/f16/hors-metropole.spec.ts`, `tests/e2e/f16/presentation.spec.ts` ; vérifier `tests/unit/location/calendrier.test.ts` (zones sans lendemain : cas continentaux seulement)
- [X] T012 [P] [US1] `docs/demonstration.md` : la Corse est désormais refusée (lignes sur les adresses et le calendrier de livraison) ; centre d'aide : vérifier les contenus d'aide initiaux (`prisma/site/seed/`) et corriger toute mention de la Corse

**Checkpoint** : T004 à T006 verts ; SC-001 et SC-002 vérifiés.

---

## Phase 4: User Story 2 — Quantités visibles (P1)

**Goal** : « − » et « + » visibles sans survol dans le panier et sur les fiches produit.

**Independent Test** : quickstart §3.

- [X] T013 [P] [US2] Écrire `tests/e2e/f18/quantites.spec.ts` : à 320, 390, 768, 1 024 et 1 280 px, chaque ligne modifiable du panier montre « Diminuer… », le champ et « Augmenter… » visibles sans survol ; « + » fait passer de 1 à 2, met à jour le prix de la ligne et le total, et la zone d'annonce indique la nouvelle quantité (analyse U1) ; « − » inactif à 1 ; saisie directe toujours possible ; mêmes boutons sur une fiche produit ; cibles ≥ 44 px ; axe-core
- [X] T014 [US2] `src/ui/commande/LignePanier.tsx` : remplacer le champ par `ChampQuantite` en gardant la logique actuelle (attente avant enregistrement, retour à la valeur enregistrée si vide, Entrée, prix en direct, événement `EVENEMENT_PANIER`)
- [X] T015 [US2] `src/ui/catalogue/ChoixConditionnement.tsx` : utiliser `ChampQuantite` (mêmes limites qu'aujourd'hui)

**Checkpoint** : SC-003 vérifié.

---

## Phase 5: User Story 3 — Confirmer le retrait (P1)

**Goal** : aucun article retiré sans confirmation.

**Independent Test** : quickstart §4.

- [X] T016 [P] [US3] Écrire `tests/e2e/f18/retrait.spec.ts` : « Retirer » ouvre la fenêtre « Retirer cet article du panier ? » avec le nom de l'article ; « Annuler », Échap et clic sur le fond la ferment sans rien retirer, focus revenu sur « Retirer » ; confirmer retire l'article, met à jour totaux et pastille, annonce le retrait ; dernier article retiré → panier vide, focus sur le titre ; kit obligatoire sans bouton ; axe-core fenêtre ouverte
- [X] T017 [US3] `src/ui/commande/LignePanier.tsx` : « Retirer » ouvre `FenetreConfirmation` ; l'action `actionSupprimerLigne` n'est appelée qu'après confirmation ; message de statut ; focus sur l'article suivant ou le titre du panier (`app/(public)/panier`)
- [X] T018 [US3] Adapter les tests e2e qui retirent un article : `tests/e2e/f04/panier.spec.ts`, `tests/e2e/f05/kit.spec.ts`, et vérifier `tests/e2e/f03/categories.spec.ts`, `tests/e2e/f03/back-office-catalogue.spec.ts`, `tests/e2e/f09/reglages.spec.ts` (confirmer la fenêtre là où « Retirer » vise le panier)

**Checkpoint** : SC-004 vérifié.

---

## Phase 6: User Story 4 — Barre de recherche (P2)

**Goal** : champ visible dès 1 024 px ; loupe seule en dessous.

**Independent Test** : quickstart §5 (recherche).

- [X] T019 [P] [US4] Écrire `tests/e2e/f18/recherche.spec.ts` : à 1 024 et 1 280 px, le champ « Rechercher » est visible et accepte la saisie sans clic préalable ; suggestions dès 2 caractères ; Entrée → `/recherche?q=…` ; à 390 px, seule la loupe est visible et ouvre le champ ; axe-core
- [X] T020 [US4] `src/ui/en-tete/Recherche.tsx` : dès `lg`, rendre le champ de la combobox en permanence (loupe à gauche, texte d'exemple « Rechercher un produit… », largeur souple) avec le panneau de suggestions dessous ; sous `lg`, bouton loupe actuel ; logique de suggestions partagée ; `src/ui/en-tete/BarreNavigation.tsx` : placement entre le logo et « Panier »
- [X] T021 [US4] Adapter les tests qui ouvrent la recherche par la loupe sur ordinateur (`tests/e2e/f01/` : recherche et navigation)

**Checkpoint** : SC-005 vérifié.

---

## Phase 7: User Story 5 — « Panier » et « Mon compte » (P2)

**Goal** : libellés explicites, plus de « Connexion ».

**Independent Test** : quickstart §5 (libellés, connexion).

- [X] T022 [P] [US5] Écrire `tests/e2e/f18/en-tete.spec.ts` : à 1 024, 1 093, 1 280 et 1 920 px, « Panier » (avec pastille) et « Mon compte » visibles, aucun « Connexion », 7 entrées du menu visibles ; à 390 px, noms accessibles « Panier, … » et « Mon compte » ; déconnecté, « Mon compte » → page de connexion (lien « Créer un compte ») → après connexion, `/mon-compte` ; connecté → `/mon-compte` ; client déjà connecté qui ouvre `/connexion` → `/mon-compte` (analyse C2) ; axe-core
- [X] T023 [US5] `src/ui/en-tete/BarreNavigation.tsx` : libellé « Panier » visible dès `lg` à côté de l'icône (pastille conservée, nom accessible inchangé) ; libellé « Mon compte » seul ; lien non connecté `/connexion?retour=/mon-compte` ; `app/(public)/connexion/page.tsx` : un client déjà connecté est redirigé vers `retour` ou `/mon-compte` (spec, cas limites ; analyse C2)
- [X] T024 [US5] Adapter `tests/e2e/f01/navigation.spec.ts` et `tests/e2e/f16/navigation.spec.ts` (« Mon compte / Connexion » → « Mon compte »)

**Checkpoint** : SC-006 vérifié.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T025 [P] `npm run typecheck`, `npm run lint` et le contrôle de contraste de la charte
- [X] T026 Tests unitaires complets (`npx vitest run`) et e2e complets, mobile et ordinateur, contre le serveur de développement (rejouer les échecs mobiles tardifs dus au ralentissement du serveur)
- [X] T027 Vérification visuelle (navigateur) : en-tête à 390, 1 024 et 1 280 px, panier avec quantités, fenêtre de retrait ; captures pour Pauline
- [X] T028 [P] Mettre à jour `docs/demonstration.md` (barre de recherche, libellés, confirmation de retrait) et `tests/e2e/parcours/README.md` (ligne F18)
- [ ] T029 Après accord de Pauline : contrôle des secrets, commit et push du lot A, puis surveillance de la CI

---

## Dependencies & Execution Order

- **Phase 1 → Phase 2** : les composants communs avant les stories qui les utilisent.
- **US1** (phase 3) : indépendante des composants ; peut démarrer dès la phase 1.
- **US2** (phase 4) dépend de T003 ; **US3** (phase 5) dépend de T002 et touche aussi
  `LignePanier.tsx` : faire T014 avant T017.
- **US4** et **US5** (phases 6 et 7) touchent tous deux `BarreNavigation.tsx` : T020 avant T023.
- **Polish** (phase 8) après toutes les stories.

## Parallel Example

```text
Après T001 : T002, T003, T004, T005, T006 en parallèle (fichiers distincts).
Puis : T009, T010, T012 en parallèle ; T013, T016, T019, T022 (tests) en parallèle.
```

## Implementation Strategy

1. **MVP** : phase 3 (US1, la règle commerciale) — livrable seule.
2. Puis US2 et US3 (panier), puis US4 et US5 (en-tête).
3. Un seul commit du lot A après la phase 8 et l'accord de Pauline.
4. Le lot B (cagnotte, service au trimestre, parrainage) aura sa propre spec après les réponses
   de Régis.
