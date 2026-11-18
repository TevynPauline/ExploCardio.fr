# Tasks: F25 — Branchement de Brevo

**Input**: `specs/025-branchement-brevo/` (plan.md, spec.md, research.md, data-model.md,
contracts/emailing-reel.md, quickstart.md)

**Tests** : demandés (SC-001, FR-020) — écrits avant le code de chaque phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]** : parallélisable (fichiers différents, sans dépendance en cours)
- **[Story]** : US1 à US5 de la spec

---

## Phase 1: Setup

- [X] T001 Ajouter à `src/lib/config.ts` : `EMAILING_ENVIRONNEMENT` dans `VARIABLES_MODE_REEL.emailing` (à côté de `EMAILING_API_KEY`) et dans `VALEURS_ADMISES` (`["recette", "production"]`) ; fonctions `environnementEmailing(env)` (`"recette" | "production" | null`) et `adressesAutorisees(env)` (liste de `EMAILING_ADRESSES_AUTORISEES` séparée par des virgules, minuscules, espaces retirés, vides écartés) ; `variablesManquantes("emailing")` DOIT renvoyer `EMAILING_ADRESSES_AUTORISEES` si l'environnement est `recette` et la liste vide
- [X] T002 [P] Documenter les variables `EMAILING_ENVIRONNEMENT`, `EMAILING_ADRESSES_AUTORISEES`, `EMAILING_TEST_DESTINATAIRE` (sans valeur) dans `docs/deploiement-scalingo.md`, section des connecteurs

---

## Phase 2: Foundational (bloquant)

**But** : contrat étendu (plainte), client HTTP Brevo, correspondances, garde partagée.

### Tests (à écrire d'abord)

