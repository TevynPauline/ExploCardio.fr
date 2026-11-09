# Tasks: F22 — Affichage des prix TTC

**Input**: Design documents from `/specs/022-affichage-ttc/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/affichage-prix.md, quickstart.md

**Tests**: demandés par la constitution (principe X) et par les critères SC-001 à SC-005.

**Organization**: une phase par user story de la spec (US1 à US5), après une base commune.

**Garde-fous** : ne pas modifier `src/lib/referencement/*` (F21, déjà au TTC, commit `457c564`),
ni les fichiers non commités de F20 ; ne pas toucher aux bons d'achat, gains et droits
d'assistance (lot B de F18) ; une seule suite e2e à la fois sur le serveur local.

## Format: `[ID] [P?] [Story] Description`

- **[P]** : peut être fait en parallèle (fichiers différents, sans dépendance)
- **[Story]** : user story de la spec (US1 à US5)

---

## Phase 1: Setup

- [X] T001 Créer les dossiers `tests/unit/f22/` et `tests/e2e/f22/` et relever, dans `specs/022-affichage-ttc/inventaire.md`, la liste des écrans et emails de FR-007 à FR-014 avec leur fichier (repartir du tableau des constats de `research.md`)

---

## Phase 2: Foundational (bloque toutes les user stories)

- [X] T002 [P] Test unitaire `tests/unit/f22/prix.test.ts` : `montantsAffiches({ ht, tauxTva })` et `montantsAffiches({ ht, ttc })` (TTC = `round(ht × (100 + taux) / 100)` ; montant déjà calculé non recalculé) ; `prixTexte` → « 2 388,00 € TTC (soit 1 990,00 € HT) », avec « / mois » après chacun des deux montants, « À partir de » devant ; montant nul → « Offert » sans HT
- [X] T003 Implémenter `montantsAffiches` et `prixTexte` dans `src/domaine/catalogue/prix.ts` (réutiliser `prixTtc` et `euros` de `src/lib/montants.ts`) ; faire passer T002
- [X] T004 [P] Test de composant `tests/unit/f22/composant-prix.test.tsx` : `Prix` rend le TTC en premier (Semibold ; `text-h2` si `taille="grand"`), le HT juste en dessous (`text-small text-muted`) ; forme `ht + ttc` ; `aPartirDe`, `periode`, `barre` ; nom accessible unique « X euros TTC, soit Y euros HT » (contrat `contracts/affichage-prix.md`)
- [X] T005 Réécrire `src/ui/catalogue/Prix.tsx` selon le contrat (TTC d'abord, HT dessous, forme `ht + ttc`, `barre`, nom accessible, montant nul) ; faire passer T004
- [X] T006 [P] Test d'invariant `tests/unit/f22/totaux.test.ts` : sur 20 paniers de démonstration variés (quantités, paliers, prix client, remise automatique, code promo, frais de port, équipement volumineux), `Σ prixTtc(ligne.totalHt, ligne.tauxTva) + prixTtc(fraisPortHt + fraisSpecifiquesHt, 20) = achat.totalTtc` (data-model, SC-002 ; sans bons d'achat)

**Checkpoint** : règle d'affichage et composant prêts ; invariant des totaux vérifié.

---

## Phase 3: User Story 1 - Prix TTC d'abord dans le catalogue (Priority: P1) 🎯 MVP

**Goal**: cartes, recherche, méga-menu et fiches montrent le TTC en premier, le HT dessous.

**Independent Test**: parcourir une rubrique, une fiche à variantes et une fiche de consommable à paliers (quickstart §2, points 1 et 2).

- [X] T007 [P] [US1] Test e2e `tests/e2e/f22/catalogue.spec.ts` (desktop et mobile) : cartes « À partir de … € TTC » puis « soit … € HT » ; fiche à variantes (changement de configuration) ; consommable à paliers (lot, unitaire, total) ; prix client avec prix catalogue barré ; nom accessible ; axe sans violation ; pas de défilement horizontal à 390 px
- [X] T008 [P] [US1] Passer par `Prix` dans `src/ui/catalogue/CarteProduit.tsx`, `src/ui/catalogue/OngletsFiche.tsx`, `src/ui/catalogue/SelecteurFormule.tsx` (partie achat) et `src/ui/catalogue/ChoixConditionnement.tsx` (lot, unitaire, paliers, total)
- [X] T009 [P] [US1] Prix client et prix catalogue barré dans la fiche (`barre`) ; libellé du bouton d'ajout `src/ui/catalogue/AjoutPanier.tsx` (montant TTC d'abord)
- [X] T010 [P] [US1] Résultats de recherche : `src/ui/en-tete/Recherche.tsx`, `src/ui/en-tete/MegaMenu.tsx`, `app/(public)/recherche/page.tsx`
- [X] T011 [P] [US1] Promotions de la fiche `src/ui/fidelite/PromotionsFiche.tsx` (prix promotionnel et prix barré) — hors bons d'achat
- [X] T012 [US1] Mettre à jour les tests existants qui lisent le HT en premier : `tests/e2e/f01/recherche.spec.ts`, `tests/e2e/f01/pages-presentation.spec.ts`, `tests/e2e/f03/categories.spec.ts`, `tests/e2e/f03/consommables.spec.ts`, `tests/e2e/f03/disponibilite.spec.ts`, `tests/e2e/f03/fiche-equipement.spec.ts`, `tests/e2e/f03/onglets.spec.ts`

**Checkpoint** : catalogue entièrement en TTC d'abord.

---

## Phase 4: User Story 2 - Panier, livraison et paiement en TTC (Priority: P1)

**Goal**: lignes, port, franco et « Total TTC à payer » ; montant payé = total TTC.

**Independent Test**: panier de trois lignes avec port (quickstart §2, point 4).

- [X] T013 [P] [US2] Test e2e `tests/e2e/f22/panier.spec.ts` : chaque ligne en TTC puis HT ; frais de port et reste pour le franco en TTC puis HT ; « Total TTC à payer » en grand après le détail HT et la TVA ; somme des TTC des lignes et du port = total ; montant de l'écran de paiement de démonstration = total
- [X] T014 [US2] `src/ui/commande/LignePanier.tsx` : montant de ligne `Prix` avec `ht = totalHt`, `tauxTva` de la ligne (R2) ; remise de ligne en TTC puis HT
- [X] T015 [US2] `src/ui/commande/Totaux.tsx` : détail inchangé (sous-total HT, remises, livraison HT, total HT, TVA) puis « Total TTC à payer » en `text-h2` séparé par un filet (R3) ; bloc abonnement via `Prix` (`ht + ttc`, « / mois »)
- [X] T016 [P] [US2] Livraison et franco : `app/(public)/commande/livraison/page.tsx` (forfaits en TTC puis HT ; reste pour le franco au taux des frais, R4)
- [X] T017 [P] [US2] Récapitulatif et confirmation : `app/(public)/commande/recapitulatif/page.tsx`, `app/(public)/commande/confirmation/[ref]/page.tsx` ; écran de paiement de démonstration `app/demo/paiement/page.tsx` (montant TTC, HT dessous)
- [X] T018 [US2] Mettre à jour `tests/e2e/f04/panier.spec.ts`, `tests/e2e/f04/commande-carte.spec.ts`, `tests/e2e/f04/suivi.spec.ts`, `tests/e2e/paiement-demo.spec.ts`

**Checkpoint** : tunnel de commande en TTC d'abord, sans écart d'un centime.

---

## Phase 5: User Story 3 - Mise à disposition, financement et services (Priority: P2)

**Goal**: montants mensuels et tarifs de services en TTC d'abord.

**Independent Test**: fiche avec les trois formules (quickstart §2, point 3).

- [X] T019 [P] [US3] Test e2e `tests/e2e/f22/mensualites.spec.ts` : premier mois et mois suivants « … € TTC / mois » puis « soit … € HT / mois » ; mensualités de financement avec la mention « à titre indicatif » ; tarifs de services
- [X] T020 [P] [US3] `src/ui/catalogue/SelecteurFormule.tsx` (mise à disposition, financement), `app/(public)/mise-a-disposition/page.tsx`, `src/ui/financement/FormulaireFinancement.tsx`
- [X] T021 [P] [US3] `src/ui/catalogue/TarifService.tsx` (tarifs d'assistance, de dépannage, de logiciel au mois)
- [X] T022 [US3] Mettre à jour `tests/e2e/f03/services.spec.ts`, `tests/e2e/f04/financement.spec.ts`, `tests/e2e/f04/mise-a-disposition.spec.ts`, `tests/e2e/f05/depannage.spec.ts`, `tests/unit/financement/demande.test.ts`

---

## Phase 6: User Story 4 - Mon compte et emails (Priority: P2)

**Goal**: montants client en TTC d'abord ; documents Odoo inchangés.

**Independent Test**: commande de démonstration, Mon compte et boîte de démonstration (quickstart §2, points 5 et 6).

- [X] T023 [P] [US4] Test e2e `tests/e2e/f22/mon-compte.spec.ts` : commandes (liste et détail), devis, locations, factures, financements, logiciels : TTC d'abord ; la facture fictive PDF est identique avant et après (empreinte du contenu texte)
- [X] T024 [P] [US4] Pages `app/(public)/mon-compte/commandes/page.tsx`, `commandes/[ref]/page.tsx`, `devis/page.tsx`, `locations/page.tsx`, `factures/page.tsx`, `financements/page.tsx`, `logiciels/page.tsx`, `donnees/page.tsx` : montants via `Prix` (forme `ht + ttc` quand le connecteur fournit les deux)
- [X] T025 [P] [US4] Test unitaire `tests/unit/f22/emails.test.ts` : versions HTML et texte des emails de commande, de devis, de virement, de location et d'emailing citent « … € TTC (soit … € HT) »
- [X] T026 [US4] `src/emails/modeles-commandes.tsx`, `src/emails/modeles-locations.tsx`, `src/emails/modeles-emailing.tsx` : `prixTexte` (R5) ; `modeles-fidelite.tsx` inchangé
- [X] T027 [US4] Mettre à jour `tests/e2e/f05/mon-compte.spec.ts`, `tests/e2e/f05/resiliation.spec.ts`, `tests/unit/emailing/reapprovisionnement.test.ts`
- [X] T028 [US4] Vérifier que `src/connecteurs/odoo/demo/factures-pdf.ts` et `src/connecteurs/odoo/demo/devis-enregistres.ts` ne sont pas modifiés (FR-016)

---

## Phase 7: User Story 5 - Back-office en HT ; moteurs au TTC (Priority: P3)

**Goal**: l'équipe garde le HT avec une aide TTC ; les données structurées concordent avec le prix affiché.

**Independent Test**: saisie d'un prix au back-office ; données structurées d'une fiche (quickstart §2, point 7).

- [X] T029 [P] [US5] Aide « soit … € TTC » (taux de l'article) sous les champs de saisie de prix : `app/(back-office)/admin/catalogue/` (lecture seule : prix lus dans Odoo, sans saisie) et `app/(back-office)/admin/demonstration/prix` (écran de démonstration) ; affichages du back-office inchangés
- [X] T030 [P] [US5] Test unitaire `tests/unit/f22/donnees-structurees.test.ts` : pour trois fiches de démonstration, le prix déclaré par `src/lib/referencement/schema.ts` (F21) est égal au TTC rendu en premier par `Prix` (lecture seule de F21)
- [X] T031 [US5] Test e2e `tests/e2e/f22/back-office.spec.ts` : la saisie reste en HT avec l'aide TTC ; aucun prix du back-office n'est passé en TTC d'abord (SC-004)

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T032 [P] Charte `docs/brand/design-system.md` : nouvelle présentation des prix (FR-020)
- [X] T033 [P] Notes de renvoi vers F22 (FR-019), sans réécriture : `specs/001-socle-navigation-accueil/spec.md`, `specs/003-catalogue-fiches-produit/spec.md` (FR-006, FR-022, FR-027, SC-001), `specs/004-panier-paiement-financement/spec.md` (FR-002, FR-003, FR-043), `specs/005-mise-a-disposition-express/spec.md`, `specs/006-fidelite-bons-assistance/spec.md`, `specs/010-emailing-automatise/spec.md`, `specs/016-evolutions-fin-phase-1/spec.md`, `specs/018-ajustements-site/spec.md`, `specs/021-referencement-naturel/spec.md`
- [X] T034 Mettre à jour `tests/e2e/accessibilite-charte.spec.ts` si besoin ; vérification « TTC d'abord » commune (`tests/e2e/f22/outils.ts`) appliquée aux écrans de l'inventaire dans les specs `tests/e2e/f22/*`, dont 390 px sans défilement horizontal (SC-001, SC-005)
- [X] T035 Lancer `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:contract`, puis toute la suite e2e (seule sur le serveur ; relancer les échecs avec `--last-failed --workers=1`) ; dérouler `quickstart.md`

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T006)** → user stories.
- **US1 et US2** (P1) dépendent seulement de la phase 2 ; elles peuvent avancer en parallèle
  (fichiers distincts). **US3** réutilise `SelecteurFormule.tsx` modifié par US1 (T008) : après
  T008. **US4** et **US5** dépendent seulement de la phase 2.
- **Polish** après les user stories voulues.

### Parallel Opportunities

- Phase 2 : T002, T004, T006 ensemble ; puis T003 et T005.
- US1 : T007 à T011 ensemble (fichiers distincts), puis T012.
- US2 : T013, T016, T017 ensemble ; T014 puis T015.
- US4 : T023, T024, T025 ensemble ; puis T026 à T028.

## Implementation Strategy

1. **MVP** : phases 1, 2 et 3 (catalogue en TTC d'abord) — c'est ce que le médecin voit en
   premier.
2. Puis US2 (panier et paiement), indispensable avant l'ouverture.
3. Puis US3, US4, US5 et la finition ; tout F22 est livrable en un seul commit après la suite
   e2e complète.
