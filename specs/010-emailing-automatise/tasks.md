---
description: "Liste des tâches — F10 Emailing automatisé"
---

# Tasks: F10 — Emailing automatisé

**Input**: documents de conception de `specs/010-emailing-automatise/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md) ;
socles de F11 à F12 livrés ; décisions D1 à D10 validées le 2026-10-20.

**Tests** : exigés par la constitution (principe X) et par SC-001 à SC-012 ; écrits **avant**
l'implémentation qu'ils vérifient.

## Format : `[ID] [P?] [Story] Description`

- **[P]** : réalisable en parallèle (fichiers différents, sans dépendance non terminée)
- **[Story]** : US1 à US8

## Conventions communes

Celles de F11 à F12 : TypeScript strict ; français au vouvoiement ; tokens de la charte ;
aucun email réel en phase 1 (boîte de démonstration) ; seul `src/domaine/emailing/` appelle
`registre.emailing()` ; aucune donnée de patient, de carte ni de mot de passe dans les
variables ; un test qui modifie un paramètre ou une préférence le rétablit ; pages nouvelles
ajoutées aux contrôles transverses (`no-egress`, `accessibilite-charte`, largeurs).

---

## Phase 1: Setup

- [X] T001 Compléter `prisma/site/schema.prisma` (migration `scripts/nouvelle-migration.sh site f10_emailing`) selon [data-model.md](data-model.md) : `Envoi` (enums `FamilleEmail` `transactionnel|service|commercial|equipe`, `ScenarioEmail` `reapprovisionnement|panier_abandonne|alerte_bons|alerte_droits|impaye|campagne`, `EtatEnvoi` `programme|envoye|remis|rejete|annule|bloque` ; `cle` unique ; index `(etat, programmeLe)`, `(destinataire, creeLe)`, `(compteId, creeLe)`, `(scenario, creeLe)`), `ModeleEmail` (clé `code`, `textesPublies` et `textesBrouillon` JSON), `PreferencesEmail` (clé `email` en minuscules, 4 booléens à vrai par défaut), `AdresseRejetee`, `Campagne` (enums `TypeCampagne`, `EtatCampagne`) ; `MessageDemonstration` + `ouvertLe`, `texte`
- [X] T002 Compléter `prisma/demo/schema.prisma` (migration `scripts/nouvelle-migration.sh demo f10_niveaux_relance`) : `NiveauRelance` (`niveau` 1–3, `joursAvantConsequence` 5/2/1, `annonceConsequence`, `libelle`) et jeu de départ ; paramètres `emailing.*` (tableau de [data-model.md](data-model.md)) dans `prisma/site/seed/contenus-initiaux.ts` et `src/lib/parametres.ts` ; retrait de `virement.rappel_jours`

---

## Phase 2: Foundational (prérequis bloquants)

- [X] T003 [P] Mettre à jour `tests/contract/emailing.test.ts` selon [contracts/emailing.md](contracts/emailing.md) : `envoyerEmail` idempotent par clé, `lireSuivi` (remis, rejet définitif `@rejet.demo…`, rejet temporaire `@temporaire.demo…`, `NotFound`), erreurs `Unavailable` (panne simulée), `ValidationError` (adresse invalide), `ConfigurationIncomplete` (réel) ; notification d'équipe par SMS ; message de démonstration limité à l'adresse, l'objet, le rendu et le texte (FR-039, FR-043)
- [X] T004 Faire évoluer le connecteur : `src/connecteurs/emailing/interfaces/index.ts` (`EmailClient` avec famille, texte, désinscription ; `SuiviEnvoi` ; `envoyerEmail`, `lireSuivi` remplacent `envoyerTransactionnel`, `lireEtatRemise`), `demo/index.ts` (texte, famille, `ouvertLe`, rejets temporaires), `real/index.ts`, journal et panne simulée inchangés
- [X] T005 [P] Écrire `tests/unit/emailing/decision.test.ts` (fonction pure `decider`, tableau R3 de [research.md](research.md)) : transactionnel toujours envoyé (préférences coupées, non abonné, compte suspendu), service coupé par sa préférence, commercial réservé aux abonnés confirmés, compte suspendu/refusé/supprimé → ni service ni commercial, adresse suspendue, fréquence 2 / 7 jours → report puis annulation au-delà de 7 jours, plages (soir, week-end, jour férié) → prochain créneau, objet disparu → annulé ; et `tests/unit/emailing/jetons.test.ts` (signature, falsification refusée, casse de l'adresse)
- [X] T006 Créer `src/domaine/emailing/catalogue.ts` : chaque modèle existant de `src/emails/` déclaré avec code, famille (D3 : tout transactionnel sauf `rappel_fin_droits` et `rappel_expiration_bons` en service), libellé, module, scénario, variables (nom, description, exemple, obligatoire), justification affichée dans les préférences ; `src/domaine/emailing/decision.ts` (`decider`, `prochainCreneau` avec `src/lib/calendrier.ts`) ; `src/domaine/emailing/jetons.ts` (HMAC-SHA256, clé dérivée d'`AUTH_SECRET`)
- [X] T007 [P] Écrire `tests/unit/emailing/envoi.test.ts` : `demanderEnvoi` idempotent (même clé = une ligne, un message) ; transactionnel envoyé aussitôt ; panne simulée → `programme`, reprise par `releverEnvois` après la fin de la panne, un seul message (SC-012) ; alerte d'équipe unique au-delà de `emailing.alerte_panne_minutes` ; rendu à lien secret effacé après envoi ; variable obligatoire manquante → `bloque` + alerte ; désinscription entre programmation et relève → `annule` (SC-004) ; changement d'adresse non confirmé → envoi à l'adresse confirmée
- [X] T008 Créer `src/domaine/emailing/envoi.ts` (`demanderEnvoi`, `notifierEquipe`, `releverEnvois` avec essais espacés) et brancher la tâche `emails-envoi` (chaque minute) dans `src/file-attente/travailleurs.ts` ; `envoyer()` et `alerterEquipe()` de `src/domaine/commande/notifications.ts` deviennent des relais ; remplacer les appels directs restants (`src/lib/auth.ts`, `src/domaine/newsletter.ts`, `src/domaine/comptes/securite.ts`, `src/domaine/contact.ts`, `src/domaine/catalogue/devis.ts`, `src/domaine/comptes/(bienvenue|profil|inscription|newsletter|rgpd).ts`, `src/file-attente/index.ts`) ; ajouter à `tests/unit/imports-connecteurs.test.ts` la règle « `registre.emailing()` uniquement dans `src/domaine/emailing/` »
- [X] T009 Compléter `src/emails/Gabarit.tsx` : prop `famille` ; pied « Pourquoi vous recevez cet email » + « Gérer mes préférences » (service), + « Se désinscrire » (commercial) ; mentions légales (identité et adresse des paramètres de F01) ; `color-scheme` clair et sombre ; version texte (`render(..., { plainText: true })`) renvoyée avec chaque `EmailRendu`

**Checkpoint** : tous les emails existants passent par F10, tracés, sans changement visible.

---

## Phase 3: User Story 1 — Être informé à chaque étape (P1) 🎯 MVP

- [X] T010 [P] [US1] Écrire `tests/unit/emailing/modeles.test.ts` : chaque modèle du catalogue rendu avec ses exemples → logo avec `alt`, version texte non vide, aucune `{{variable}}` restante, aucun motif interdit (numéro de carte, « mot de passe : », données de patient), aucune promotion dans un transactionnel, montants HT (et TTC pour un paiement), contact F09, expéditeur et mentions légales présents ; pied « Pourquoi vous recevez cet email » et lien de préférences sur les modèles de service (SC-006, SC-011, FR-006, FR-027, FR-041)
- [X] T011 [P] [US1] Écrire `tests/e2e/f10/transactionnels.spec.ts` : inscription, validation, commande carte, expédition (suivi du colis), facture (lien vers « Mon compte → Factures » après connexion), échéance de location, résiliation, demande de financement → un email chacun dans la boîte en moins de 5 minutes, un seul en rejouant l'événement (SC-003) ; compte sans aucune préférence ni newsletter → reçus quand même ; adresse `@rejet.demo…` → alerte d'équipe ; affichage à 375 px ; axe-core sur la boîte de démonstration
- [X] T012 [US1] Combler les écarts relevés par T010 et T011 dans `src/emails/modeles-*.tsx` (lien vers la facture dans « Mon compte », suivi du colis, mentions) ; boîte de démonstration (`app/(back-office)/admin/demonstration/boite/`) : famille, version texte, lien de désinscription affiché, `ouvertLe` renseigné à la consultation

---

## Phase 4: User Story 2 — Être relancé avant de manquer de consommables (P1)

- [X] T013 [P] [US2] Écrire `tests/unit/emailing/reapprovisionnement.test.ts` : `rythme` (moins de 3 commandes → rien ; intervalles à ±50 % → date prévue ; irrégulier → rien ; rythme qui change → recalcul) ; commande tous les 60 jours → envoi entre J-9 et J-5 (SC-001) ; déjà recommandé → rien (SC-005) ; une seule relance par échéance ; consommables dus à moins de 7 jours regroupés ; article retiré ou en rupture → rien ; préférence coupée → rien ; contenu : prix HT du jour, gain en bons et droits
- [X] T014 [P] [US2] Écrire `tests/e2e/f10/reapprovisionnement.spec.ts` : compte de test avec trois commandes d'électrodes espacées de 60 jours (outil de démonstration), scénarios lancés → relance dans la boîte ; « Commander de nouveau » → connexion puis panier avec l'article et la quantité ; relancer → rien de plus
- [X] T015 [US2] Créer `src/domaine/emailing/scenarios/reapprovisionnement.ts` (historique par le connecteur Odoo sur 18 mois, consommables du catalogue, clé `reappro:<compte>:<article>:<dernière commande>`, `estimerGains` de F06), le modèle `relance_reapprovisionnement` (`src/emails/modeles-emailing.tsx`, famille service) et la route `app/(public)/panier/recommander/route.ts` ; tâche `emails-scenarios` (8 h 30) ; outil de démonstration « Commandes passées d'un compte » et bouton « Lancer les scénarios maintenant » dans `app/(back-office)/admin/demonstration/`

---

## Phase 5: User Story 3 — Ne recevoir que ce à quoi on a consenti (P1)

- [X] T016 [P] [US3] Écrire `tests/e2e/f10/consentement.spec.ts` : Back-office → Emails → Campagnes (créer, email de test obligatoire avant de programmer, programmer, annuler) ; campagne de test envoyée à un abonné confirmé et à un non-abonné → seul l'abonné la reçoit (SC-002) ; « Se désinscrire » sans connexion → plus d'email commercial, transactionnels maintenus ; désinscription avant l'envoi d'une campagne programmée → non reçue (SC-004) ; non-abonné reçoit une relance de service avec le lien pour la désactiver ; `POST /api/emails/desinscription` → 200
- [X] T017 [US3] Créer `src/domaine/emailing/preferences.ts` (lecture, changement, `Consentement` avec origine, `mettreAJourContact`) et la route `app/api/emails/desinscription/route.ts` (RFC 8058, jeton signé) ; en-tête de désinscription transmis au connecteur pour les familles service et commerciale ; destinataires des campagnes : abonnés confirmés (comptes et `InscriptionNewsletter`), comptes suspendus, refusés ou supprimés exclus ; `src/domaine/emailing/campagnes.ts` (créer, tester, programmer dans les plages, annuler, une ligne `Envoi` par abonné, clé `campagne:<id>:<email>`) et l'écran `app/(back-office)/admin/emails/campagnes/` (liste, `[id]/`, administrateur seulement, journal)

---

## Phase 6: User Story 4 — Choisir ce qu'on reçoit (P2)

- [X] T018 [P] [US4] Écrire `tests/e2e/f10/preferences.spec.ts` : « Mon compte → Préférences » liste les 4 types facultatifs et les emails toujours envoyés avec leur justification ; désactiver le réapprovisionnement → plus de relance, réactiver ; `/preferences/<jeton>` sans connexion → mêmes réglages, aucune information du compte, jeton falsifié refusé ; abonné sans compte → newsletter seule ; moins d'une minute (SC-010) ; chaque changement et chaque désinscription crée un `Consentement` daté avec son origine (`mon_compte`, `lien_email`, `desinscription_un_clic`) — vérifié aussi en test unitaire dans `tests/unit/emailing/preferences.test.ts` (FR-014) ; axe-core, 320 px
- [X] T019 [US4] Compléter `app/(public)/mon-compte/preferences/page.tsx` et créer `app/(public)/preferences/[jeton]/page.tsx` (formulaires sans JavaScript obligatoire, `noindex`), actions serveur dans `src/actions/preferences.ts`

---

## Phase 7: User Story 5 — Être prévenu avant de perdre un avantage (P2)

- [X] T020 [P] [US5] Compléter `tests/unit/fidelite/rappels.test.ts` : alertes de droits et de bons passées par `demanderEnvoi` (famille service), une par échéance, annulées à l'envoi si les droits sont prolongés ou les bons utilisés, absentes si la préférence est coupée ou le scénario désactivé
- [X] T021 [US5] Adapter `src/domaine/fidelite/rappels.ts` (scénarios `alerte_droits` et `alerte_bons`, revérification de l'objet à l'envoi) et `src/emails/modeles-fidelite.tsx` (pied de service)

---

## Phase 8: User Story 6 — Reprendre un panier laissé en attente (P2)

- [X] T022 [P] [US6] Écrire `tests/unit/emailing/panier.test.ts` : panier d'un compte inchangé depuis 24 h → un rappel ; commandé ou vidé → rien (annulé s'il était programmé) ; inchangé → aucun second rappel ; modifié puis abandonné de nouveau → nouveau rappel ; panier de visiteur → rien ; prix et disponibilités du moment
- [X] T023 [US6] Créer `src/domaine/emailing/scenarios/panier.ts` (clé `panier:<panier>:<modifieLe>`, devis d'Odoo au rendu), le modèle `panier_abandonne` et la tâche `emails-paniers` (`20 * * * *`)

---

## Phase 9: User Story 7 — Être relancé pour une facture impayée (P2)

- [X] T024 [P] [US7] Écrire `tests/unit/emailing/impayes.test.ts` et compléter `tests/contract/odoo/` (`lireNiveauxRelance`) : virement en attente → relances J-5, J-2, J-1, la dernière annonçant l'annulation et sa date ; prélèvement refusé d'une location ou d'un abonnement logiciel → relances jusqu'à la suspension annoncée ; paiement reçu → plus rien, programmées annulées ; niveau dépassé non rattrapé ; reçues malgré les préférences coupées
- [X] T025 [US7] Dates de conséquence : virement → échéance de la commande (annulation, F04) ; location ou abonnement logiciel → début de l'impayé + `delaiRegularisationJours` des règles de location d'Odoo (suspension, F05, F12) ; l'email immédiat « prélèvement refusé » de F05 est conservé et aucun niveau ne part le même jour que lui. Ajouter `lireNiveauxRelance()` au connecteur Odoo (`src/connecteurs/odoo/interfaces/factures.ts`, démo, réel non livré) ; créer `src/domaine/emailing/scenarios/impayes.ts` et le modèle `relance_impaye` (famille transactionnelle) ; retirer le rappel de virement de `src/domaine/commande/virement.ts` ; niveaux modifiables dans `app/(back-office)/admin/demonstration/parametres-commerciaux/`

---

## Phase 10: User Story 8 — Régler les scénarios et suivre les envois (P2)

- [X] T026 [P] [US8] Écrire `tests/unit/emailing/textes.test.ts` : textes par défaut sans ligne en base ; brouillon invisible des envois ; publication refusée (variable inconnue, variable obligatoire retirée, objet trop long, lien externe) ; retour au texte d'origine ; `**gras**` et `{{variable}}` échappés ; et `tests/unit/emailing/suivi.test.ts` : remise, rejet définitif → adresse suspendue + alerte, 3 rejets temporaires → suspendue, remise réussie → compteur remis à zéro, levée par l'administrateur, transactionnel rejeté → alerte, ouverture, commande dans les 14 jours (contenant l'article pour une relance de consommable) comptée, au-delà non (FR-033, FR-036)
- [X] T027 [P] [US8] Écrire `tests/e2e/f10/administration.spec.ts` : Scénarios (désactiver le panier abandonné, passer l'avance à 10 jours, règles d'envoi : fréquence, plages, nom de l'expéditeur ; valeurs rétablies) ; Modèles (modifier l'objet de la confirmation de commande, aperçu, email de test, publication en moins de 5 minutes — SC-009, revenir au texte d'origine) ; résultats d'une campagne ; Suivi (rechercher un client, état et motif, lever une suspension d'adresse, enregistrer une désinscription reçue par réponse) ; résultats d'un scénario ; rôle commercial refusé ; axe-core
- [X] T028 [US8] Rendre les textes des modèles modifiables (D2) : `src/domaine/emailing/textes.ts` (textes par défaut du catalogue, version publiée, remplacement des variables) ; chaque modèle de `src/emails/modeles*.tsx` lit objet, titre, aperçu et paragraphes par `texte(...)` (mise en page inchangée)
- [X] T029 [US8] Créer `src/domaine/emailing/suivi.ts` (tâche `emails-suivi` toutes les 15 minutes : remise, rejets → `AdresseRejetee` et alertes, ouvertures ; statistiques des scénarios et des campagnes : envoyés, remis, ouverts, suivis d'une commande dans les 14 jours)
- [X] T030 [US8] Créer les écrans `app/(back-office)/admin/emails/` (suivi des envois, `scenarios/` avec le bloc « Règles d'envoi » — fréquence, plages, expéditeur —, `modeles/` et `[code]/`, résultats ajoutés à `campagnes/[id]/`), administrateur seulement, journal (`JournalAction`) ; lien dans le menu du back-office

---

## Phase 11: Polish & Cross-Cutting Concerns

- [X] T031 [P] Ajouter les pages de F10 aux contrôles transverses (`no-egress`, `accessibilite-charte`, largeurs de 320 à 1 920 px) ; mettre à jour les tests de F01 à F12 touchés par le nouveau contrat et le pied des emails (`tests/unit/**`, `tests/e2e/boite-demonstration.spec.ts`)
- [X] T032 [P] Politique de confidentialité (`contenus/confidentialite.md`) : mesure des ouvertures, emails de service, désinscription (à valider par le conseil juridique) ; `docs/demonstration.md` (préférences, scénarios, campagnes, suivi) ; `tests/e2e/parcours/README.md` ; `docs/deploiement-scalingo.md` (deux applications, `DEMO_DATABASE_URL` copiée depuis `explocardio-demo-db`)
- [X] T033 Dérouler [quickstart.md](quickstart.md) et corriger les écarts
- [X] T034 Vérifier la conformité finale : `npm run typecheck`, `npm run lint`, `npm run check:contrast`, `npm test`, `npm run test:e2e` (ordinateur et mobile), `npm run test:lighthouse`, puis en intégration continue

---

## Dependencies & Execution Order

- Setup (T001–T002) → Foundational (T003–T009) → US1 (MVP) → US2, US3 → US4 à US8 → Polish.
- T004 dépend de T003 ; T008 de T004 et T006 ; T009 avant T010.
- US4 dépend de US3 (préférences) ; T030 complète l'écran de campagnes de T017 ; US8 (T028) touche tous les modèles : à faire après US1 à
  US7 pour limiter les conflits ; T030 dépend de T028 et T029.

## Parallel Opportunities

- Les tests marqués [P] de chaque story ensemble ; US5, US6 et US7 indépendantes entre elles.

## Implementation Strategy

1. Socle (T001–T009) : tous les emails passent par F10, sans changement visible.
2. US1 à US3 : transactionnels vérifiés, relance de consommables, consentement.
3. US4 à US7 : préférences, alertes, panier, impayés.
4. US8 : textes modifiables, campagnes, suivi ; puis finitions et contrôles (T031–T034).
