---
description: "Liste des tâches — F05 Mise à disposition (MAD) Express sans engagement"
---

# Tasks: F05 — Mise à disposition (MAD) Express sans engagement

**Input**: documents de conception de `specs/005-mise-a-disposition-express/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md) ;
socles de F11 à F04 livrés ; décisions D1 à D10 validées le 2026-10-19.

**Tests** : exigés par la constitution (principe X) et par les critères SC-001 à SC-011 ;
écrits **avant** l'implémentation qu'ils vérifient.

**Organisation** : par user story, chacune réalisable et vérifiable seule.

## Format : `[ID] [P?] [Story] Description`

- **[P]** : réalisable en parallèle (fichiers différents, sans dépendance non terminée)
- **[Story]** : US1 à US8

## Conventions communes

Celles de F11 à F04 : TypeScript strict ; français au vouvoiement ; tokens de la charte ;
aucun accès à Odoo, Stripe ou PCA hors du registre ; montants en centimes, HT en premier puis
TTC ; aucune règle de facturation, de délai de retour ou de pénalité calculée par le site
(règles d'Odoo, FR-040) ; heures en Europe/Paris ; chaque action inscrite au journal
(FR-041) ; aucun champ de patient (FR-043) ; composants clients sans import de module
serveur ; un test qui modifie un état partagé (parc, stock, paramètre, panne) le rétablit et
attend la confirmation ; les tests e2e rendent au parc les appareils loués par les comptes de
test ; chaque page nouvelle ajoutée à `tests/e2e/no-egress.spec.ts`,
`tests/e2e/accessibilite-charte.spec.ts` et au contrôle des largeurs.

---

## Phase 1: Setup

- [X] T001 Ajouter les paramètres de F05 à `prisma/site/seed/contenus-initiaux.ts` (créés s'ils manquent) : `livraison.jours_non_livres` = `[]`, `livraison.zones_sans_lendemain` = `["20"]` et `livraison.delai_zones_jours` = `2` (D3), `location.rappel_echeance_jours` = `3` et `location.rappel_retour_jours` = `2` (D6) ; ajouter leurs clés à `src/lib/parametres.ts`

---

## Phase 2: Foundational (prérequis bloquants)

**⚠️ CRITICAL** : aucune user story ne commence avant la fin de cette phase.

### Base fictive d'Odoo et contrat

- [X] T002 Compléter `prisma/demo/schema.prisma` selon [data-model.md](data-model.md) §1 (migration `scripts/nouvelle-migration.sh demo f05_locations`) : `EtatAbonnement` = `commandee`, `en_cours`, `resiliation_prevue`, `en_retard_retour`, `suspendue_impaye`, `terminee`, `annulee` (reprise des anciens `termine`) ; `Abonnement` + `dateLivraison`, `dateLimiteRetour`, `commandeId`, `expeditionBloquee`, `transporteur`, `suivi`, `impayeDepuis`, `tentativesPrelevement`, `rappelsRetour`, `etatRetour`, `montantDegradationCentimes`, `modifieLe` ; `NumeroSerie.historique` ; `OffreMiseADisposition` + `logiciel`, `contenuPack` (A4) ; modèles `ReservationAppareil` (`stock_lot_reservation`, clé unique, état `active` / `consommee` / `liberee`), `KitPossede` (`res_partner_kit`, unique partenaire + kit, origine `achat` / `enregistrement`) et `ReglesLocation` (`rental_settings` : 3 tentatives, espacement 3 jours, régularisation 10 jours, retour 5 jours ouvrés, tolérance 5 jours, non-retour 30 jours — D7) ; jeu de départ cohérent (locations existantes `en_cours`, une `resiliation_prevue`)
- [X] T003 Reporter dans [../011-connecteurs-base-demonstration/contracts/odoo.md](../011-connecteurs-base-demonstration/contracts/odoo.md) et [stripe](../011-connecteurs-base-demonstration/contracts/) les opérations de [contracts/connecteurs.md](contracts/connecteurs.md)
- [X] T004 [P] Écrire `tests/contract/odoo/location.test.ts` : première date du parc (appareil disponible → date demandée ; aucun → date du premier retour prévu ; maintenance et appareils réservés exclus) ; réservation d'appareil (idempotente, libérée, consommée par la création de l'abonnement) ; **deux réservations simultanées sur le dernier appareil → une seule réussit, l'autre `OutOfStock`** (SC-005) ; création avec date de livraison, idempotence ; résiliation (fin au terme du mois payé, mois entamé dû si l'échéance est passée, date limite en jours ouvrés) ; annulation de résiliation refusée après la fin ; changements listés depuis une date ; kits possédés (achat payé, enregistrement, kit remboursé exclu) ; étiquette PDF ; annulation d'une location commandée (montants à rembourser) ; actions planifiées (échéance, impayé au terme, retard, tolérance, non-retour)
- [X] T005 Mettre à jour `src/connecteurs/odoo/interfaces/location.ts` et `stock.ts`, et implémenter dans `src/connecteurs/odoo/demo/location.ts` et `stock.ts` : `premiereDateParc`, `reserverAppareil` (mise à jour conditionnelle du lot), `libererAppareil`, `creerAbonnement` complété (consomme la réservation), `resilier`, `annulerResiliation`, `listerLocations` complété (n° de série seulement après expédition — D5), `listerChangements`, `etiquetteRetour` (PDF « FICTIF »), `debloquerExpedition`, `annulerCommande`, `kitsPossedes` ; le kit acheté dans une commande payée crée la possession (`origine` = `achat`) et un avoir de kit la retire ; reprendre le renommage `termine` → `terminee` partout où il est lu : `src/domaine/comptes/rgpd.ts` (suppression refusée pendant une location), `src/domaine/commande/mon-compte.ts`, `src/domaine/commande/tunnel.ts`, `tests/e2e/f04/outils.ts` (`rendreParcDesTests`) (A5)
- [X] T006 Implémenter les opérations réservées à la démonstration dans `src/connecteurs/odoo/demo/administration.ts` : `preparerExpedition` (appareil au choix, transporteur, suivi), `signalerAppareilDefectueux` (autre appareil affecté s'il y en a un, sinon location en attente du choix du client), `colisNonLivre`, `marquerLivree` (début = date effective, échéances recalées), `enregistrerRetour` (état `complet` / `degrade` / `perdu`, montant, appareil `en_retour` puis `disponible` ou `en_maintenance`, facture de dégradation), `enregistrerKit`, `echouerPrelevement`, `regulariser`, `executerActionsPlanifiees(date)` (échéances atteintes, nouvelles tentatives, suspension au terme, passage en retard de retour, facture du mois suivant après tolérance, valeur de remplacement après non-retour) ; ajouter les règles de location à **Démonstration → Paramètres commerciaux**
- [X] T007 [P] Écrire les tests de contrat Stripe dans `tests/contract/stripe/` et implémenter dans `src/connecteurs/stripe/interfaces/index.ts` et `demo/` : `ouvrirSessionAbonnement` avec **un élément par location** (A3) ; `retirerElementAbonnement` (prélèvements mensuels de l'élément arrêtés à la date d'effet, **autorisation conservée** — FR-030, idempotent) ; `preleverPonctuel` (montant prélevé sur l'autorisation, événement de résultat, refus si autorisation libérée, idempotent par facture) ; `libererAutorisation` (A2)

### Base du site et calendrier

- [X] T008 Compléter `prisma/site/schema.prisma` (migration `scripts/nouvelle-migration.sh site f05_locations`) : `CommandeSite.datesLivraisonMad` (JSON), `CommandeSite.conditionsLocationAccepteesLe` ; modèle `SuiviLocation` (référence d'abonnement unique, dernier état, rappels de retour notifiés, échéance rappelée le, référence du droit Cloud, notifié le) ; réinitialisation de la démonstration : suivis des locations
- [X] T009 [P] Écrire `tests/unit/location/calendrier.test.ts` : avant l'heure limite un jour ouvré → lendemain ; une seconde après → surlendemain ouvré ; vendredi après l'heure limite → mardi ; samedi et dimanche ; jours fériés (1er mai, Ascension, lundi de Pâques calculés) ; jours non livrés du back-office ; code postal en 20 → +2 jours ouvrés, jamais le lendemain ; première date du parc postérieure ; liste des jours proposés (ouvrés, 15 jours) ; heure de Paris en hiver et en été
- [X] T010 Créer `src/domaine/location/calendrier.ts` (fonctions pures : jours fériés, jours ouvrés, première date de livraison, dates proposées) et `src/domaine/location/offre.ts` (offres de mise à disposition lues dans Odoo, première date par équipement, cache d'une minute au plus — SC-006)

**Checkpoint** : socle prêt — les user stories peuvent commencer.

---

## Phase 3: User Story 1 — Se faire dépanner du jour au lendemain (P1) 🎯 MVP

**Goal** : un médecin choisit une mise à disposition, la date (lendemain si possible), paie
le premier mois ; un appareil est réservé ; à l'expédition, n° de série, accès Cloud et
alerte formation.

**Independent Test** : un jour ouvré avant l'heure limite, commander un appareil disponible,
vérifier la date proposée, le paiement, la réservation, la confirmation, puis l'expédition.

- [X] T011 [P] [US1] Écrire `tests/unit/location/commande.test.ts` : la date choisie est enregistrée et transmise à Odoo ; date non proposable refusée ; appareil réservé **avant** l'ouverture du paiement ; dernier appareil pris entre-temps → `OutOfStock` avant tout paiement, retour au choix de date avec la date suivante, rien n'est débité (A1) ; paiement refusé ou abandonné → réservation libérée ; paiement réussi → réservation consommée par l'abonnement ; abonnement de paiement ouvert avec un élément par location ; location créée « commandée » avec la date de livraison ; prochaine échéance = date de livraison + 1 mois
- [X] T012 [P] [US1] Écrire `tests/e2e/f05/depannage.spec.ts` : page « Dépannage express » (équipements, prix HT puis TTC, date la plus proche, heure limite) ; choix → fiche ou panier ; étape « Livraison » : lendemain proposé (heure limite placée après l'heure du test), autre jour ouvré choisi ; récapitulatif (pack, premier mois, mois suivants, date, prochaine échéance, valeur de remplacement, conditions à accepter) ; paiement SEPA ; location « commandée » dans « Mon compte » ; heure limite placée avant l'heure du test → lendemain absent ; parc en maintenance → première date réelle, pas de lendemain ; axe-core ; moins de 3 minutes (SC-004)
- [X] T013 [US1] Créer la page `app/(public)/mise-a-disposition/page.tsx` « Dépannage express » (remplace la page de contact provisoire ; contenu du pack et mention « frais d'envoi et de retour inclus dans le premier mois » — A9) et compléter l'onglet « Mise à disposition » des fiches (`src/ui/catalogue/SelecteurFormule.tsx`) : date la plus proche, valeur de remplacement
- [X] T014 [US1] Compléter le tunnel de F04 (`src/domaine/commande/tunnel.ts`, `app/(public)/commande/livraison`, `recapitulatif`) : choix de la date par mise à disposition (`datesLivraisonMad`), revérification de la date avant le paiement, conditions de location à accepter (`conditionsLocationAccepteesLe`, texte provisoire en paramètre — D9) ; réserver l'appareil (`stock.reserverAppareil`) avant d'ouvrir le paiement dans `src/domaine/commande/paiement.ts`, la libérer au refus et à l'abandon (`effets.ts`, rattrapage), ouvrir l'abonnement de paiement avec un élément par location ; transmettre la date et la réservation à `location.creerAbonnement` dans `src/domaine/commande/effets.ts` ; récapitulatif : contenu du pack et frais d'envoi et de retour inclus (A9)
- [X] T015 [P] [US1] Écrire `tests/unit/location/suivi.test.ts` (partie expédition) : changement « expédiée » → email avec suivi, contact pour la formation et lien WhatsApp ; droit ouvert par PCA ; alerte « formation à organiser » ; une seule fois même relevé deux fois ; PCA injoignable → expédition non bloquée, alerte et rattrapage ; « livrée » → location « en cours » ; colis non livré → location toujours « commandée », alerte équipe ; appareil défectueux sans remplaçant → email au client (reporter ou annuler sans frais) ; le droit ouvert est celui du `logiciel` de l'offre (A4, A6)
- [X] T016 [US1] Créer `src/domaine/location/suivi.ts` (`suivreLocations` : relève `location.listerChangements`, `SuiviLocation`, emails, PCA, alertes, journal) et la tâche toutes les 5 minutes dans `src/file-attente/travailleurs.ts` ; créer `src/emails/modeles-locations.tsx` (modèles de [contracts/connecteurs.md](contracts/connecteurs.md))
- [X] T017 [US1] Créer l'écran `app/(back-office)/admin/demonstration/locations/` (administrateur, démonstration) : préparer et expédier (appareil, transporteur, suivi), marquer livrée ; le suivi passe aussitôt après chaque action

**Checkpoint** : dépannage commandé, payé, expédié et suivi.

---

## Phase 4: User Story 2 — Louer sans être encore client (P1)

**Goal** : créer son compte dans le parcours sans perdre ses choix ; expédition après
validation ; refus → annulation et remboursement intégral.

**Independent Test** : sans compte, lancer une mise à disposition, créer le compte, payer ;
valider (ou refuser) le compte et vérifier la suite.

- [X] T018 [P] [US2] Écrire `tests/unit/location/compte-en-attente.test.ts` : location payée par un compte en attente → `expeditionBloquee`, alerte « validation prioritaire » ; validation avant l'heure limite de la veille → date maintenue, expédition débloquée ; validation après → date recalculée, email ; refus → location et commande annulées, premier mois et kit remboursés par Stripe, email, appareil rendu au parc ; journal
- [X] T019 [P] [US2] Écrire `tests/e2e/f05/sans-compte.spec.ts` : visiteur → panier → « Commander » → inscription → confirmation de l'email → reprise du tunnel avec appareil, date et kit ; message « expédition après vérification » avant de payer ; paiement ; validation au back-office → email ; second visiteur refusé → remboursement visible ; moins de 8 minutes (SC-004)
- [X] T020 [US2] Compléter le parcours : retour vers le tunnel après inscription, connexion et confirmation de l'email (`app/(public)/inscription`, `connexion`, `src/domaine/comptes/inscription.ts`) ; message du récapitulatif pour un compte en attente (FR-044) ; `expeditionBloquee` transmis à Odoo
- [X] T021 [US2] Créer `src/domaine/location/validation.ts` et le brancher sur les décisions de F02 (`src/domaine/comptes/validation.ts`) : validation → `location.debloquerExpedition` et recalcul de date ; refus → `location.annulerCommande`, `stripe.rembourser`, emails, journal (FR-045) ; alerte prioritaire au paiement

**Checkpoint** : un médecin sans compte se fait dépanner.

---

## Phase 5: User Story 3 — Suivre et gérer sa location (P1)

**Goal** : « Mon compte › Locations » présente chaque location et ses actions ; historique.

**Independent Test** : avec une location en cours, vérifier les informations et chaque
bouton.

- [X] T022 [P] [US3] Écrire `tests/e2e/f05/mon-compte.spec.ts` : location en cours (appareil, n° de série, début, prochaine échéance HT et TTC) ; plusieurs locations gérées séparément ; actions selon l'état (résilier ; prolonger seulement si résiliation prévue et fin non atteinte ; étiquette après résiliation) ; location commandée (date de livraison, pas de n° de série) ; historique des locations terminées avec dates et factures ; axe-core
- [X] T023 [US3] Réécrire `app/(public)/mon-compte/locations/page.tsx` (en cours, commandées, historique) et créer `src/domaine/location/gestion.ts` (`locationsDuCompte`, actions autorisées selon l'état, factures liées)

---

## Phase 6: User Story 4 — Résilier et retourner l'appareil (P1)

**Goal** : résiliation en deux clics, prélèvement arrêté, accès Cloud fermé à la date de fin,
instructions et étiquette ; retour enregistré → location terminée.

**Independent Test** : résilier, vérifier l'absence de prélèvement suivant et la fermeture
programmée, puis enregistrer le retour.

- [X] T024 [P] [US4] Écrire `tests/unit/location/resiliation.test.ts` : résiliation avant l'échéance → fin au terme du mois payé, `stripe.retirerElementAbonnement` à la date de fin, fermeture PCA programmée, email avec date limite et étiquette, journal ; le jour de l'échéance ou après → mois entamé dû ; « Prolonger » → résiliation annulée, élément rétabli, email ; « Prolonger » après la fin refusé ; résiliation d'une location commandée non expédiée → annulation et remboursement ; appareil défectueux : choix « reporter » (nouvelle date) ou « annuler » (remboursement intégral) depuis « Mon compte » (A6) ; autorisation de prélèvement conservée après la fin, puis libérée après le retour et le règlement des sommes dues (FR-030) ; deux locations dans un même abonnement de paiement → seule la résiliée s'arrête ; retour enregistré → email (et dégradation avec montant)
- [X] T025 [P] [US4] Écrire `tests/e2e/f05/resiliation.spec.ts` : résilier depuis « Mon compte » en moins de 2 minutes (SC-007) ; écran de confirmation ; étiquette PDF téléchargée et redemandée ; prolonger ; retour enregistré au démonstrateur → location terminée, email ; retour avec dégradation → montant indiqué
- [X] T026 [US4] Compléter `src/domaine/location/gestion.ts` (`resilier`, `prolonger`, `etiquette`) et créer `app/(public)/mon-compte/locations/[ref]/resilier/page.tsx` et `[ref]/etiquette/route.ts` (réservés au titulaire) ; compléter `suivi.ts` (retour reçu, fermeture d'accès) et l'écran de démonstration (enregistrer un retour)

**Checkpoint** : MVP « sans engagement » complet (US1 à US4).

---

## Phase 7: User Story 5 — Ne payer le kit qu'une fois (P2)

**Goal** : kit ajouté d'office s'il manque, jamais deux fois ; rachat volontaire possible.

**Independent Test** : deux locations du même type → kit facturé une fois ; autre type → son
kit demandé.

- [X] T027 [P] [US5] Écrire `tests/unit/location/kit.test.ts` : kit absent → ajouté d'office au panier, marqué obligatoire, non supprimable tant que la location y est ; kit possédé (achat ou enregistrement) → ni ajouté ni facturé, message ; deux locations du même type dans le même panier → un seul kit ; autre type → son kit ; kit remboursé → de nouveau demandé ; rachat volontaire accepté ; revérification au récapitulatif (SC-003)
- [X] T028 [P] [US5] Écrire `tests/e2e/f05/kit.spec.ts` : première location (kit au panier et sur la facture), seconde location du même type (pas de kit, message), autre type (kit demandé) ; kit enregistré au démonstrateur → plus demandé
- [X] T029 [US5] Créer `src/domaine/location/kit.ts` et le brancher sur l'ajout au panier (`src/domaine/catalogue/panier.ts`), la suppression de ligne, le panier (`src/ui/commande/LignePanier.tsx` : mention « obligatoire, vous le conservez » — D4) et le récapitulatif ; fiche : « déjà en votre possession » ; démonstrateur : enregistrer un kit

---

## Phase 8: User Story 6 — Poursuivre mois après mois (P2)

**Goal** : échéances prélevées et facturées, rappels, impayés, retards, relocation au tarif
du premier mois.

**Independent Test** : avancer la date ; simuler un prélèvement échoué, puis un retour en
retard.

- [X] T030 [P] [US6] Écrire `tests/unit/location/rappels.test.ts` : rappel 3 jours avant l'échéance, une fois (D6) ; échéance payée → facture et email (F04) ; prélèvement échoué → email « régulariser », nouvelles tentatives d'Odoo ; impayé au terme → accès suspendu (PCA), retour demandé, alerte équipe ; régularisation → accès rétabli ; retard de retour → rappels tous les 2 jours, prévenance avant la facturation du mois suivant (SC-010) ; valeur de remplacement facturée après non-retour, prévenu avant ; **chaque montant facturé par Odoo après la fin (mois de retard, dégradation, valeur de remplacement) prélevé par `stripe.preleverPonctuel`, une seule fois par facture** (A2) ; appareil rendu après facturation de la valeur de remplacement → avoir possible par l'équipe (A7) ; relocation après retour → tarif du premier mois
- [X] T031 [P] [US6] Écrire `tests/e2e/f05/echeances.spec.ts` : au démonstrateur « avancer la date » → rappel puis échéance facturée dans « Mon compte » (SC-009) ; prélèvement échoué → email, état « impayé » ; au terme → suspension ; résiliation sans retour → rappels puis facture du mois suivant
- [X] T032 [US6] Créer `src/domaine/location/rappels.ts` (tâche quotidienne : rappels d'échéance et de retour ; en démonstration, `executerActionsPlanifiees` du jour) ; compléter `suivi.ts` (impayé, suspension, régularisation, retard, facturations d'Odoo) et l'effet `echeance_refusee` ; démonstrateur : prélèvement échoué, régulariser, avancer la date

---

## Phase 9: User Story 7 — Passer à l'achat ou au financement (P2)

- [X] T033 [P] [US7] Écrire `tests/e2e/f05/achat-financement.spec.ts` : « Passer à l'achat » → appareil neuf au panier au prix du catalogue, message « votre location continue jusqu'à sa résiliation » ; « Passer au financement » → demande de F04 préremplie ; achat livré → invitation à résilier la location correspondante (FR-033)
- [X] T034 [US7] Ajouter les actions dans `src/domaine/location/gestion.ts` et `mon-compte/locations` ; à la livraison d'une commande contenant le même modèle qu'une location en cours, inviter à résilier (`src/domaine/commande/suivi.ts`)

---

## Phase 10: User Story 8 — Suivre le parc de location (P2)

- [X] T035 [P] [US8] Écrire `tests/e2e/f05/parc.spec.ts` : appareil ajouté ou remis disponible au démonstrateur → proposé en moins d'une minute (SC-006) ; passé en maintenance ou loué → plus proposé ; réglages au back-office (heure limite, jours non livrés, zones) appliqués aux nouvelles commandes ; `/admin/locations` en lecture seule (commandées dont expédition bloquée, en cours, impayés, retards) pour l'équipe, sans bouton d'action ; axe-core
- [X] T036 [US8] Créer `app/(back-office)/admin/locations/page.tsx` (lecture seule, lien dans la navigation) ; ajouter la section « Livraison et mise à disposition » à `app/(back-office)/admin/contenus/coordonnees` (heure limite, jours non livrés, zones, délai, rappels) avec validation des saisies ; démonstrateur : ajouter un appareil, passer en maintenance, remettre disponible

---

## Phase 11: Polish & Cross-Cutting Concerns

- [X] T037 [P] Ajouter les pages de F05 aux contrôles transverses (`no-egress`, `accessibilite-charte`, largeurs de 320 à 1 920 px) ; vérifier qu'aucun champ ne demande une donnée de patient
- [X] T038 [P] Mettre à jour `docs/demonstration.md` (dépannage, sans compte, kit, expédition, résiliation, retour, échéances, impayé, retard) et `tests/e2e/parcours/README.md` (parcours de mise à disposition ✅) ; mettre à jour les tests de F03 et F04 touchés (fiche, panier mixte, `rendreParcDesTests` selon les nouveaux états)
- [X] T039 Dérouler [quickstart.md](quickstart.md) et corriger les écarts
- [X] T040 Vérifier la conformité finale : `npm run typecheck`, `npm run lint`, `npm run check:contrast`, `npm test`, `npm run test:e2e` (ordinateur et mobile), `npm run test:lighthouse` en local, puis en intégration continue

---

## Dependencies & Execution Order

- **Setup (T001)** → **Foundational (T002–T010)** → user stories.
- **US1** d'abord (MVP) ; **US2, US3, US4** ensuite (P1) ; US4 dépend de US3 (écran
  « Mon compte »). **US5 à US8** (P2) indépendantes entre elles après US1.
- Dans chaque story : tests → domaine → écrans → démonstrateur.

## Parallel Opportunities

- T004 et T007 (contrats) en parallèle après T002 ; T009 en parallèle de T004.
- Dans chaque story, les tests marqués [P] s'écrivent ensemble.
- US5, US7 et US8 peuvent avancer en parallèle après US1.

## Implementation Strategy

1. Socle (T001–T010), puis **US1** : dépannage commandé, payé, expédié → démontrable.
2. **US2 à US4** : sans compte, gestion, résiliation et retour → promesse « sans engagement ».
3. **US5 à US8**, puis finitions et contrôles (T037–T040).
