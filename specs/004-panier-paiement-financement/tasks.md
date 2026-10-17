---
description: "Liste des tâches — F04 Panier, paiement Stripe et demandes de financement"
---

# Tasks: F04 — Panier, paiement Stripe et demandes de financement

**Input**: documents de conception de `specs/004-panier-paiement-financement/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md) ;
socles de F11, F01, F02 et F03 livrés.

**Tests** : exigés par la constitution (principe X) et par les critères SC-001 à SC-014 ;
écrits **avant** l'implémentation qu'ils vérifient.

**Organisation** : par user story, chacune réalisable et vérifiable seule.

## Format : `[ID] [P?] [Story] Description`

- **[P]** : réalisable en parallèle (fichiers différents, sans dépendance non terminée)
- **[Story]** : US1 à US8

## Conventions communes

Celles de F11 à F03 : TypeScript strict ; français au vouvoiement ; tokens de la charte ;
aucun accès à Odoo ni à Stripe hors du registre ; montants en centimes, HT en premier puis TVA
et TTC ; aucune donnée de carte ni coordonnée bancaire du client sur le site (FR-016) ; aucun
nom d'organisme de financement (FR-037) ; erreurs reliées aux champs, saisies conservées ;
cibles de 44 px ; composants clients sans import de module serveur ; tout test qui modifie un
état partagé (panne, stock, paramètre) le rétablit **et attend la confirmation** ; chaque page
nouvelle ajoutée à `tests/e2e/no-egress.spec.ts`, `tests/e2e/accessibilite-charte.spec.ts`
et au contrôle des largeurs de `tests/e2e/f03/transverses.spec.ts`.

---

## Phase 1: Setup

- [ ] T001 Ajouter les paramètres de F04 à `prisma/site/seed/contenus-initiaux.ts` (créés s'ils manquent) : `commande.heure_limite_express` = `14:00` (D2), `virement.titulaire`, `virement.iban`, `virement.bic` (valeurs fictives marquées « démonstration », D4), `virement.rappel_jours` = `2` (D5)

---

## Phase 2: Foundational (prérequis bloquants)

**⚠️ CRITICAL** : aucune user story ne commence avant la fin de cette phase.

### Connecteur Odoo : opérations ajoutées au contrat

- [ ] T002 Reporter dans [../011-connecteurs-base-demonstration/contracts/odoo.md](../011-connecteurs-base-demonstration/contracts/odoo.md) les opérations et types de [contracts/odoo.md](contracts/odoo.md) : « Calculer un devis », « Créer une commande à régler par virement », « Lister les changements de commandes », « Lister les remboursements à exécuter », « Enregistrer un remboursement », « Annuler une commande en attente » ; `StatutCommande` = `en_attente_paiement`, `payee`, `en_preparation`, `expediee`, `livree`, `annulee`, `remboursee_partiellement`, `remboursee` ; `Commande` + `transporteur`, `echeancePaiement`, `remboursementsTtc` ; `NouvelleCommande.livraison.mode`
- [ ] T003 [P] Écrire les tests de contrat dans `tests/contract/odoo/commandes.test.ts` selon le tableau « Règles vérifiées » de [contracts/odoo.md](contracts/odoo.md) : totaux du devis, TVA par taux, franco, frais des équipements volumineux hors franco, code promo invalide ou expiré refusé avec motif, bons plafonnés, total jamais négatif, express absent si un article n'est pas en stock, idempotence et montants identiques au devis, commande par virement (statut, stock réservé, échéance), annulation (stock rendu), remboursement (avoir numéroté à la suite, total ou partiel, idempotent), changements listés depuis une date
- [ ] T004 Compléter `prisma/demo/schema.prisma` (migration `scripts/nouvelle-migration.sh demo f04_commandes`) : modèle `ModeLivraison` (`delivery.carrier` : code, libellé, forfait HT, délai jours, seuil de franco, actif) ; `Variante.fraisLivraisonCentimes`, `Variante.fraisInstallationCentimes` ; `CommandeVente` : statuts complétés, `echeancePaiement`, `transporteur`, `modifieLe` ; modèle `Remboursement` (commande, montant TTC, source `odoo` / `stripe`, état `a_executer` / `execute`, référence Stripe, clé unique) ; paramètre du délai de réservation d'un virement (7 jours) ; jeu de départ : modes standard et express, franco, frais des équipements d'effort volumineux
- [ ] T005 Mettre à jour `src/connecteurs/odoo/interfaces/commandes.ts` et implémenter les opérations dans `src/connecteurs/odoo/demo/commandes.ts` (devis réutilisé par `creerCommandePayee` pour garantir les mêmes montants), avec les opérations réservées à la démonstration : virement reçu, marquer expédiée (transporteur, suivi) ou livrée, décider un remboursement ; adapter les usages de `StatutCommande` (F02 RGPD, « Mon compte »)

### Base du site

- [ ] T006 Compléter `prisma/site/schema.prisma` selon [data-model.md](data-model.md) (migration `scripts/nouvelle-migration.sh site f04_commandes`) : `Panier.codePromo`, `Panier.utiliserBons` ; `DemandeFinancement` + `cabinet`, `mensualiteIndicativeHt`, `commandeRef` ; modèles `CommandeSite` (référence unique `EC-AAAA-NNNNNN`, compte, étape, adresses, mode de livraison, moyen de paiement, CGV acceptées le, devis, `etatAchat` et `etatAbonnement` parmi `a_payer` / `paiement_en_cours` / `payee` / `a_enregistrer` / `en_attente_virement` / `refusee` / `sans_objet`, sessions, tentative, références d'Odoo, lignes, dates) et `SuiviCommande` (référence d'Odoo unique, dernier statut notifié, date)
- [ ] T007 Ajouter au périmètre de la réinitialisation (`src/connecteurs/demonstration.ts`) les commandes du site, suivis et demandes de financement des séances

### Domaine « commande » : socle

- [ ] T008 [P] Écrire `tests/unit/commande/devis.test.ts` : lignes du panier → appel du devis d'Odoo (client ou visiteur, code promo, bons si F06 livré, mode de livraison) ; blocs « Paiement unique » et « Abonnement mensuel » ; changement de prix depuis l'ajout signalé ; ligne indisponible marquée et bloquante ; connecteur injoignable → panier lisible sans montants affirmés
- [ ] T009 Créer `src/domaine/commande/devis.ts` (`panierDetaille`) et `src/emails/modeles-commandes.tsx` avec tous les modèles de [contracts/emails.md](contracts/emails.md)

**Checkpoint** : contrat d'Odoo étendu et testé ; devis disponible pour le panier et le tunnel.

---

## Phase 3: User Story 1 - Composer son panier (Priority: P1) 🎯 MVP

**Goal** : panier complet, deux blocs, modifiable, conservé et fusionné à la connexion.

**Independent Test** : ajouter un achat et une mise à disposition, modifier, se reconnecter, retrouver le panier.

### Tests for User Story 1

- [ ] T010 [P] [US1] Écrire `tests/unit/commande/panier.test.ts` : modifier une quantité (1 à 999), supprimer une ligne, appliquer et retirer un code promo, fusion du panier d'un visiteur dans celui du compte (quantités additionnées, panier du visiteur supprimé, aucun doublon), panier d'un compte sans expiration
- [ ] T011 [P] [US1] Écrire `tests/e2e/f04/panier.spec.ts` : deux blocs et leurs totaux (HT, remises, port, TVA, TTC ; 1er mois et mois suivants), panier sans achat ou sans mise à disposition (un seul bloc), quantité et suppression → totaux mis à jour, code `DEMO10` accepté, code inconnu refusé avec le motif, délai rappelé sur la ligne, prix changé signalé, panier retrouvé après reconnexion, fusion à la connexion, panier vide → catalogue ; axe-core ; clavier

### Implementation for User Story 1

- [ ] T012 [US1] Compléter `src/domaine/catalogue/panier.ts` (`modifierLigne`, `supprimerLigne`, `appliquerCodePromo`, `utiliserBons`, `fusionnerPaniers`) et les actions de `src/actions/panier.ts` ; brancher la fusion sur la connexion dans `src/lib/auth.ts` (crochet après `/sign-in/email` et vérification à deux facteurs)
- [ ] T013 [US1] Remplacer `app/(public)/panier/page.tsx` et créer `src/ui/commande/` (`BlocPaiementUnique.tsx` avec le texte de la règle de cumul des remises, `BlocAbonnement.tsx`, `LignePanier.tsx` avec quantité et suppression sans rechargement, `CodePromo.tsx`) ; boutons « Commander » et « Demander un financement » ; compteur du panier dans l'en-tête

**Checkpoint** : le panier est complet.

---

## Phase 4: User Story 2 - Commander et payer par carte (Priority: P1)

**Goal** : tunnel en 5 étapes, paiement par carte, commande, facture, email.

**Independent Test** : avec un compte validé, payer par American Express de démonstration et retrouver commande, facture et email.

### Tests for User Story 2

- [ ] T014 [P] [US2] Écrire `tests/unit/commande/tunnel.test.ts` : `ouvrirCommande` crée ou reprend la commande du site (étape atteinte, saisies) ; accès refusé à un compte non validé ou suspendu (panier conservé), exception d'un compte en attente pour une mise à disposition et son kit (FR-007) ; adresse hors métropole refusée ; express proposé seulement si tous les articles sont en stock et avant l'heure limite ; CGV obligatoires ; cadeau de bienvenue ajouté à 0 € à la première commande d'un bénéficiaire
- [ ] T015 [P] [US2] Écrire `tests/unit/commande/effets.test.ts` : effet « paiement réussi » → commande créée dans Odoo avec la clé de la commande du site, cadeau confirmé, règles de fidélité appliquées, email, panier vidé, commande du site « payée » ; rejoué deux fois → une seule commande ; Odoo injoignable → « a_enregistrer », rejoué ensuite, alerte après 3 échecs
- [ ] T016 [P] [US2] Écrire `tests/e2e/f04/commande-carte.spec.ts` : adresses préremplies et modifiables, livraison (forfaits, délais, franco), carte American Express acceptée sur la page de démonstration, confirmation, email récapitulatif, commande et facture « FICTIVE » dans « Mon compte », stock décompté, cadeau à 0 € ; reprise du tunnel à l'étape quittée ; compte en attente refusé avec explication ; tunnel entier au clavier (SC-012) ; du panier à la confirmation en moins de 2 minutes (SC-004) ; axe-core à chaque étape

### Implementation for User Story 2

- [ ] T017 [US2] Créer `src/domaine/commande/tunnel.ts` (`ouvrirCommande`, `enregistrerAdresses`, `choisirLivraison`, `choisirPaiement`, `verifierAvantPaiement`) et `src/domaine/commande/paiement.ts` (`lancerPaiement` : réservation du stock dans Odoo (`stock.reserver`, clé `commande:tentative`) puis une seule session par tentative ; réservation libérée en cas de refus, d'abandon ou d'expiration, consommée par la commande)
- [ ] T018 [US2] Créer `src/domaine/commande/effets.ts` (effets `paiement_reussi` et `paiement_refuse` enregistrés auprès du gestionnaire de F11 au démarrage) et le rattrapage dans `src/file-attente/travailleurs.ts` (rejeu, alerte à l'administrateur)
- [ ] T019 [US2] Créer les pages `app/(public)/commande/adresses`, `livraison`, `paiement`, `recapitulatif`, `retour`, `confirmation/[ref]` avec `src/ui/commande/Etapes.tsx` (liste ordonnée, `aria-current="step"`) ; contrôle `peutCommander` à chaque étape
- [ ] T020 [US2] Créer `app/(public)/mon-compte/commandes/page.tsx`, `commandes/[ref]/page.tsx`, `factures/page.tsx` et la route `mon-compte/factures/[numero]/pdf/route.ts` (PDF lu dans Odoo, servi au seul titulaire) ; remplacer les pages « Bientôt disponible » de F02

**Checkpoint** : on commande et on paie par carte.

---

## Phase 5: User Story 3 - Ne perdre ni doubler aucune commande (Priority: P1)

**Goal** : refus, confirmations tardives ou répétées, double clic, rupture, panne : toujours une seule commande.

**Independent Test** : simuler chaque cas et compter les commandes.

### Tests for User Story 3

- [ ] T021 [P] [US3] Écrire `tests/e2e/f04/fiabilite.spec.ts` : paiement refusé (message, panier et saisies conservés, nouvelle tentative), authentification forte abandonnée (traitée comme un refus), confirmation répétée (une seule commande, une seule facture), confirmation tardive après fermeture de la page (commande créée, email, panier vidé), double clic sur « Payer » (une seule session), article passé indisponible avant le paiement (alerte, retour au panier), deux clients sur le dernier exemplaire au même moment (un seul paie, l'autre est alerté avant de payer, aucun paiement sans commande), Stripe en panne simulée (message, rien de débité, panier conservé), Odoo en panne au moment de la confirmation puis rétabli (commande rattrapée, alerte) — pannes rétablies **en attendant la confirmation**

### Implementation for User Story 3

- [ ] T022 [US3] Compléter `src/domaine/commande/paiement.ts` et `app/(public)/commande/retour/page.tsx` : état réel affiché (« paiement en cours de confirmation » tant que l'événement n'est pas arrivé, rafraîchi), refus avec motif et nouvelle tentative, sessions réutilisées sur rechargement ; vérification de stock et réservation juste avant le paiement, libération sur refus ou abandon

---

## Phase 6: User Story 4 - Payer par virement (Priority: P2)

**Goal** : commande en attente, RIB et référence, réception, rappel, annulation.

**Independent Test** : commander par virement, marquer le virement reçu, vérifier facture et stock.

### Tests for User Story 4

- [ ] T023 [P] [US4] Écrire `tests/unit/commande/virement.test.ts` : commande en attente créée dans Odoo avec réservation ; rappel envoyé une fois à J-2 ; annulation à l'échéance (stock libéré, email, cadeau rétabli) ; virement d'un montant différent → alerte, commande laissée en attente ; virement refusé pour un abonnement
- [ ] T024 [P] [US4] Écrire `tests/e2e/f04/virement.spec.ts` : choix du virement (achats seulement), confirmation et email avec RIB, montant TTC et référence ; « Virement reçu » depuis l'écran de démonstration → payée, facture, email

### Implementation for User Story 4

- [ ] T025 [US4] Créer `src/domaine/commande/virement.ts` (création avec `echeanceVirement`, rappel, annulation par l'opération « Annuler une commande en attente » dans les deux modes, écart de montant ; chaque action journalisée avec son auteur, FR-041) et la tâche quotidienne dans `src/file-attente/travailleurs.ts` ; RIB lu dans les paramètres ; ajouter « Virement reçu » à `app/(back-office)/admin/demonstration/paiements/` et les coordonnées bancaires et l'heure limite à `app/(back-office)/admin/contenus/coordonnees/`

---

## Phase 7: User Story 5 - Souscrire une mise à disposition mensuelle (Priority: P2)

**Goal** : abonnement par carte ou SEPA, panier mixte en deux paiements successifs (D1).

**Independent Test** : souscrire par carte puis par SEPA ; panier mixte avec échec du second paiement.

### Tests for User Story 5

- [ ] T026 [P] [US5] Écrire `tests/e2e/f04/mise-a-disposition.spec.ts` : choix carte ou SEPA pour les échéances, récapitulatif (1er mois, mois suivants, date de prélèvement, sans engagement), abonnement créé et matériel réservé, location dans « Mon compte », facture du 1er mois ; panier mixte : achat payé puis abonnement, échec du second → repris depuis « Mon compte › Commandes » sans repayer l'achat ; échéance simulée → facture et email ; panier mixte avec achat par virement : commande en attente créée puis abonnement payé aussitôt

### Implementation for User Story 5

- [ ] T027 [US5] Compléter `src/domaine/commande/paiement.ts` et `effets.ts` : session d'abonnement à la suite de l'achat, effet « paiement réussi » d'un abonnement (`location.creerAbonnement` par équipement, facture du 1er mois), effet `echeance_payee` (facture, email) ; reprise depuis « Mon compte » ; panier mixte avec achat par virement
- [ ] T028 [US5] Créer `app/(public)/mon-compte/locations/page.tsx` (mises à disposition souscrites, montants, prochaine échéance ; complété par F05)

---

## Phase 8: User Story 6 - Demander un financement longue durée (Priority: P2)

**Goal** : demande depuis une fiche ou le panier, suivi dans « Mon compte ».

**Independent Test** : envoyer deux demandes, faire évoluer le statut, constater l'affichage.

### Tests for User Story 6

- [ ] T029 [P] [US6] Écrire `tests/unit/financement/demande.test.ts` : demande enregistrée « reçue » avec équipements, durée du barème, cabinet et mensualité indicative (montant forcé du client compris) ; copie en opportunité (file d'attente si Odoo est injoignable) ; depuis le panier, les équipements concernés quittent le panier ; demande en double signalée ; visiteur refusé, compte en attente accepté
- [ ] T030 [P] [US6] Écrire `tests/e2e/f04/financement.spec.ts` : depuis une fiche et depuis le panier, préremplissage, durées, mention indicative, confirmation et email, statut dans « Mon compte » dès l'envoi (SC-010, moins de 3 minutes), aucun nom d'organisme dans les écrans et emails (SC-011) ; axe-core

### Implementation for User Story 6

- [ ] T031 [US6] Créer `src/domaine/financement/demande.ts`, `app/(public)/financement/demande/page.tsx` et `app/(public)/mon-compte/financements/page.tsx` ; brancher les boutons « Demander mon financement » de la fiche (F03) et du panier

---

## Phase 9: User Story 7 - Suivre sa commande et un remboursement (Priority: P2)

**Goal** : statuts, suivi du colis, remboursements et avoirs.

**Independent Test** : marquer expédiée puis rembourser depuis Odoo et depuis Stripe.

### Tests for User Story 7

- [ ] T032 [P] [US7] Écrire `tests/unit/commande/suivi.test.ts` : changement de statut → un seul email par changement ; remboursement décidé dans Odoo → `stripe.rembourser` (clé = remboursement) puis enregistrement et avoir ; événement « remboursement » de Stripe → enregistré dans Odoo une seule fois ; commande payée par virement → pas de remboursement Stripe ; annulation avant expédition → cadeau rétabli (F02)
- [ ] T033 [P] [US7] Écrire `tests/e2e/f04/suivi.spec.ts` : commande marquée expédiée (transporteur, suivi) → visible et email ; livrée ; remboursement total et partiel (depuis l'écran de démonstration et simulé depuis Stripe) → statut, avoir PDF avec les mentions, email

### Implementation for User Story 7

- [ ] T034 [US7] Créer `src/domaine/commande/suivi.ts` (`suivreCommandes` : changements, remboursements à exécuter ; effet `remboursement`) et la tâche toutes les 5 minutes dans `src/file-attente/travailleurs.ts` (D6), chaque remboursement exécuté ou enregistré journalisé (FR-041) ; ajouter « Marquer expédiée / livrée » et « Décider un remboursement » à l'écran de démonstration

---

## Phase 10: User Story 8 - Traiter les demandes de financement et suivre les commandes (Priority: P3)

**Goal** : back-office des demandes de financement ; commandes en lecture seule.

**Independent Test** : changer le statut d'une demande, créer la commande financée ; consulter les commandes.

### Tests for User Story 8

- [ ] T035 [P] [US8] Écrire `tests/e2e/f04/back-office-financement.spec.ts` : liste par statut, fiche, statut « en étude » puis « accordée » (email au client, visible dans « Mon compte »), note interne jamais visible du client, journal, « Créer la commande financée » (commande sans montant à payer dans « Mon compte », stock décompté) ; commandes en lecture seule, anomalies « à enregistrer » visibles ; support sans accès aux financements ; axe-core

### Implementation for User Story 8

- [ ] T036 [US8] Créer `src/domaine/financement/administration.ts` (statut, notes, journal, emails, `creerCommandeFinancee`), `app/(back-office)/admin/financements/` (liste et fiche) et `app/(back-office)/admin/commandes/page.tsx` (lecture seule) ; liens dans la navigation du back-office

---

## Phase 11: Polish & Cross-Cutting Concerns

- [ ] T037 [P] Ajouter les pages de F04 (panier, étapes du tunnel avec un panier préparé, « Mon compte › Commandes, Factures, Locations, Financements », demande de financement, back-office) à `tests/e2e/no-egress.spec.ts`, `tests/e2e/accessibilite-charte.spec.ts` et au contrôle des largeurs ; vérifier l'absence de toute donnée de carte dans les tables et journaux du site (SC-008)
- [ ] T038 [P] Mettre à jour `docs/demonstration.md` (commander, payer, virement, remboursement, financement) et `tests/e2e/parcours/README.md` (parcours d'achat ✅, demandes ✅)
- [ ] T039 Dérouler [quickstart.md](quickstart.md) et corriger les écarts
- [ ] T040 Vérifier la conformité finale : `npm run typecheck`, `npm run lint`, `npm run check:contrast`, `npm test`, `npm run test:e2e` (ordinateur et mobile), `npm run test:lighthouse` en local, puis en intégration continue

---

## Dependencies & Execution Order

- **Setup** puis **Foundational** : bloquent tout (devis et contrat d'Odoo).
- **US1** (panier) : MVP ; **US2** (carte) après US1 ; **US3** (fiabilité) après US2.
- **US4** (virement) et **US5** (mise à disposition) après US2 ; **US6** (financement) après US1 ; **US7** (suivi) après US2 ; **US8** après US6.
- **Polish** en dernier.

```text
Setup → Foundational ─ US1 ─┬─ US2 ─┬─ US3
                            │       ├─ US4
                            │       ├─ US5
                            │       └─ US7
                            └─ US6 ── US8
                                         → Polish
```

## Parallel Example: Foundational

```text
T003 tests de contrat · T008 devis
```

## Parallel Example: après US2

```text
US3 (T021–T022) · US4 (T023–T025) · US5 (T026–T028) · US7 (T032–T034)
```

## Implementation Strategy

1. Phases 1 et 2.
2. **MVP** : US1, US2 puis US3 — panier, paiement par carte, fiabilité ; valider SC-002
   (démonstration), SC-004, SC-007, SC-009, SC-013, SC-014.
3. US4, US5, US6, US7 (P2), puis US8 (P3).
4. Polish.

**Remarque** : l'abonnement au logiciel Cloud (FR-049) est livré avec F12 (décision D3, noté
dans la spec de F12) ;
le cycle de vie de la mise à disposition (offre, retours, impayés) relève de F05.
