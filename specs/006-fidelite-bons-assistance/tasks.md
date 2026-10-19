---
description: "Liste des tâches — F06 Fidélité, bons d'achat et droits d'assistance"
---

# Tasks: F06 — Fidélité, bons d'achat et droits d'assistance

**Input**: documents de conception de `specs/006-fidelite-bons-assistance/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md) ;
socles de F11 à F05 livrés ; décisions D1 à D7 validées le 2026-10-19.

**Tests** : exigés par la constitution (principe X) et par SC-001 à SC-013 ; écrits **avant**
l'implémentation qu'ils vérifient.

## Format : `[ID] [P?] [Story] Description`

- **[P]** : réalisable en parallèle (fichiers différents, sans dépendance non terminée)
- **[Story]** : US1 à US9

## Conventions communes

Celles de F11 à F05 : TypeScript strict ; français au vouvoiement ; tokens de la charte ;
montants en centimes, **HT** ; le site ne calcule aucune règle du programme (FR-020) : tout
vient du connecteur Odoo ; chaque action journalisée ; aucun champ de patient ; un test qui
modifie un état partagé (règles, promotions, paramètres) le rétablit ; clés d'email incluant
le client ; pages nouvelles ajoutées aux contrôles transverses (`no-egress`,
`accessibilite-charte`, largeurs).

---

## Phase 1: Setup

- [X] T001 Paramètres du site dans `prisma/site/seed/contenus-initiaux.ts` et `src/lib/parametres.ts` : `fidelite.bons_au_panier` = `true` (D1), `fidelite.rappel_droits_jours` = `7`, `fidelite.rappel_expiration_jours` = `30` (D2)

---

## Phase 2: Foundational (prérequis bloquants)

- [X] T002 Compléter `prisma/demo/schema.prisma` (migration `scripts/nouvelle-migration.sh demo f06_fidelite`) selon [data-model.md](data-model.md) §1 : `CommandeVente.reglesFidelite`, `CommandeVente.bonsManquantsCentimes` ; `MouvementCagnotte` + `lotId`, `regles`, `motif`, `auteur` (type `ajustement`) ; modèles `LotBons` (`loyalty_lot`) et `InterventionPayee` (`assistance_ticket`) ; `DroitAssistance.historique` ; `Promotion.limites`, `Promotion.annoncee` et usages ; article de service `EC-ASSISTANCE-ACTE` (prix = `prixActeCentimes`, non éligible aux bons) ; jeu de départ : lots reconstitués à partir des crédits existants, une vente flash et une remise automatique en cours, un code « à annoncer » (D3, D6)
- [X] T003 Reporter dans [../011-connecteurs-base-demonstration/contracts/odoo.md](../011-connecteurs-base-demonstration/contracts/odoo.md) les opérations de [contracts/connecteurs.md](contracts/connecteurs.md) et mettre à jour `src/connecteurs/odoo/interfaces/fidelite.ts` (types : lots, mouvements avec motif, historique des droits, règles, interventions, promotions annonçables, manque pour le palier suivant)
- [X] T004 [P] Écrire le **jeu de commandes de référence** `tests/contract/odoo/fidelite-reference.ts` et `tests/contract/odoo/fidelite.test.ts` (communs aux deux modes, FR-039) : 400 / 500 / 800 / 1 000 / 1 200 € HT → 0 / 25 / 40 / 50 / 120 € ; commande mixte ; tensiomètre à 0 € ; part payée en bons exclue ; droits sous et au-dessus du seuil, cumul, remise à zéro, plafond, jamais raccourcis ; utilisation FIFO sur lots de validités différentes ; remboursement total (retraits, restitution à la validité d'origine, +30 jours si expirée) et partiel (taux figé) ; idempotence de chaque événement et deux commandes enregistrées simultanément, comptées une fois chacune (SC-005, A5) ; commande par virement annulée faute de paiement : bons rendus à leur validité d'origine (A1) ; solde = somme des mouvements (SC-004) ; intervention créée par l'achat de l'assistance à l'acte, sans bons ni droits
- [X] T005 Implémenter dans `src/connecteurs/odoo/demo/fidelite.ts` : règles figées au paiement, lots et consommation FIFO, restitution à la validité d'origine (+30 jours de grâce), retrait partiel au taux figé, bons déjà dépensés reportés en `bonsManquantsCentimes`, historique des droits, `estimerGains` avec manque pour le palier suivant, y compris **sans client** (visiteur ou compte sans fiche : bons selon le palier, montant d'ouverture des droits — A3), `listerMouvementsDepuis`, `lireReglesProgramme`, `listerInterventions`, `promotionsEnCours` ; application des règles par Odoo lui-même à chaque changement d'état d'une commande (payée, virement reçu, annulée, remboursée) dans `demo/commandes.ts` et `demo/administration.ts`
- [X] T006 Compléter `src/connecteurs/odoo/demo/commandes.ts` et `devis.ts` : intervention payée créée pour `EC-ASSISTANCE-ACTE` ; limites d'usage des codes promo (total, par client, montant minimum, nouveaux clients) ; bons limités au montant éligible des achats ; décision de remboursement réduite des bons déjà dépensés, avec note et alerte (D4) ; annulation d'une commande par virement non payée : restitution des bons par la règle commune (lots d'origine, +30 jours de grâce — A1)
- [X] T007 Opérations réservées à la démonstration dans `src/connecteurs/odoo/demo/administration.ts` et `src/connecteurs/demonstration.ts` : ajuster une cagnotte ou des droits (motif et auteur obligatoires), clore une intervention, expirer les bons à une date, modifier les règles du programme (déjà en partie), créer et terminer une promotion ; écran **Démonstration → Paramètres commerciaux** complété
- [X] T008 Compléter `prisma/site/schema.prisma` (migration `scripts/nouvelle-migration.sh site f06_fidelite`) : `Panier.bonsDemandesHt` (null = maximum) ; modèle `SuiviFidelite` ; réinitialisation de la démonstration : suivis de fidélité

**Checkpoint** : règles conformes et prouvées par le jeu de référence.

---

## Phase 3: User Story 1 — Gagner des bons d'achat (P1) 🎯 MVP

- [X] T009 [P] [US1] Écrire `tests/unit/fidelite/suivi.test.ts` (partie crédit) : crédit relevé une fois → email avec montant, commande et fin de validité ; relevé deux fois → un seul email (SC-005) ; en moins de 5 minutes (tâche planifiée, SC-006)
- [X] T010 [P] [US1] Écrire `tests/e2e/f06/gains.spec.ts` : panier de consommables → gains annoncés et manque pour le palier suivant ; fiche consommable → « cet achat vous rapporte », y compris pour un visiteur (A3) ; commande de 1 200 € HT payée → 120 € dans « Mon compte » (SC-001) ; confirmation d'une commande sous le seuil des droits → ce qui manquait est indiqué (A2)
- [X] T011 [US1] Créer `src/domaine/fidelite/suivi.ts` (`suivreFidelite` : `listerMouvementsDepuis`, `SuiviFidelite`, emails) et la tâche toutes les 5 minutes dans `src/file-attente/travailleurs.ts` ; `src/emails/modeles-fidelite.tsx`
- [X] T012 [US1] Afficher les gains (bons, droits, palier suivant) dans `app/(public)/panier/page.tsx`, sur les fiches consommables (`src/ui/catalogue/FicheConsommable.tsx`, domaine `src/domaine/fidelite/gains.ts`) et sur la page de confirmation de commande (gains obtenus, ou ce qui manquait pour ouvrir les droits — A2)

---

## Phase 4: User Story 2 — Droits d'assistance (P1)

- [X] T013 [P] [US2] Compléter `tests/unit/fidelite/suivi.test.ts` : ouverture et prolongation relevées → un email avec la date de fin ; rappel 7 jours avant la fin, une fois (D2) ; statut inactif après la fin
- [X] T014 [US2] Compléter `suivi.ts` (ouvertures, prolongations, retraits) et créer `src/domaine/fidelite/rappels.ts` (tâche quotidienne : rappel de fin de droits, rappel d'expiration de bons ; en démonstration, `expirerBons` du jour)

---

## Phase 5: User Story 3 — Utiliser ses bons (P1)

- [X] T015 [P] [US3] Écrire `tests/unit/fidelite/panier.test.ts` : montant choisi enregistré, plafonné par le devis au montant éligible ; « maximum » par défaut ; paiement abandonné → aucun débit ; commande payée → utilisation dans l'historique (lots les plus anciens d'abord) ; compte suspendu → bons inutilisables, et aucune commande donc aucune prolongation des droits (A6)
- [X] T016 [P] [US3] Écrire `tests/e2e/f06/utiliser-bons.spec.ts` : solde de 120 € (ajustement au démonstrateur), 50 € utilisés → reste 70 € ; solde supérieur au panier → seul le montant éligible est débité
- [X] T017 [US3] Panier : champ « Bons d'achat à utiliser » (montant, maximum proposé, solde et prochaine expiration) dans `src/ui/commande/` et `src/actions/panier.ts` ; `src/domaine/catalogue/panier.ts` (`utiliserBons` → montant) ; `src/domaine/commande/devis.ts` transmet le montant ; règle de cumul expliquée

---

## Phase 6: User Story 4 — Annuler ou rembourser (P1)

- [X] T018 [P] [US4] Compléter `tests/unit/fidelite/suivi.test.ts` : retrait et restitution relevés → emails ; bons déjà dépensés → remboursement réduit, équipe alertée (D4) ; virement annulé faute de paiement → rien
- [X] T019 [P] [US4] Écrire `tests/e2e/f06/remboursement.spec.ts` : commande ayant crédité 120 € et ouvert des droits, remboursée au démonstrateur → retraits visibles ; commande payée en bons, remboursée → bons rendus avec leur validité d'origine (SC-003)
- [X] T020 [US4] Compléter `suivi.ts` (retrait, restitution, alerte des bons déjà dépensés) et l'écran de démonstration des commandes (montant réduit affiché)

**Checkpoint** : MVP du programme (US1 à US4).

---

## Phase 7: User Story 5 — Mon compte (P2)

- [X] T021 [P] [US5] Écrire `tests/e2e/f06/mon-compte.spec.ts` : « Bons d'achat » (solde = somme de l'historique, prochaine expiration, mouvements reliés aux commandes, SC-004, SC-008) ; « Droits d'assistance » (actif : fin, origine, comment prolonger ; inactif : montant qui les ouvrirait et assistance à l'acte) ; axe-core
- [X] T022 [US5] Réécrire `app/(public)/mon-compte/bons-achat/page.tsx` et `app/(public)/mon-compte/assistance/page.tsx` (domaine `src/domaine/fidelite/cagnotte.ts`, `droits.ts`) avec le motif des trois points (consommables → bons → assistance) ; avertissement de perte de la cagnotte et des droits avant suppression du compte (`app/(public)/mon-compte/donnees`)

---

## Phase 8: User Story 6 — Vérifier les droits avant d'aider (P2)

- [X] T023 [P] [US6] Écrire `tests/e2e/f06/assistance-equipe.spec.ts` : recherche par nom, cabinet, email, téléphone, RPPS, SIRET → statut, fin, origine, interventions, en moins de 15 secondes (SC-007) ; support autorisé ; aucune action possible ; ajustement manuel au démonstrateur → affiché avec son motif
- [X] T024 [US6] Créer `app/(back-office)/admin/assistance/page.tsx` (lecture seule, toute l'équipe — D7) et le lien de navigation

---

## Phase 9: User Story 7 — Règles du programme (P2)

- [X] T025 [P] [US7] Écrire `tests/unit/fidelite/regles.test.ts` : taux modifié → commande suivante au nouveau taux, crédit passé inchangé (SC-002) ; seuil, durée ou prolongation modifiés → droits acquis inchangés ; ajustement manuel → mouvement « ajustement » avec motif dans l'historique
- [X] T026 [US7] Vérifier qu'aucun écran du back-office du site ne règle le programme (FR-029) ; afficher les règles en vigueur en lecture seule sur `/admin/assistance` et dans « Mon compte » (comment obtenir l'assistance)

---

## Phase 10: User Story 8 — Promotions (P2)

- [X] T027 [P] [US8] Écrire `tests/unit/fidelite/promotions.test.ts` : vente flash annoncée entre ses dates, arrêtée à la minute (SC-010) ; code non annoncé sauf « à annoncer » (D6) ; limites d'usage des codes
- [X] T028 [P] [US8] Écrire `tests/e2e/f06/promotions.spec.ts` : vente flash créée au démonstrateur → bandeau et fiche (prix d'origine, prix remisé HT, fin), appliquée au panier, détail du cumul ; terminée pendant qu'un article est au panier → prix en vigueur appliqué et client informé (A4) ; terminée → plus affichée ni appliquée
- [X] T029 [US8] Créer `src/domaine/fidelite/promotions.ts` ; compléter le bandeau (`src/ui/BandeauPromo.tsx` : messages éditoriaux + promotions en cours) et les fiches (`src/ui/catalogue/SelecteurFormule.tsx`, `FicheConsommable.tsx`) ; cache d'une minute au plus

---

## Phase 11: User Story 9 — Assistance à l'acte (P3)

- [X] T030 [P] [US9] Écrire `tests/e2e/f06/assistance-acte.spec.ts` : sans droits → proposition avec prix HT ; achat par carte → intervention disponible dans « Mon compte » et au back-office, facture ; clôture au démonstrateur → consommée, email ; avec droits actifs → non proposée (D5)
- [X] T031 [US9] Fiche service de l'assistance à l'acte (achat par carte seulement : virement refusé pour ce seul article dans `src/domaine/commande/tunnel.ts`) ; intervention dans `mon-compte/assistance` ; email de clôture dans `suivi.ts`

---

## Phase 12: Polish & Cross-Cutting Concerns

- [X] T032 [P] Ajouter les pages de F06 aux contrôles transverses (`no-egress`, `accessibilite-charte`, largeurs) ; mettre à jour les tests de F01 à F05 touchés (bons au panier activés, bandeau, rubriques de « Mon compte »)
- [X] T033 [P] Mettre à jour `docs/demonstration.md` (bons, droits, assistance à l'acte, promotions, écran de démonstration) et `tests/e2e/parcours/README.md` (fidélité ✅)
- [X] T034 Dérouler [quickstart.md](quickstart.md) et corriger les écarts
- [ ] T035 Vérifier la conformité finale : `npm run typecheck`, `npm run lint`, `npm run check:contrast`, `npm test`, `npm run test:e2e` (ordinateur et mobile), `npm run test:lighthouse`, puis en intégration continue

---

## Dependencies & Execution Order

- Setup (T001) → Foundational (T002–T008) → US1 (MVP) → US2, US3, US4 → US5 à US9 → Polish.
- US3 dépend de US1 (cagnotte créditée) ; US9 dépend de US2 (statut des droits).

## Parallel Opportunities

- T004 en parallèle de T003 ; les tests marqués [P] de chaque story ensemble.
- US6, US7 et US8 indépendantes après US1.

## Implementation Strategy

1. Socle et jeu de référence (T001–T008), puis US1 → démontrable.
2. US2 à US4 : programme complet et sans avantage indu.
3. US5 à US9, puis finitions et contrôles (T032–T035).
