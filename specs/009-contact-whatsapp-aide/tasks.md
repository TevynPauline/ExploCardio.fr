---
description: "Liste des tâches — F09 Contact WhatsApp et centre d'aide"
---

# Tasks: F09 — Contact WhatsApp et centre d'aide

**Input**: documents de conception de `specs/009-contact-whatsapp-aide/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md) ;
socles de F11 à F12 livrés ; décisions D1 à D7 validées le 2026-10-20.

**Tests** : exigés par la constitution (principe X) et par SC-001 à SC-009 ; écrits **avant**
l'implémentation qu'ils vérifient.

## Format : `[ID] [P?] [Story] Description`

- **[P]** : réalisable en parallèle (fichiers différents, sans dépendance non terminée)
- **[Story]** : US1 à US5

## Conventions communes

Celles de F11 à F12 : TypeScript strict ; français au vouvoiement ; tokens de la charte ;
aucun lien `tel:` ni `wa.me` vers un vrai numéro en démonstration (tout passe par
`src/lib/contact-whatsapp.ts`) ; aucun champ de patient ; un test qui modifie un paramètre le
rétablit ; pages nouvelles ajoutées aux contrôles transverses (`no-egress`,
`accessibilite-charte`, largeurs).

---

## Phase 1: Setup

- [X] T001 Paramètres du site dans `prisma/site/seed/contenus-initiaux.ts` et `src/lib/parametres.ts` : `contact.horaires` (JSON par jour, lundi à vendredi 9 h – 18 h, D1) et `contact.fermetures` (`[]`) ; texte de la politique de confidentialité complété (nom et cabinet transmis à WhatsApp par le médecin lui-même, à valider par le conseil juridique)

---

## Phase 2: Foundational (prérequis bloquants)

- [X] T002 [P] Écrire `tests/unit/contact/horaires.test.ts` et `tests/unit/contact/message.test.ts` : ouvert / fermé selon le jour et l'heure de Paris, prochaine ouverture (soir, week-end, jour férié, fermeture exceptionnelle, plusieurs plages) ; message pré-rempli connecté (« Dr [nom], cabinet [cabinet] », sans cabinet, compte cabinet), visiteur (modèle à compléter), caractères spéciaux et encodage, jamais d'email, de RPPS ni de numéro de compte (SC-005) ; liens réels `tel:` et `wa.me` composés, liens de démonstration en phase 1 (SC-007) ; numéro absent → pas de lien (D7)
- [X] T003 Créer `src/domaine/contact/horaires.ts` (`lireHoraires`, `etatReponse(maintenant)` → ouvert ou prochaine ouverture, jours fériés par `src/lib/calendrier.ts`) et compléter `src/lib/contact-whatsapp.ts` (`messagePrerempli(compte | null)`, `liensContact` avec le message, numéro absent → `null`)
- [X] T004 Créer le composant `src/ui/contact/ContactWhatsApp.tsx` (variantes complète et compacte ; numéro, horaires, état, boutons « Appeler » et « Écrire sur WhatsApp » au libellé explicite et annonçant l'ouverture d'une autre application, cibles de 44 px, mention « Ne transmettez aucune donnée patient » ; sans numéro : lien vers le formulaire de contact)

**Checkpoint** : un composant et des fonctions pures, prouvés par les tests unitaires.

---

## Phase 3: User Story 1 — Joindre l'équipe d'un geste (P1) 🎯 MVP

- [X] T005 [P] [US1] Écrire `tests/e2e/f09/contact.spec.ts` : numéro, horaires, boutons et mention dans le pied de page, la page Assistance, « Mon compte », une fiche produit et une page d'aide (SC-001) ; en démonstration, les boutons ouvrent la page de démonstration (SC-007) ; mobile : cibles 44 px, libellés explicites ; contact trouvé en moins de 10 secondes (SC-006) ; email transactionnel avec le bloc de contact ; axe-core
- [X] T006 [US1] Placer le composant : `src/ui/PiedDePage.tsx` (compact), `app/(public)/services/assistance/page.tsx`, `app/(public)/mon-compte/page.tsx`, fiches produit (`src/ui/catalogue/Fiche.tsx`), « Mes logiciels Cloud » ; remplacer les boutons faits à la main (page d'accueil, qui-sommes-nous, formulaire de contact) par le composant
- [X] T007 [US1] Bloc de contact dans le gabarit des emails `src/emails/Gabarit.tsx` (numéro, horaires, lien « Écrire sur WhatsApp ») ; mise à jour des tests d'emails touchés

---

## Phase 4: User Story 2 — Être reconnu dès le premier message (P1)

- [X] T008 [P] [US2] Écrire `tests/e2e/f09/message.spec.ts` : en démonstration, « Écrire sur WhatsApp » ouvre la page de contact, qui affiche le message qui aurait été pré-rempli (« Dr [nom], cabinet [cabinet] » connecté, modèle à compléter déconnecté) ; le lien `wa.me` du mode réel est couvert par T002
- [X] T009 [US2] Passer le compte courant au composant (nom, cabinet) partout où il est rendu ; la page `app/demo/contact` affiche le message pré-rempli reçu

---

## Phase 5: User Story 3 — Trouver la réponse seul (P1)

- [X] T010 Compléter `prisma/site/schema.prisma` (migration `scripts/nouvelle-migration.sh site f09_centre_aide`) : modèle `ContenuAide` (`contenu_aide`) selon [data-model.md](data-model.md) ; retrait des types `faq`, `tutoriel`, `notice` de `TypeContenu` ; jeu de départ : quelques contenus d'exemple fictifs (un mode d'emploi du Holter DMS 300-4L, une procédure générale en PDF, des questions de FAQ, une vidéo d'exemple en préparation tant qu'aucun fichier n'est fourni — D4) ; le type `notice` ne sert qu'aux documents non liés à un produit (A1)
- [X] T011 [P] [US3] Écrire `tests/unit/aide/aide.test.ts` : seuls les contenus publiés sont lus ; filtres appareil, logiciel, thème ; recherche (accents, casse) ; FAQ triée par consultations ; compteur limité par session ; contenus liés à une référence d'article
- [X] T012 [P] [US3] Écrire `tests/e2e/f09/centre-aide.spec.ts` : `/aide` classé par appareil, logiciel et thème ; recherche ; FAQ les plus consultées en tête ; mode d'emploi pas à pas (texte et image par étape) ; notices des produits reprises de leur fiche (F03, sans second téléversement, A1) ; vidéo publiée par le test lui-même avec de petits fichiers d'essai → piste de sous-titres et transcription affichées, puis retirée (B2) ; « Besoin d'aide ? » et boutons en bas de chaque page d'aide ; recherche sans résultat → invitation à écrire sur WhatsApp ; fiche du Holter : « Aide pour ce modèle » ; recherche du site : groupes Tutoriels et Questions fréquentes ; axe-core
- [X] T013 [US3] Créer `src/domaine/aide/` (lecture des contenus publiés, notices et fiches techniques des produits reprises de F03 et classées par appareil, filtres, recherche, contenus d'une référence, compteur de consultations) ; pages `app/(public)/aide/page.tsx` et `app/(public)/aide/[slug]/page.tsx` (vidéo avec piste de sous-titres et transcription, étapes, PDF, réponse de FAQ) ; route `app/api/aide/[slug]/consultation/route.ts` (204, sans donnée personnelle) ; liens dans le menu Services et le pied de page
- [X] T014 [US3] Brancher la recherche de F01 (`src/domaine/recherche/`) sur les contenus d'aide publiés (groupes Tutoriels et Questions fréquentes) ; « Aide pour ce modèle » sur les fiches (`src/ui/catalogue/Fiche.tsx`) ; aide à la première connexion de « Mes logiciels Cloud » reliée au centre d'aide

---

## Phase 6: User Story 4 — Régler le numéro, les horaires et les contenus (P2)

- [X] T015 [P] [US4] Écrire `tests/e2e/f09/reglages.spec.ts` : changer le numéro et les horaires, ajouter une fermeture exceptionnelle au back-office → mis à jour dans le pied de page, la page Assistance et l'email suivant (SC-003) ; numéro vidé → aucun bouton, lien vers le formulaire de contact ; créer un mode d'emploi relié au Holter, le publier → visible sur `/aide` et la fiche ; vidéo sans sous-titres ou transcription → publication refusée ; contenu en préparation → invisible ; valeurs rétablies en fin de test
- [X] T016 [US4] Back-office → Contenus → Coordonnées et textes (`app/(back-office)/admin/contenus/coordonnees/` et `actions.ts`) : numéro WhatsApp, horaires par jour (plages), fermetures exceptionnelles ; validation ; journal ; cache invalidé aussitôt
- [X] T017 [US4] Back-office → Contenus → Centre d'aide (`app/(back-office)/admin/contenus/aide/`, administrateur) : liste, création et modification (type, titre, résumé, thème, références liées, étapes, téléversements vidéo / WebVTT / PDF / images par `src/lib/stockage.ts`), publication refusée sans sous-titres ni transcription pour une vidéo (FR-015), rappel « aucune donnée de patient réelle » au-dessus des téléversements (FR-016), retrait ; journal ; domaine `src/domaine/aide/administration.ts`

---

## Phase 7: User Story 5 — Connaître les droits du client qui écrit (P2)

- [X] T018 [P] [US5] Écrire `tests/e2e/f09/droits.spec.ts` : « Mon compte » affiche l'état des droits d'assistance à côté du contact (actif avec date de fin, ou inactif avec l'assistance à l'acte) ; Back-office → Assistance : client retrouvé par son téléphone
- [X] T019 [US5] Afficher l'état des droits (F06, `src/domaine/fidelite/droits.ts`) dans le bloc de contact du tableau de bord de « Mon compte »

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T020 [P] Ajouter les pages de F09 aux contrôles transverses (`no-egress` : aucun `tel:` ni `wa.me` réel en démonstration ; `accessibilite-charte` ; largeurs de 320 à 1 920 px) ; mettre à jour les tests de F01 à F12 touchés (pied de page, boutons de contact, types de contenus retirés)
- [X] T021 [P] Mettre à jour `docs/demonstration.md` (contact, horaires, centre d'aide, réglages) et `tests/e2e/parcours/README.md` (contact et aide ✅)
- [X] T022 Dérouler [quickstart.md](quickstart.md) et corriger les écarts
- [X] T023 Vérifier la conformité finale : `npm run typecheck`, `npm run lint`, `npm run check:contrast`, `npm test`, `npm run test:e2e` (ordinateur et mobile), `npm run test:lighthouse`, puis en intégration continue

---

## Dependencies & Execution Order

- Setup (T001) → Foundational (T002–T004) → US1 (MVP) → US2 → US3 → US4, US5 → Polish.
- US2 dépend de US1 (composant placé) ; T014 dépend de T013 ; T017 dépend de T010.

## Parallel Opportunities

- Les tests marqués [P] de chaque story ensemble ; US4 et US5 indépendantes.

## Implementation Strategy

1. Socle (T001–T004), puis US1 → le contact est partout.
2. US2 et US3 : message pré-rempli, centre d'aide.
3. US4 et US5, puis finitions et contrôles (T020–T023).
