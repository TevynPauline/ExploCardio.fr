---
description: "Liste des tâches — F12 Accès à la plateforme Cloud HDS (Nelson / PCA)"
---

# Tasks: F12 — Accès à la plateforme Cloud HDS (Nelson / PCA)

**Input**: documents de conception de `specs/012-acces-cloud-hds/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md) ;
socles de F11 à F06 livrés ; décisions D1 à D7 validées le 2026-10-19.

**Tests** : exigés par la constitution (principe X) et par SC-001 à SC-011 ; écrits **avant**
l'implémentation qu'ils vérifient.

## Format : `[ID] [P?] [Story] Description`

- **[P]** : réalisable en parallèle (fichiers différents, sans dépendance non terminée)
- **[Story]** : US1 à US6

## Conventions communes

Celles de F11 à F06 : TypeScript strict ; français au vouvoiement ; tokens de la charte ;
montants en centimes, **HT** ; la plateforme n'est jamais appelée hors du connecteur PCA ; toute
action sur un accès passe par `src/domaine/cloud/acces.ts` (connecteur, registre, journal,
email, tâche) ; aucun mot de passe, aucun identifiant de connexion, aucun champ de patient ;
clés d'email incluant le client ; un test qui change le sous-mode ou un paramètre le rétablit ;
pages nouvelles ajoutées aux contrôles transverses (`no-egress`, `accessibilite-charte`,
largeurs).

---

## Phase 1: Setup

- [X] T001 Paramètres du site dans `prisma/site/seed/contenus-initiaux.ts` et `src/lib/parametres.ts` : `cloud.url_plateforme` (démonstration : `/demo/plateforme-cloud`), `cloud.delai_grace_jours` = `30`, `cloud.rappel_periode_jours` = `30`, `cloud.rappel_fin_jours` = `7` (D1), `cloud.aide_premiere_connexion` (texte, D6) ; variable `PCA_SUBMODE` documentée dans `.env.example` et `src/lib/config.ts` (mode réel, D7) ; **rubrique « Rappels et accès Cloud » dans Back-office → Contenus → Coordonnées et textes** (`app/(back-office)/admin/contenus/coordonnees/`) pour régler ces paramètres (principe VI, A2), avec aussi les délais de rappel de F06 restés sans écran (`fidelite.rappel_droits_jours`, `fidelite.rappel_expiration_jours`) ; test e2e du réglage

---

## Phase 2: Foundational (prérequis bloquants)

- [X] T002 Compléter `prisma/site/schema.prisma` (migration `scripts/nouvelle-migration.sh site f12_acces_cloud`) selon [data-model.md](data-model.md) §1 : modèles `AccesLogiciel` (`acces_logiciel` ; origine `periode_incluse` / `location` / `abonnement` / `manuel` ; état `en_ouverture` / `actif` / `grace` / `suspendu` / `ferme` ; `debut`, `finPrevue`, `finGrace`, envois faits, `alerteLe` ; unicité compte + logiciel + origine + référence source) et `TacheAcces` (`tache_acces` ; action `ouvrir` / `suspendre` / `retablir` / `fermer` ; état `a_faire` / `realisee`) ; reprise en SQL des `SuiviLocation.droitCloudRef` / `droitCloudEtat` dans `AccesLogiciel` (origine `location`), puis retrait de ces deux champs ; réinitialisation de la démonstration : registre et tâches vidés
- [X] T003 Compléter `prisma/demo/schema.prisma` (migration `scripts/nouvelle-migration.sh demo f12_compte_cloud`) selon [data-model.md](data-model.md) §2 : modèle `CompteCloud` (`cloud_account`, partenaire **unique**) ; `AccesCloud.compteId` ; `Variante.logicielInclus`, `Variante.moisInclus` (12) sur les configurations « + logiciel Cloud » ; `Abonnement.priseEffet` ; jeu de départ : comptes reconstitués à partir des accès existants, `logicielInclus` renseigné, offres d'abonnement des deux logiciels Cloud
- [X] T004 Reporter dans [../011-connecteurs-base-demonstration/contracts/pca.md](../011-connecteurs-base-demonstration/contracts/pca.md), `odoo.md` et `stripe.md` les changements de [contracts/connecteurs.md](contracts/connecteurs.md) ; mettre à jour `src/connecteurs/pca/interfaces/index.ts` (`prolonger`, `lireCompte`, `mettreAJourMedecin` ; `confirmerTache` pour toutes les actions), `src/connecteurs/odoo/interfaces/catalogue.ts` (`logicielInclus`, `offreAbonnementLogiciel`), `location.ts` (`priseEffet`) et `src/connecteurs/stripe/interfaces/index.ts` (`debutPrelevements`)
- [X] T005 [P] Compléter `tests/contract/pca.test.ts` (communs aux deux modes) : premier droit → compte créé ; second logiciel → même compte (FR-003) ; deux ouvertures simultanées → un seul compte (SC-003) ; ouverture rejouée avec la même clé → même droit ; prolonger, passer en délai de grâce, suspendre, rétablir, fermer ; fermer un droit laisse le compte et les autres droits (FR-009) ; sous-mode manuel : `a_ouvrir` / `a_fermer`, puis `confirmerTache` → état final ; `mettreAJourMedecin` ; logiciel refusé → `CloudAccessDenied` ; aucune réponse ne contient de mot de passe ; la demande d'ouverture ne transmet **que** l'identité professionnelle, l'email, le RPPS ou SIRET, le cabinet, le logiciel et les dates (liste fermée, FR-026)
- [X] T006 Implémenter dans `src/connecteurs/pca/demo/index.ts` : compte unique par partenaire (contrainte d'unicité, création ou réutilisation dans la même transaction), `prolonger`, `lireCompte`, `mettreAJourMedecin`, confirmation des tâches pour toutes les actions ; dans `src/connecteurs/odoo/demo/` : `logicielInclus` lu sur la variante, offre d'abonnement logiciel, `creerAbonnement` avec `objet = logiciel` sans appareil et `priseEffet` ; dans `src/connecteurs/stripe/demo/` : session d'abonnement à `premierMontantTtc = 0` avec `debutPrelevements`
- [X] T007 Créer le module de domaine `src/domaine/cloud/acces.ts` : `ouvrirAcces`, `prolongerAcces`, `programmerFin`, `annulerFin`, `suspendreAcces`, `retablirAcces`, `fermerAcces` (avec ou sans délai de grâce), `confirmerTache`, `accesDuCompte` ; chacun appelle le connecteur, met à jour `AccesLogiciel`, journalise (auteur ou déclencheur, motif — FR-018), crée la `TacheAcces` et alerte l'équipe en sous-mode manuel, envoie l'email au client (à la confirmation en sous-mode manuel — SC-006) ; échec du connecteur → état conservé, alerte une fois, reprise au passage suivant (FR-005) ; `src/emails/modeles-cloud.tsx` (ouverture, fin de période proche avec proposition d'abonnement, fin de droits proche, délai de grâce, fermeture, suspension, rétablissement)
- [X] T008 [P] Écrire `tests/unit/cloud/acces.test.ts` : chaque action → état, ligne de journal, un email (SC-004) ; sous-mode manuel → tâche, client « en cours d'ouverture », email à la confirmation seulement, mêmes emails qu'en automatique (SC-006) ; échec puis reprise sans doublon (FR-005) ; aucun mot de passe ni champ de patient dans le registre (SC-005)

**Checkpoint** : un seul chemin pour agir sur un accès, prouvé dans les deux sous-modes.

---

## Phase 3: User Story 1 — Avoir accès à son logiciel dès qu'on en a besoin (P1) 🎯 MVP

- [X] T009 [P] [US1] Écrire `tests/unit/cloud/declencheurs.test.ts` : location incluant un logiciel, expédiée → accès actif avant la livraison (SC-001) ; achat payé d'une configuration « + logiciel Cloud » → accès actif pour 12 mois (FR-006, D2) ; deux logiciels pour le même médecin → un seul compte (SC-003) ; logiciel refusé → alerte, état « en cours d'ouverture », reprise
- [X] T010 [P] [US1] Écrire `tests/e2e/f12/ouverture.spec.ts` : louer un Holter « + logiciel Cloud », expédier au démonstrateur → logiciel actif dans « Mon compte » et email d'ouverture (lien, première connexion) ; acheter une configuration « + logiciel Cloud » → actif dès la confirmation, fin prévue affichée
- [X] T011 [US1] Brancher F05 sur le domaine : `src/domaine/location/suivi.ts` et `rappels.ts` appellent `src/domaine/cloud/acces.ts` (ouverture à l'expédition, suspension pour impayé, rétablissement, fin programmée à la résiliation, annulation par « Prolonger ») au lieu du connecteur PCA ; mettre à jour les tests de F05 concernés (`tests/unit/location/suivi.test.ts`, `resiliation.test.ts`, e2e `tests/e2e/f05/`)
- [X] T012 [US1] Brancher F04 : dans `src/domaine/commande/effets.ts`, un achat payé d'une variante avec `logicielInclus` ouvre l'accès (origine `periode_incluse`, fin = paiement + `moisInclus`) ; dans `src/domaine/commande/suivi.ts`, un remboursement intégral avant la livraison ferme l'accès sans délai de grâce, après la livraison avec délai de grâce (D2)

---

## Phase 4: User Story 2 — Fermer l'accès à la date prévue (P1)

- [X] T013 [P] [US2] Écrire `tests/unit/cloud/echeances.test.ts` : fin prévue atteinte → délai de grâce ; délai écoulé → fermé (SC-002) ; rappel 7 jours avant la fin, une fois (FR-008) ; rappel 30 jours avant la fin d'une période incluse avec la proposition d'abonnement, une fois (FR-029) ; résiliation annulée → fin annulée (FR-010) ; un logiciel fermé, les autres restent actifs (FR-009) ; accès non fermé à temps (plateforme injoignable, tâche non faite) → alerte une fois (FR-011)
- [X] T014 [P] [US2] Écrire `tests/e2e/f12/fin.spec.ts` : résilier une location avec logiciel → fin programmée visible ; « Avancer la date » au démonstrateur → délai de grâce puis fermé, emails reçus
- [X] T015 [US2] Créer `src/domaine/cloud/echeances.ts` (`traiterEcheancesCloud(maintenant)` : délais de grâce, fermetures, rappels, alertes d'accès non fermés, tâches en retard) et la tâche **horaire** `acces-cloud` dans `src/file-attente/travailleurs.ts` ; l'appeler aussi depuis « Avancer la date » de la démonstration (`src/connecteurs/demonstration.ts`)

---

## Phase 5: User Story 3 — Retrouver ses logiciels dans « Mon compte » (P1)

- [X] T016 [P] [US3] Écrire `tests/e2e/f12/mon-compte.spec.ts` : accès actif, en délai de grâce et fermé avec leurs dates ; « Accéder à la plateforme » ouvre la page simulée dans un nouvel onglet ; aide à la première connexion et « Écrire sur WhatsApp » ; client sans logiciel → offre et souscription ; aucun mot de passe ; axe-core (SC-010)
- [X] T017 [US3] Réécrire `app/(public)/mon-compte/logiciels/page.tsx` (domaine `accesDuCompte`, états en clair, dates, abonnement en cours et son bouton de résiliation, lien externe annoncé « nouvel onglet », aide éditable, bouton WhatsApp existant, offre des logiciels Cloud) ; page simulée `app/demo/plateforme-cloud/page.tsx` (démonstration seulement, noindex) ; lien « Logiciels Cloud » dans le tableau de bord de « Mon compte »
- [X] T018 [P] [US3] Écrire `tests/unit/cloud/abonnement.test.ts` puis `tests/e2e/f12/abonnement.spec.ts` : poursuivre après la période incluse → abonnement à prise d'effet à la fin de la période, aucun prélèvement avant, accès prolongé sans délai de grâce (SC-011, D3) ; souscription directe d'un logiciel → accès ouvert au paiement ; résiliation de l'abonnement depuis « Mes logiciels Cloud » → fin au terme du mois payé, puis délai de grâce (FR-030) ; échéance refusée non régularisée → accès suspendu, régularisation → rétabli (FR-016, A1)
- [X] T019 [US3] Souscription par le panier et le tunnel de F04 (D3) : `src/domaine/catalogue/panier.ts` accepte un logiciel Cloud en formule mensuelle sans appareil ; `src/domaine/commande/tunnel.ts` et ses pages sans date de livraison, kit ni réservation pour ces lignes, conditions d'abonnement, « Premier prélèvement le … » en cas de prise d'effet différée ; `src/domaine/commande/effets.ts` ouvre ou prolonge l'accès à la confirmation ; bouton « Poursuivre avec l'abonnement » (Mon compte) et fiche du logiciel (`src/ui/catalogue/`) ; bouton « Résilier l'abonnement » dans « Mes logiciels Cloud », par la résiliation de F05 (A3) ; impayé d'un abonnement logiciel → suspension, régularisation → rétablissement, par les mêmes règles que les locations (A1) ; `src/domaine/cloud/abonnement.ts`

---

## Phase 6: User Story 4 — Gérer un accès à la main (P2)

- [X] T020 [P] [US4] Écrire `tests/e2e/f12/back-office.spec.ts` : administrateur et support ouvrent, suspendent, rétablissent, ferment avec un motif → état dans « Mon compte », email, journal ; motif obligatoire ; commercial → page refusée ; axe-core
- [X] T021 [US4] Créer `app/(back-office)/admin/logiciels-cloud/` (layout : administrateur et support, D4 ; page : tâches à faire en tête, recherche par nom, cabinet, email, RPPS ou SIRET, accès du client, actions avec motif) et le lien de navigation du back-office ; actions serveur dans `src/actions/` ou à côté de la page
- [X] T022 [US4] Brancher F02 : compte suspendu → accès suspendus ; compte réactivé → rétablis ; compte supprimé (RGPD) → fin programmée avec délai de grâce (FR-017) ; email ou cabinet modifié → `mettreAJourMedecin` ; tests dans `tests/unit/cloud/comptes.test.ts`

---

## Phase 7: User Story 5 — Ouvrir les accès quand la plateforme n'est pas automatisée (P2)

- [X] T023 [P] [US5] Écrire `tests/e2e/f12/sous-mode-manuel.spec.ts` (sous-mode `manual` le temps du test, puis rétabli) : location expédiée → tâche au back-office avec le médecin, ses coordonnées professionnelles, le logiciel, l'action et la date ; client « en cours d'ouverture » ; tâche confirmée → actif et email (SC-006) ; tâche d'ouverture non confirmée la veille de la livraison (location) ou un jour ouvré après le paiement (achat, abonnement) → alerte, une fois (SC-007, FR-021)
- [X] T024 [US5] Compléter `src/domaine/cloud/taches.ts` (création, confirmation, alertes de retard une fois) et l'affichage des tâches au back-office ; écran **Démonstration** : sous-mode PCA visible (et modifiable si `PCA_DEMO_SUBMODE` le permet, sinon indiqué)

---

## Phase 8: User Story 6 — Présenter l'offre en attendant le partenariat (P3)

- [X] T025 [P] [US6] Écrire `tests/e2e/f12/hebergement.spec.ts` : badge « En préparation », aucune souscription ; formulaire d'intérêt envoyé → confirmation, demande visible au back-office (demandes de devis) et opportunité dans Odoo ; badge retiré → offre normale
- [X] T026 [US6] Formulaire d'intérêt sur `app/(public)/services/hebergement-donnees-sante/page.tsx` (coordonnées, besoin), enregistré comme `DemandeDevis` (objet « Hébergement des données de santé — intérêt ») et copié en opportunité (domaine des devis de F03) ; protection anti-abus identique au formulaire de devis (D5)

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T027 [P] Ajouter les pages de F12 aux contrôles transverses (`no-egress`, `accessibilite-charte`, largeurs de 320 à 1 920 px) ; mettre à jour les tests de F02 (« Mes logiciels Cloud » n'est plus « bientôt disponible »), F04 et F05 touchés
- [X] T028 [P] Mettre à jour `docs/demonstration.md` (accès Cloud, sous-modes, page simulée, back-office Logiciels Cloud, offre en préparation) et `tests/e2e/parcours/README.md` (accès Cloud ✅) ; noter dans `specs/011-connecteurs-base-demonstration/contracts/pca.md` ce que Nelson doit fournir (D7)
- [X] T029 Dérouler [quickstart.md](quickstart.md) et corriger les écarts
- [ ] T030 Vérifier la conformité finale : `npm run typecheck`, `npm run lint`, `npm run check:contrast`, `npm test`, `npm run test:e2e` (ordinateur et mobile), `npm run test:lighthouse`, puis en intégration continue

---

## Dependencies & Execution Order

- Setup (T001) → Foundational (T002–T008) → US1 (MVP) → US2, US3 → US4, US5, US6 → Polish.
- T011 (F05) et T012 (F04) dépendent de T007 ; US2 dépend de US1 (accès ouverts) ; T019
  (souscription) dépend de T006 (abonnement logiciel côté connecteurs) ; US5 réutilise le
  sous-mode manuel du domaine (T007).

## Parallel Opportunities

- T005 et T008 en parallèle de T006 et T007 (tests d'abord) ; les tests marqués [P] de chaque
  story ensemble.
- US4, US5 et US6 indépendantes entre elles après US1.

## Implementation Strategy

1. Socle (T001–T008), puis US1 → les accès s'ouvrent pour les locations et les achats.
2. US2 et US3 : fin des droits, « Mes logiciels Cloud », souscription de l'abonnement.
3. US4 à US6, puis finitions et contrôles (T027–T030).
