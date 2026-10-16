---
description: "Liste des tâches — F02 Comptes professionnels, inscription et newsletter"
---

# Tasks: F02 — Comptes professionnels, inscription et newsletter

**Input**: documents de conception de `specs/002-comptes-professionnels/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md) ;
socles de F11 et F01 livrés.

**Tests** : exigés par la constitution (principe X) et par les critères SC-001 à SC-012 ;
écrits **avant** l'implémentation qu'ils vérifient.

**Organisation** : par user story, chacune réalisable et vérifiable seule.

## Format : `[ID] [P?] [Story] Description`

- **[P]** : réalisable en parallèle (fichiers différents, sans dépendance non terminée)
- **[Story]** : US1 à US6

## Conventions communes

Celles de F11 et F01 : TypeScript strict ; français au vouvoiement ; tokens de la charte
uniquement ; aucun accès à Odoo ni à l'emailing hors du registre ; erreurs reliées aux champs,
saisie conservée (FR-043) ; cibles de 44 px ; aucun message ne révèle l'existence d'un compte
(SC-012) ; chaque page nouvelle ajoutée à `tests/e2e/no-egress.spec.ts` et
`tests/e2e/accessibilite-charte.spec.ts`.

---

## Phase 1: Setup

- [ ] T001 Ajouter les paramètres de F02 à `prisma/site/seed/contenus-initiaux.ts` (créés s'ils manquent) : `comptes.validation_auto` = `false`, `bienvenue.active` = `true`, `comptes.specialites` = Cardiologie, Médecine générale, Médecine du sport, Pneumologie, Médecine vasculaire, Autre (D3) ; le texte de l'offre reste `accueil.offre_bienvenue` (F01)

---

## Phase 2: Foundational (prérequis bloquants)

**⚠️ CRITICAL** : aucune user story ne commence avant la fin de cette phase.

### Base du site

- [ ] T002 Compléter `prisma/site/schema.prisma` selon [data-model.md](data-model.md) : statut `supprime` de `CompteClient`, retrait de l'unicité du SIRET (RPPS toujours unique), `inscritLe` et `valideLe` ; `Utilisateur.bloqueJusqua` ; modèles `DecisionCompte` (`validation`, `refus`, `suspension`, `retablissement`, motif, auteur facultatif, date), `AttributionCadeau` (numéro **unique**, compte, état `droit_ouvert` / `en_attente_stock` / `remis`, dates, `commandeRef`), `DemandeChangementNumero` (ancien, nouveau, état `en_attente` / `acceptee` / `refusee`, motif, traitée par, dates), `EchecConnexion` (empreinte de l'email, premier échec, compte), `DemandeRgpd` (`export` / `suppression`, état `recue` / `traitee` / `refusee`, motif, dates) ; migration par `scripts/nouvelle-migration.sh site f02_comptes`
- [ ] T003 Ajouter au périmètre de la réinitialisation (`src/connecteurs/demonstration.ts`, `prisma/site/seed/comptes-demo.ts`) les décisions, attributions, demandes de changement, échecs et demandes RGPD des comptes de séance ; recréer pour le compte « client avec droits » un consentement newsletter et une attribution `remis` (cadeau déjà reçu), pour le « client sans droits » une attribution `droit_ouvert`

### Connecteur Odoo : deux opérations ajoutées au contrat

- [ ] T004 Ajouter `fidelite.lireOffreBienvenue` et `clients.archiverPartenaire` au contrat dans [../011-connecteurs-base-demonstration/contracts/odoo.md](../011-connecteurs-base-demonstration/contracts/odoo.md) selon [data-model.md](data-model.md) §3
- [ ] T005 [P] Écrire les tests de contrat dans `tests/contract/odoo/fidelite.test.ts` (offre de bienvenue : article `EC-BIENVENUE-TENSIOMETRE` et disponibilité) et `tests/contract/odoo/clients.test.ts` (archivage : partenaire archivé, factures toujours lisibles ; `NotFound` pour un inconnu ; idempotent)
- [ ] T006 Déclarer les deux opérations dans `src/connecteurs/odoo/interfaces/fidelite.ts` et `clients.ts` ; ajouter le champ `archive` au partenaire dans `prisma/demo/schema.prisma` (migration `demo f02_archivage`) et un programme de fidélité de type « cadeau de bienvenue » (`Promotion` de type `bienvenue`, cible `EC-BIENVENUE-TENSIOMETRE`) au jeu de départ `prisma/demo/seed/historiques.ts` ; implémenter dans `src/connecteurs/odoo/demo/fidelite.ts` et `clients.ts`

### Domaine « comptes » : règles de base

- [ ] T007 [P] Écrire `tests/unit/comptes/numeros.test.ts` : RPPS de 11 chiffres (espaces ignorés), SIRET de 14 chiffres à clé de Luhn valide, exception de La Poste (SIREN 356000000), refus des formats faux
- [ ] T008 [P] Écrire `tests/unit/comptes/adresses.test.ts` : codes postaux de France métropolitaine acceptés (dont Corse 20xxx), outre-mer (97x, 98x) et formats faux refusés
- [ ] T009 [P] Écrire `tests/unit/comptes/statuts.test.ts` : transitions autorisées et refusées ([data-model.md](data-model.md) §1) ; `peutCommander` (SC-001) : seul `valide`, exception mise à disposition express pour `en_attente`, message propre à chaque statut
- [ ] T010 [P] Créer `src/domaine/comptes/numeros.ts`, `src/domaine/comptes/adresses.ts` et `src/domaine/comptes/statuts.ts` (machine à états, `peutCommander`) selon [contracts/domaine.md](contracts/domaine.md)
- [ ] T011 Créer `src/domaine/comptes/securite.ts` : journal de sécurité (actions `securite.*` du journal des actions) et notification d'un événement sensible par email ; et `src/emails/modeles-comptes.tsx` avec tous les modèles de [contracts/emails.md](contracts/emails.md)

### Mise en page

- [ ] T012 Déplacer `app/connexion/` dans `app/(public)/connexion/` (mise en page publique) en conservant la double authentification ; rediriger vers `?retour=` (chemin interne uniquement) ou `/mon-compte` ; mettre à jour les liens et les tests de F11 qui la visent
- [ ] T013 Faire pointer « Mon compte / Connexion » de l'en-tête (`src/ui/en-tete/EnTete.tsx`) vers `/mon-compte` quand le visiteur est connecté, `/connexion` sinon ; et le bouton de l'offre de bienvenue (F01) vers `/inscription`

**Checkpoint** : socle de F02 prêt.

---

## Phase 3: User Story 1 — Créer son compte professionnel (Priority: P1) 🎯 MVP

**Goal** : inscription, confirmation de l'email, compte « en attente de validation ».

**Independent Test** : créer un compte, confirmer l'email, se connecter, constater le statut et
le blocage de la commande.

### Tests

- [ ] T014 [P] [US1] Écrire `tests/unit/comptes/inscription.test.ts` : création atomique (utilisateur, compte, adresses, consentements CGU/CGV et newsletter avec date, origine `inscription` et texte présenté, SC-003) ; refus d'un RPPS ou d'un email déjà utilisés avec **le même message** (SC-012) ; 2 inscriptions simultanées avec le même RPPS → une seule aboutit ; RPPS d'un compte refusé → signalement à l'équipe ; confirmation → `en_attente` ; purge des comptes non confirmés après 30 jours
- [ ] T015 [P] [US1] Écrire `tests/e2e/f02/inscription.spec.ts` : case newsletter décochée, CGU/CGV distinctes et obligatoires, règles du mot de passe annoncées en direct, RPPS mal formé et livraison en outre-mer refusés sur le champ avec saisie conservée, adresses recopiées depuis le cabinet, inscription réussie, email de confirmation dans la boîte de démonstration, connexion refusée avant confirmation, lien confirmé → « en attente de validation », renvoi de l'email, lien expiré ; axe-core ; parcours au clavier seul (SC-011)

### Implémentation

- [ ] T016 [US1] Configurer Better Auth dans `src/lib/auth.ts` : `requireEmailVerification` pour les clients, `sendOnSignUp`, lien de confirmation valable 24 heures, longueur minimale de 12 caractères, champs supplémentaires (civilité, spécialité, téléphone) ; rappel après confirmation de l'email qui appelle `confirmerEmail` du domaine
- [ ] T017 [US1] Créer `src/domaine/comptes/motdepasse.ts` : règles de la CNIL (12 caractères, majuscule, minuscule, chiffre, caractère spécial, D1) partagées par le navigateur et le serveur
- [ ] T018 [US1] Créer `src/domaine/comptes/inscription.ts` : `inscrire` (transaction : utilisateur Better Auth, compte `email_a_confirmer`, adresses, consentements ; contrôle des numéros, des adresses et de l'unicité ; message neutre en cas de doublon ; signalement d'une réinscription refusée ; rattachement d'une inscription newsletter de F01 existante), `confirmerEmail` (→ `en_attente`, ou validation automatique selon `comptes.validation_auto` ; notification d'équipe « nouveau compte à valider » ; si la newsletter a été cochée, l'abonnement est confirmé par la vérification de l'email et transmis à l'outil d'emailing par `emailing.mettreAJourContact` (FR-028), et le droit au cadeau est ouvert si les conditions sont réunies), `purgerNonConfirmes` (tâche quotidienne dans `src/file-attente/travailleurs.ts`)
- [ ] T019 [US1] Créer la page `app/(public)/inscription/page.tsx` et `src/ui/comptes/FormulaireInscription.tsx` : champs de FR-001, choix médecin (RPPS) ou structure (SIRET), spécialités du paramètre, cases « identique à l'adresse du cabinet », règles du mot de passe cochées en direct (`aria-live` poli), offre de bienvenue si active, information sur l'usage des données, aucune invitation à saisir une donnée de patient ; protections anti-robots et limites de F01
- [ ] T020 [US1] Créer `app/(public)/inscription/verifier-email/page.tsx` (consulter sa boîte, renvoyer l'email : 3 par heure au plus) et la page d'arrivée du lien de confirmation (réussite, lien expiré avec renvoi)

**Checkpoint** : un professionnel peut créer son compte et confirmer son email.

---

## Phase 4: User Story 2 — Valider les comptes (Priority: P1)

**Goal** : l'équipe valide, refuse, suspend ou rétablit ; fiche client créée dans Odoo.

**Independent Test** : valider un compte (email, fiche client, levée du blocage) ; en refuser
un autre (email de refus).

### Tests

- [ ] T021 [P] [US2] Écrire `tests/unit/comptes/validation.test.ts` : validation → statut, partenaire créé ou retrouvé (`odooPartnerRef`), email, décision et journal ; connecteur indisponible → validation conservée, création confiée à la file d'attente ; refus et suspension exigent un motif ; validation automatique ; transitions interdites refusées
- [ ] T022 [P] [US2] Écrire `tests/e2e/f02/validation.spec.ts` : liste des comptes en attente (identité, numéro, cabinet, date), valider, refuser avec motif, suspendre, rétablir, emails dans la boîte de démonstration, validation automatique activée dans les réglages ; commercial autorisé, support refusé ; axe-core

### Implémentation

- [ ] T023 [US2] Créer `src/domaine/comptes/validation.ts` : `valider`, `refuser`, `suspendre`, `retablir` (décision, journal, email ; à la validation, `clients.creerOuRetrouverPartenaire` avec clé = identifiant du compte, sinon tâche `fiche-client` dans la file d'attente), et le travailleur correspondant dans `src/file-attente/travailleurs.ts`
- [ ] T024 [US2] Créer `app/(back-office)/admin/comptes/page.tsx` (listes par statut, recherche) et `app/(back-office)/admin/comptes/[id]/page.tsx` (fiche, décisions, lien vers l'annuaire santé public, D6) avec leurs actions serveur ; rôles `admin` et `commercial` (D5) ; « Comptes » ajouté à la navigation du back-office
- [ ] T025 [US2] Créer `app/(back-office)/admin/comptes/reglages/page.tsx` : validation automatique, offre de bienvenue (active ; le texte renvoie à `/admin/contenus/coordonnees`), spécialités ; administrateur uniquement ; historique des paramètres

**Checkpoint** : les comptes peuvent être validés ; seuls les comptes validés peuvent commander.

---

## Phase 5: User Story 3 — Se connecter et récupérer son accès (Priority: P1)

**Goal** : connexion, échecs limités, mot de passe oublié, double authentification facultative.

**Independent Test** : connexion, déconnexion, réinitialisation, double authentification et
code de secours.

### Tests

- [ ] T026 [P] [US3] Écrire `tests/unit/comptes/securite.test.ts` : 5 échecs en 15 minutes → blocage de 15 minutes et email ; compteur par empreinte (jamais l'email en clair) ; remise à zéro après une connexion réussie ; même réponse pour un email inconnu
- [ ] T027 [P] [US3] Écrire `tests/e2e/f02/connexion.spec.ts` : connexion et retour à la page consultée, déconnexion, message unique d'échec, blocage après 5 échecs (message identique, email), mot de passe oublié (même message pour un email inconnu, lien à usage unique, autres sessions fermées, email de notification, en moins de 2 minutes, SC-008), activation de la double authentification puis connexion avec un code et avec un code de secours ; connexions, échecs, blocage, changements de mot de passe et de double authentification présents dans le journal de sécurité (FR-034) ; clavier seul ; axe-core

### Implémentation

- [ ] T028 [US3] Ajouter à `src/lib/auth.ts` les crochets de connexion : refus si `bloqueJusqua` est dans le futur, comptage des échecs et blocage (`src/domaine/comptes/securite.ts`), remise à zéro après réussite, journal des connexions et des échecs ; à la réinitialisation, fermeture des autres sessions et email de notification
- [ ] T029 [US3] Créer `app/(public)/mot-de-passe-oublie/page.tsx` et `app/(public)/reinitialiser-mot-de-passe/page.tsx` (règles affichées en direct, messages neutres)
- [ ] T030 [US3] Créer `app/(public)/mon-compte/securite/page.tsx` : changement de mot de passe (mot de passe actuel exigé), activation et désactivation de la double authentification (composant de F11 adapté, retour vers « Mon compte »), nouveaux codes de secours ; chaque changement inscrit au journal de sécurité (FR-034) et notifié par email

---

## Phase 6: User Story 4 — Recevoir le tensiomètre de bienvenue (Priority: P2)

**Goal** : droit au cadeau, remise unique par numéro, rupture et annulation.

**Independent Test** : bénéficiaire, première commande avec ligne à 0 € et sortie de stock,
deuxième commande sans cadeau (par les tests du domaine ; parcours complet avec F04).

### Tests

- [ ] T031 [P] [US4] Écrire `tests/unit/comptes/bienvenue.test.ts` : droit ouvert à la validation si abonné et offre active, ou plus tard à l'abonnement ; aucun droit si l'offre est inactive (droits existants conservés) ; `cadeauPourCommande` puis `commandes.creerCommandePayee` → ligne à 0 € et stock décompté dans la base de démonstration (SC-009) ; deuxième commande sans cadeau ; **20 appels simultanés pour un même numéro → un seul cadeau** (SC-002) ; deux RPPS au même cabinet → deux cadeaux ; SIRET et RPPS distincts → chacun le sien ; désabonnement sans effet ; rupture → `en_attente_stock`, email au bénéficiaire, alerte à l'équipe ; annulation avant expédition → `droit_ouvert`

### Implémentation

- [ ] T032 [US4] Créer `src/domaine/comptes/bienvenue.ts` : `ouvrirDroitSiEligible`, `cadeauPourCommande`, `confirmerCadeauRemis`, `retablirCadeau` selon [contracts/domaine.md](contracts/domaine.md) (unicité garantie par la contrainte sur le numéro et une transaction) ; appels à `ouvrirDroitSiEligible` depuis la validation (T023) et l'abonnement (T037)
- [ ] T033 [US4] Afficher l'offre dans « Mon compte » (bénéficiaire : « joint à votre première commande » ; non abonné : comment le devenir ; cadeau reçu ; offre inactive : rien) via `src/ui/comptes/EncartBienvenue.tsx`

---

## Phase 7: User Story 5 — Gérer son compte (Priority: P2)

**Goal** : tableau de bord et modifications.

**Independent Test** : modifier une adresse, se désabonner puis se réabonner, ouvrir chaque
rubrique sans erreur.

### Tests

- [ ] T034 [P] [US5] Écrire `tests/e2e/f02/mon-compte.spec.ts` : tableau de bord (statut, rubriques de FR-036, contact WhatsApp, ni garanties ni rendez-vous), chaque rubrique s'ouvre sans erreur, modification du téléphone et d'une adresse reportée sur la fiche de démonstration, changement d'email confirmé par la nouvelle adresse avec notification de l'ancienne, demande de changement de RPPS visible dans `/admin/comptes/demandes` et non appliquée, désabonnement puis réabonnement historisés ; changement d'email inscrit au journal de sécurité ; redirection vers la connexion sans session ; axe-core

### Implémentation

- [ ] T035 [US5] Créer `app/(public)/mon-compte/layout.tsx` (client connecté, sinon `/connexion?retour=…`) et `app/(public)/mon-compte/page.tsx` (statut, encart de bienvenue, rubriques, contact WhatsApp de `src/lib/contact-whatsapp.ts`) ; pages « Bientôt disponible » pour `commandes`, `factures`, `locations`, `bons-achat`, `assistance`, `logiciels`
- [ ] T036 [US5] Créer `src/domaine/comptes/profil.ts` et les pages `app/(public)/mon-compte/informations/page.tsx` et `adresses/page.tsx` : modification enregistrée puis reportée par `clients.mettreAJourCoordonnees` (file d'attente si indisponible) ; changement d'email par Better Auth avec confirmation et notification de l'ancienne adresse, inscrit au journal de sécurité (FR-034) ; demande de changement de numéro ; et l'écran `app/(back-office)/admin/comptes/demandes/page.tsx` (accepter ou refuser, signalements)
- [ ] T037 [US5] Créer `src/domaine/comptes/newsletter.ts` et `app/(public)/mon-compte/preferences/page.tsx` : abonnement (origine `mon_compte`, texte présenté, confirmé par l'email déjà vérifié), désabonnement, `emailing.mettreAJourContact` (FR-028), ouverture du droit au cadeau ; lien de désinscription des emails (F01) relié au compte

---

## Phase 8: User Story 6 — Exercer ses droits sur ses données (Priority: P2)

**Goal** : export et suppression.

**Independent Test** : exporter ses données ; supprimer un compte (connexion impossible,
factures conservées) ; refus si location en cours.

### Tests

- [ ] T038 [P] [US6] Écrire `tests/unit/comptes/rgpd.test.ts` : export complet (identité, compte, adresses, consentements, sécurité, newsletter, situation lue dans Odoo) sans donnée d'un autre compte ; suppression : sessions fermées, données anonymisées, consentements conservés anonymisés, newsletter retirée, partenaire archivé, attribution conservée par numéro ; refus si location en cours ou facture impayée ; demandes journalisées
- [ ] T039 [P] [US6] Écrire `tests/e2e/f02/donnees.spec.ts` : export après nouvelle saisie du mot de passe (fichier JSON téléchargé), suppression confirmée puis connexion impossible, refus expliqué pour le compte de démonstration « client avec droits » (location en cours) ; axe-core

### Implémentation

- [ ] T040 [US6] Créer `src/domaine/comptes/rgpd.ts` (`exporter`, `supprimer`, demande RGPD et journal) selon [research.md](research.md) R8
- [ ] T041 [US6] Créer `app/(public)/mon-compte/donnees/page.tsx` et la route `app/(public)/mon-compte/donnees/export/route.ts` : un formulaire envoie le mot de passe (POST), le serveur le vérifie puis renvoie le fichier JSON en téléchargement ; et l'action de suppression (mot de passe et confirmation explicite)
- [ ] T046 [US6] Créer `app/(back-office)/admin/comptes/rgpd/page.tsx` : saisie d'une demande d'export ou de suppression reçue par courrier ou par email, suivi du délai d'un mois (FR-039), traitement par l'équipe avec les fonctions de `src/domaine/comptes/rgpd.ts` ; administrateur uniquement ; journal

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T042 [P] Ajouter les pages de F02 aux listes de `tests/e2e/no-egress.spec.ts` et `tests/e2e/accessibilite-charte.spec.ts` ; vérifier SC-012 sur tous les messages (inscription, connexion, mot de passe oublié, renvoi)
- [ ] T043 [P] Mettre à jour `docs/demonstration.md` (inscription, validation, réglages) et `tests/e2e/parcours/README.md` (inscription ✅)
- [ ] T044 Dérouler [quickstart.md](quickstart.md) et corriger les écarts ; préparer la séance d'essai (SC-004 : inscription en moins de 4 minutes)
- [ ] T045 Vérifier la conformité finale : `npm run typecheck`, `npm run lint`, `npm run check:contrast`, `npm test`, `npm run test:e2e` en local, puis en intégration continue

---

## Dependencies & Execution Order

- **Setup** puis **Foundational** : bloquent tout.
- **US1** (inscription) : MVP ; **US2** (validation) après US1 ; **US3** (connexion) après la phase 2, indépendante.
- **US4** (cadeau) après US2 (ouverture du droit à la validation) ; **US5** après US1 ; T037 relie US5 à US4.
- **US6** après US1.
- **Polish** en dernier.

```text
Setup → Foundational ─┬─ US1 ─┬─ US2 ── US4
                      │       ├─ US5 (T037 → US4)
                      │       └─ US6
                      └─ US3
                                   → Polish
```

## Parallel Example: Foundational

```text
T005 tests de contrat · T007 numéros · T008 adresses · T009 statuts
```

## Implementation Strategy

1. Phases 1 et 2.
2. **MVP** : US1 puis US2 — inscription et validation ; valider SC-001 et SC-012.
3. US3 (connexion sécurisée), puis US4, US5, US6.
4. Polish.

**Remarque** : la remise effective du cadeau dans une commande (US4) et le blocage de la
commande (SC-001) sont vérifiés ici par les tests du domaine ; leurs parcours complets
seront joués par F04 (panier et paiement).