- [X] T003 [P] Tests de configuration dans `tests/unit/emailing-reel/config.test.ts` : environnement absent ou invalide → manquant ; recette sans liste → `EMAILING_ADRESSES_AUTORISEES` manquante ; production sans liste → complet ; normalisation de la liste
- [X] T004 [P] Tests de la garde dans `tests/unit/emailing-reel/garde-recette.test.ts` : adresse exacte autorisée, domaine `@exemple.fr` autorisé (pas `@sous.exemple.fr` ni `exemple.fr.pirate.com`), casse ignorée, adresse hors liste refusée ; en production toujours autorisé
- [X] T005 [P] Tests du client dans `tests/unit/emailing-reel/client.test.ts` (`fetch` injecté) : en-tête `api-key`, délai 10 s → `ServiceUnavailable` ; 401/403 → `ConfigurationIncomplete(["EMAILING_API_KEY"])` ; 402 ou code `not_enough_credits` → `ServiceUnavailable` avec `details.cause = "quota"` ; 429 et 5xx → `ServiceUnavailable` ; 400 `invalid_parameter` sur l'adresse → `OperationRefusee` ; la clé n'apparaît dans aucun message ni détail d'erreur
- [X] T006 [P] Tests de correspondance dans `tests/unit/emailing-reel/correspondance.test.ts` : table de research R6 (requests/deferred → envoye ; delivered → remis ; opened/uniqueOpened/proxyOpen → première date d'ouverture ; hardBounce/invalid/blocked/error → rejeté définitif avec motif ; softBounce → rejeté temporaire ; spam/unsubscribed → `plainte: true`) ; priorité rejet > remis > envoyé ; liste vide → `null`
- [X] T007 Étendre la suite de contrat `tests/contract/emailing.test.ts` : `lireSuivi` renvoie `plainte` (booléen) ; en démonstration, `…@plainte.demo.explocardio.test` → `plainte: true` ; en mode réel, destinataire = `process.env.EMAILING_TEST_DESTINATAIRE` et cas de rejet/plainte ignorés (`it.skipIf(mode === "real")`)

### Implémentation

- [X] T008 Ajouter `plainte: boolean` à `SuiviEnvoi` dans `src/connecteurs/emailing/interfaces/index.ts` (commentaire : « F25 : signalé comme indésirable ou désinscrit chez l'outil ») et dans le contrat `specs/010-emailing-automatise/contracts/emailing.md` (renvoi vers F25)
- [X] T009 Démonstration : `src/connecteurs/emailing/demo/index.ts` — constante `DOMAINE_PLAINTE_DEMO = "@plainte.demo.explocardio.test"` ; `lireSuivi` renvoie `plainte: true` pour ce domaine (état `remis`), `false` sinon (dépend de T008)
- [X] T010 [P] Garde partagée `src/lib/garde-recette-emailing.ts` (déplacée hors de `real/` : la règle de lint du principe III interdit d'importer une implémentation de connecteur depuis le domaine) : `adresseAutorisee(adresse, liste)` et `creerGardeRecette(env)` → `{ environnement, verifier(adresse) }` qui lève `OperationRefusee` avec `{ cause: "adresse_non_autorisee_en_recette" }` en recette hors liste (fait passer T004)
- [X] T011 [P] Client `src/connecteurs/emailing/real/client.ts` : classe `ClientBrevo` (`url` `https://api.brevo.com/v3`, `cle`, `fetch` et `delaiMs` injectables, 10 s par défaut), méthodes `envoyer(corps)`, `evenements({ messageId?, tags?, jours })` (pagination par `offset`, 100 par page, 7 jours), `contact(corps)` ; traduction des erreurs selon T005 ; `masquer()` retire la clé de tout texte (fait passer T005)
- [X] T012 [P] Correspondance `src/connecteurs/emailing/real/correspondance.ts` : `suiviDepuisEvenements(evenements)` (fait passer T006) et `etiquetteCle(cle)` = `"cle:" + sha256(cle).hex.slice(0, 32)`
- [X] T013 Squelette `src/connecteurs/emailing/real/index.ts` : `creerEmailingReel(manquantes, env)` → `implementationRefusee` si `manquantes.length`, sinon objet utilisant client, garde et correspondance ; modifier `src/connecteurs/registre.ts` pour passer `env` à `creerEmailingReel` ; un signalement unique (`console.error`) si production avec liste renseignée (FR-017)
- [X] T014 Faire passer T003 dans `src/lib/config.ts` et vérifier que `npx vitest run tests/contract/emailing.test.ts` reste vert en démonstration

**Checkpoint** : `npx vitest run tests/unit/emailing-reel tests/contract/emailing.test.ts` vert, sans clé Brevo.

---

## Phase 3: User Story 4 — Une recette sans risque pour les vrais clients (P1) 🎯 MVP

**But** : en recette, aucun email ne part hors de la liste ; les bloqués sont consultables.
**Test indépendant** : environnement `recette` + liste ; envoi hors liste → `annule` « Bloqué en recette », rendu conservé, aucun appel à Brevo.

- [X] T015 [P] [US4] Tests dans `tests/unit/emailing/garde-recette-envoi.test.ts` : avec `EMAILING_ENVIRONNEMENT=recette` et `CONNECTOR_EMAILING=real` simulé, `demanderEnvoi` vers une adresse hors liste → état `annule`, motif exact « Bloqué en recette : adresse non autorisée », `rendu`, `texte`, `objet` conservés, connecteur jamais appelé, aucune notification d'équipe ; adresse autorisée → envoi normal ; mode démonstration → garde inactive
- [X] T016 [US4] Dans `src/domaine/emailing/envoi.ts`, avant l'appel `registre.emailing().envoyerEmail` de `appliquer()` (après le rendu) : si `modeDuConnecteur("emailing") === "real"` et `environnementEmailing() === "recette"` et destinataire non autorisé (`adresseAutorisee` de T010) → `envoi.update({ etat: "annule", motif: "Bloqué en recette : adresse non autorisée", rendu, texte, objet })` et retour `"annule"` ; même garde dans `transmettreEquipe()` en filtrant les destinataires non autorisés (aucun autorisé → `annule`)
- [X] T017 [US4] Back-office `app/(back-office)/admin/emails/page.tsx` : afficher le motif des envois `annule` « Bloqué en recette » et un lien « Voir le contenu » ouvrant le rendu conservé (réutiliser l'aperçu existant `app/api/apercu` ou une page `app/(back-office)/admin/emails/[id]/page.tsx` en lecture seule, droit `emails:voir`) ; bandeau « Site de recette : seuls les envois vers les adresses autorisées partent » quand la garde est active
- [X] T018 [US4] Signalement FR-017 : en production avec `EMAILING_ADRESSES_AUTORISEES` renseignée, bandeau d'alerte sur `app/(back-office)/admin/page.tsx` (« Liste d'adresses autorisées ignorée sur le site public ») — lecture via une fonction de `src/connecteurs/emailing/real/garde-recette.ts`

**Checkpoint** : US4 vérifiable en phase 1.

---

## Phase 4: User Story 1 — Recevoir les emails dans sa vraie boîte (P1)

**But** : envoi réel, expéditeur contact@, rendu intact, une seule fois par clé.
**Test indépendant** : quickstart étapes 1 à 3.

- [X] T019 [P] [US1] Tests dans `tests/unit/emailing-reel/envoi.test.ts` (`fetch` simulé) : corps `POST /smtp/email` = `sender { name: "ExploCardio.fr", email: "contact@explocardio.fr" }`, `replyTo` identique, `to [{ email }]`, `subject`, `htmlContent`, `textContent`, `tags` contenant `etiquetteCle(cle)`, `famille:<famille>`, `modele:<modele>` ; aucun nom, cabinet ni autre donnée ; si les événements de l'étiquette existent déjà → aucun `POST`, même `envoiId` ; destinataire hors liste en recette → `OperationRefusee` sans appel
- [X] T020 [US1] Implémenter `envoyerEmail` dans `src/connecteurs/emailing/real/index.ts` : garde (T010) → recherche par étiquette (`evenements({ tags, jours: 7 })`, premier `messageId`) → sinon `envoyer()` ; renvoie `{ envoiId: messageId }`
- [X] T021 [US1] `releverEnvois` (tri extrait dans `ordreDePassage`) dans `src/domaine/emailing/envoi.ts` : trier les envois dus avec les transactionnels d'abord (`famille` = `transactionnel` puis `equipe` puis les autres, ensuite `programmeLe`) — test ajouté à `tests/unit/emailing/envoi.test.ts`

**Checkpoint** : US1 testable en recette avec une clé.

---

## Phase 5: User Story 2 — Savoir si un email est arrivé (P1)

**But** : états remis, ouvert, rejeté au back-office en moins de 5 minutes.
**Test indépendant** : quickstart étapes 4 et 5.

- [X] T022 [P] [US2] Tests dans `tests/unit/emailing-reel/suivi.test.ts` : `lireSuivi(messageId)` appelle `evenements({ messageId, jours: 7 })` et renvoie la correspondance ; aucun événement → `NotFound("Envoi", messageId)`
- [X] T023 [US2] Implémenter `lireSuivi` dans `src/connecteurs/emailing/real/index.ts`
- [X] T024 [US2] Passer la tâche `emails-suivi` de `*/15 * * * *` à `*/5 * * * *` dans `src/file-attente/travailleurs.ts` et corriger le commentaire de `suivreEnvois` dans `src/domaine/emailing/suivi.ts`

---

## Phase 6: User Story 3 — Se désinscrire en un clic (P1)

**But** : en-têtes de désinscription ; plainte → consentement commercial retiré.
**Test indépendant** : quickstart étapes 6 et 7.

- [X] T025 [P] [US3] Tests dans `tests/unit/emailing-reel/envoi.test.ts` : famille `service` ou `commercial` avec `desinscription` → `headers` `List-Unsubscribe: <url>` et `List-Unsubscribe-Post: List-Unsubscribe=One-Click` ; `transactionnel` → aucun de ces en-têtes
- [X] T026 [P] [US3] Tests dans `tests/unit/emailing/suivi.test.ts` : suivi `plainte: true` → `desabonnerNewsletter(email, "signalement_indesirable")` et préférence `promotions` désactivée, une seule fois (envoi déjà traité ignoré) ; aucune alerte de rejet
- [X] T027 [US3] Ajouter les en-têtes dans le corps d'envoi de `src/connecteurs/emailing/real/index.ts`
- [X] T028 [US3] Ajouter `"signalement_indesirable"` à `OrigineConsentement` dans `src/domaine/emailing/preferences.ts` (et son libellé dans l'historique des consentements du back-office s'il existe) ; dans `suivreUn()` de `src/domaine/emailing/suivi.ts`, si `s.plainte` et l'envoi n'est pas déjà marqué (`motif` ≠ « Signalé comme indésirable ») → retrait des consentements commerciaux, `motif` de l'envoi mis à « Signalé comme indésirable »
- [X] T029 [P] [US3] Tests puis implémentation de `mettreAJourContact` dans `src/connecteurs/emailing/real/index.ts` : `POST /contacts` `{ email, updateEnabled: true, attributes }` avec les clés de `consentements` en MAJUSCULES et valeurs booléennes ; jamais `emailBlacklisted` ; test dans `tests/unit/emailing-reel/contacts.test.ts`

---

## Phase 7: User Story 5 — Alertes de l'équipe et indisponibilité (P2)

**But** : notifications d'équipe par email ; SMS replié vers email ; quota signalé.
**Test indépendant** : quickstart étape 9.

- [X] T030 [P] [US5] Tests dans `tests/unit/emailing-reel/equipe.test.ts` (faux Brevo partagé : `tests/unit/emailing-reel/faux-brevo.ts`) : `envoyerNotificationEquipe` canal `email` → un envoi par destinataire, clé `cle + ":" + adresse`, objet = `n.objet ?? "Notification"`, HTML échappé du texte ; canal `sms` → email, objet préfixé « [SMS] », `console.warn` de l'écart ; renvoie l'`envoiId` du premier
- [X] T031 [US5] Implémenter `envoyerNotificationEquipe` dans `src/connecteurs/emailing/real/index.ts` (réutilise `envoyerEmail` interne, famille `transactionnel`, sans désinscription)
- [X] T032 [US5] Dans `alerterPanneProlongee` de `src/domaine/emailing/envoi.ts` : si le motif de l'envoi le plus ancien contient la cause quota, objet « Quota journalier d'emails atteint » et texte expliquant le report au lendemain et l'offre payante ; test dans `tests/unit/emailing/alertes.test.ts`

---

## Phase 8: Polish & vérifications

- [X] T033 [P] Vérifier `src/connecteurs/journal.ts` (vérifié : seules des références sont journalisées, aucun changement) : aucune donnée sensible journalisée pour emailing (rendu, texte exclus ; destinataire seulement) ; ajuster si besoin
- [X] T034 Lancer `npx tsc --noEmit`, `npx eslint .`, `npm run test:unit`, `npm run test:contract` — tout vert en démonstration
- [X] T035 Lancer la suite e2e une seule fois (`npm run test:e2e`, jamais deux suites en parallèle) — non-régression de la démonstration (SC-006)
- [X] T036 (fiche « brancher Brevo sur le site de recette » dans `docs/deploiement-scalingo.md`, 2026-11-17) Mettre à jour `specs/025-branchement-brevo/quickstart.md` si un écart apparaît ; préparer pour Pauline la fiche « créer la clé API Brevo et la saisir dans Scalingo » (étapes cliquées, sans valeur)
- [ ] T037 [Phase 3] Dérouler le quickstart sur le site de recette (après création de l'application de recette, F15)

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (bloquante) → US4 (MVP, sécurité de la recette) → US1 → US2 → US3 → US5 → Polish.
- US2, US3 et US5 ne dépendent que de la Phase 2 et de T020 (envoi) ; elles touchent toutes
  `src/connecteurs/emailing/real/index.ts` : les implémenter l'une après l'autre.
- T016 dépend de T010 ; T020 dépend de T011–T013 ; T028 dépend de T008.

## Parallel Example: Phase 2

```text
T003, T004, T005, T006 (tests, fichiers distincts) en parallèle
puis T010, T011, T012 (garde, client, correspondance) en parallèle
```

## Implementation Strategy

1. **MVP** : Phases 1–3 — configuration, client, garde de recette. Tout se vérifie sans clé
   Brevo ; c'est la condition pour brancher la recette sans risque.
2. **Envoi réel** (US1) puis **suivi** (US2) : le site peut fonctionner en recette.
3. **Désinscription et plaintes** (US3), **alertes** (US5).
4. **Recette** : clé de test saisie par Pauline ou Régis, quickstart complet.
