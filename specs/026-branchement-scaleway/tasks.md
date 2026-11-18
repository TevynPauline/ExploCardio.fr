# Tasks: F26 — Branchement de Scaleway (stockage des fichiers)

**Input**: `specs/026-branchement-scaleway/` (plan.md, spec.md, research.md, data-model.md,
contracts/stockage.md, quickstart.md)

**Tests** : demandés (FR-018, SC-001, SC-002) — écrits avant le code de chaque phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]** : parallélisable (fichiers différents, sans dépendance en cours)
- **[Story]** : US1 à US4 de la spec

---

## Phase 1: Setup

- [X] T001 Installer `@aws-sdk/client-s3` (dépendance d'exécution) dans `package.json` ; ajouter le motif `^@aws-sdk/.*$` à `importsInterdits` de `eslint.config.mjs` (message `MESSAGE_CONNECTEUR`) et un cas dans `tests/unit/imports-connecteurs.test.ts`
- [X] T002 Configuration dans `src/lib/config.ts` : `NomConnecteur` + `"stockage"`, `CONNECTEURS` + `"stockage"`, `variableDeMode.stockage = "CONNECTOR_STOCKAGE"`, `VARIABLES_MODE_REEL.stockage = ["STOCKAGE_ENVIRONNEMENT", "STOCKAGE_COMPARTIMENT", "STOCKAGE_CLE_ACCES", "STOCKAGE_CLE_SECRETE"]`, `VALEURS_ADMISES.STOCKAGE_ENVIRONNEMENT = ["recette", "production"]` ; fonctions `environnementStockage(env)` (`"recette" | "production" | null`), `regionStockage(env)` (défaut `"fr-par"`), `compartimentIncoherent(env)` (vrai si le nom de `STOCKAGE_COMPARTIMENT`, en minuscules, ne contient pas le mot de l'environnement ou contient l'autre) et `stockageIncoherent(env)` (`CONNECTOR_STOCKAGE === "real"` et `compartimentIncoherent`) ; `variablesManquantes("stockage")` DOIT ajouter `STOCKAGE_COMPARTIMENT` quand `compartimentIncoherent` (R2)

---

## Phase 2: Foundational (bloquant)

**But** : contrat, validation commune des chemins, registre ; aucune différence visible.

### Tests (à écrire d'abord)

- [X] T003 [P] Tests de configuration dans `tests/unit/stockage-reel/config.test.ts` : environnement absent ou invalide → manquant ; `recette` + `explocardio-recette` → complet ; `recette` + `explocardio-production` → `STOCKAGE_COMPARTIMENT` manquante ; `production` + `explocardio-recette-production` → incohérent ; casse ignorée ; région par défaut `fr-par` ; mode démonstration → aucune variable exigée
- [X] T004 [P] Tests des chemins dans `tests/unit/stockage-reel/chemins.test.ts` : accepté `/stockage/produits/ab12.png` ; refusés (`OperationRefusee`) : vide, sans préfixe `/stockage/`, avec `..`, `\`, `//`, caractères de contrôle ; clé d'objet = chemin sans `/` initial ; plage `debut > fin`, négative ou `fin ≥ taille` → `OperationRefusee`
- [X] T005 Suite de contrat `tests/contract/stockage.test.ts` (harnais `suiteDeContrat("stockage", …)`) selon [contracts/stockage.md](contracts/stockage.md) : dépôt puis `lire` identique octet pour octet (lecture du flux) ; `lire` d'une plage (octets 2 à 5) ; `existe` → `null` avant, `{ taille }` après ; fichier absent → `NotFound` ; chemin refusé → `OperationRefusee` ; plage hors limites → `OperationRefusee` ; chemins de test sous `/stockage/tests-contrat/<aléatoire>`
- [X] T006 Mettre à jour `tests/unit/registre.test.ts` : connecteur `stockage` présent, mode `demo` par défaut, variables exigées en réel (liste de T002)

### Implémentation

- [X] T007 [P] Contrat `src/connecteurs/stockage/interfaces/index.ts` : types `Plage`, `LectureFichier` (`taille`, `plage`, `corps: ReadableStream<Uint8Array>`), `ConnecteurStockage` (`deposer`, `lire`, `existe`), commentaires renvoyant à F26
- [X] T008 [P] Validation commune `src/connecteurs/stockage/chemins.ts` : `verifierChemin(chemin)`, `cleObjet(chemin)`, `verifierPlage(plage, taille)` (fait passer T004)
- [X] T009 Démonstration `src/connecteurs/stockage/demo/index.ts` : `creerStockageDemo()` sur `dbSite().fichierStocke` (`deposer` = `upsert` avec `type`, `octets`, `taille` ; `lire` = flux d'un `Uint8Array` découpé à la plage ; `existe` = `{ taille, md5 }` calculé) ; chemins vérifiés par T008
- [X] T010 Squelette `src/connecteurs/stockage/real/index.ts` : `creerStockageReel(manquantes, env)` → `implementationRefusee("stockage", manquantes)` si `manquantes.length` (même motif que les autres connecteurs réels)
- [X] T011 Registre `src/connecteurs/registre.ts` : type `Connecteurs.stockage`, fabrique (`creerStockageDemo` / `creerStockageReel(manquantes, env)`), `registre.stockage()`, `creerRegistre(env).stockage()` ; contrôles habituels (pannes simulées en démonstration, données fictives en réel) ; vérifier que le journal n'inscrit que le chemin (premier argument) ; faire passer T003, T005 (démo), T006

**Checkpoint** : `npx vitest run tests/unit/stockage-reel tests/contract/stockage.test.ts tests/unit/registre.test.ts` vert, sans compte Scaleway.

---

## Phase 3: User Story 1 — Déposer et afficher un fichier, quel que soit le stockage (P1) 🎯 MVP

**But** : le site dépose et lit par le connecteur ; en démonstration, rien ne change.
**Test indépendant** : en démonstration, dépôt d'image, PDF, vidéo ; lecture entière et par plage ; en-têtes identiques.

- [X] T012 [P] [US1] Adapter `tests/unit/fichiers/stockage-en-base.test.ts` et ajouter `tests/unit/fichiers/lecture-stockage.test.ts` : `ecrire()` passe par `registre.stockage().deposer` ; `lireFichier` : connecteur → secours `fichier_stocke` (mode réel seulement) → ancien dossier `STORAGE_DIR` → `null` ; type déduit de l'extension ; chemin forgé → `null`
- [X] T013 [US1] `src/lib/stockage.ts` : contrôles inchangés ; `ecrire()` appelle `registre.stockage().deposer(chemin, type, octets)` (plus d'écriture directe en base) ; `lireFichier(segments, plage?)` rend `{ type, taille, plage, corps }` selon l'ordre de T012, `NotFound` traduit en `null` ; commentaire d'en-tête mis à jour (F26 remplace la note « F14 »)
- [X] T014 [US1] Route `app/stockage/[...chemin]/route.ts` : lecture en flux via `lireFichier` ; analyse de l'en-tête `Range` avant la lecture (plage passée au connecteur) ; `206` + `Content-Range` ; `OperationRefusee` de plage → `416` ; tous les en-têtes actuels conservés à l'identique (CSP, `nosniff`, SVG en pièce jointe, PDF, cache 7 jours, `Accept-Ranges`)
- [X] T015 [P] [US1] Test e2e `tests/e2e/f26/stockage.spec.ts` (démonstration) : dépôt d'une image au catalogue puis affichage ; lecture d'une vidéo d'aide par plage (`206`) ; en-têtes du SVG ; plage hors limites → `416`

**Checkpoint** : suite complète verte en démonstration (SC-001).

---

## Phase 4: User Story 3 — Jamais de mélange entre recette et site public (P1)

**But** : compartiment incohérent → dépôts bloqués et alerte.
**Test indépendant** : `recette` + compartiment `…production` → `ConfigurationIncomplete` à chaque appel, alerte affichée.

- [X] T016 [P] [US3] Tests dans `tests/unit/stockage-reel/garde.test.ts` : avec la configuration incohérente, `registre.stockage().deposer` et `lire` → `ConfigurationIncomplete` contenant `STOCKAGE_COMPARTIMENT` ; jamais de repli sur la démonstration
- [X] T017 [US3] Alerte dans `app/(back-office)/admin/page.tsx` (sur le modèle de `cleStripeIncoherente`) : si `stockageIncoherent()`, « Compartiment de stockage incohérent avec l'environnement : les dépôts de fichiers sont bloqués. Le nom du compartiment doit contenir « recette » sur le site de recette et « production » sur le site public (variables STOCKAGE_COMPARTIMENT et STOCKAGE_ENVIRONNEMENT dans Scalingo). »

---

## Phase 5: User Story 4 — Une panne de stockage ne casse pas le site (P2)

**But** : message clair au dépôt, pages affichées, panne journalisée.
**Test indépendant** : panne simulée du connecteur stockage (F11) ; dépôt refusé avec le message prévu ; page catalogue affichée.

- [X] T018 [P] [US4] Tests dans `tests/unit/fichiers/panne-stockage.test.ts` : `ServiceUnavailable` au dépôt → `FichierRefuse` avec le message exact « Le stockage des fichiers est momentanément indisponible. Réessayez dans quelques minutes. » ; `ConfigurationIncomplete` → « Le stockage des fichiers n'est pas configuré : prévenez l'administrateur. » ; en lecture, `ServiceUnavailable` → la route répond `503` sans détail
- [X] T019 [US4] `src/lib/stockage.ts` : traduction des erreurs du connecteur en `FichierRefuse` (messages de T018), pour que les actions existantes (`admin/catalogue/actions.ts`, `admin/contenus/actions.ts`, `admin/contenus/aide/actions.ts` via `src/domaine/aide/administration.ts`) affichent le message en gardant le formulaire ; route : `ServiceUnavailable` → `503`
- [X] T020 [US4] Écran des pannes simulées (F11) : vérifier que « stockage » apparaît dans la liste des connecteurs (`src/connecteurs/panne-simulee.ts` et écran de démonstration) ; compléter sinon

---

## Phase 6: Mode réel Scaleway (US1, US3 — lot 2)

**But** : le connecteur réel passe les mêmes tests de contrat.

- [X] T021 [P] [US1] Tests dans `tests/unit/stockage-reel/client.test.ts` avec `S3Client` simulé (méthode `send` injectée) : `deposer` → `PutObjectCommand` (`Bucket`, `Key` = `cleObjet`, `ContentType`, `ContentMD5` base64) ; `lire` sans plage et avec plage (`Range: bytes=d-f`, `ContentRange` lu pour la taille) ; `existe` → `HeadObjectCommand` (`ContentLength`, `ETag` sans guillemets) ; correspondance des erreurs du contrat (`NoSuchKey`/`NotFound`/404 → `NotFound` ; 403, `InvalidAccessKeyId`, `SignatureDoesNotMatch`, `NoSuchBucket` → `ConfigurationIncomplete(["STOCKAGE_CLE_ACCES", "STOCKAGE_CLE_SECRETE"])` ; réseau, 5xx, délai → `ServiceUnavailable("stockage")`) ; la clé secrète n'apparaît dans aucun message ni détail
- [X] T022 [US1] Client `src/connecteurs/stockage/real/client.ts` : `S3Client` (`endpoint` `https://s3.<région>.scw.cloud`, `region`, identifiants de l'environnement, `maxAttempts: 2`, délais 10 s en lecture et 60 s en dépôt) ; fonctions `deposer`, `lire` (corps converti en `ReadableStream` web), `existe`, `traduireErreur` (fait passer T021)
- [X] T023 [US1] Compléter `src/connecteurs/stockage/real/index.ts` avec le client ; `tests/contract/stockage.test.ts` exécutable en réel (ignoré tant que les variables manquent, comme les autres connecteurs)

---

## Phase 7: User Story 2 — Reprendre les fichiers déjà déposés (P1)

**But** : copie rejouable et vérifiée de `fichier_stocke` vers le compartiment.
**Test indépendant** : base de 3 fichiers, client simulé ; reprise, interruption, relance ; bilan exact ; effacement refusé tant qu'un fichier manque.

- [X] T024 [P] [US2] Tests dans `tests/unit/stockage-reel/reprise.test.ts` : fichier absent → copié puis contrôlé (taille et MD5) ; présent identique → « déjà présent » ; présent différent → recopié ; échec de copie → « en erreur », les autres continuent, code de sortie 1 ; relance → aucune copie en double ; `--effacer-la-base` refusé s'il reste un fichier non vérifié, sinon chaque ligne effacée après relecture de son objet ; aucune ligne effacée sans cette option
- [X] T025 [US2] Module `src/connecteurs/stockage/real/reprise.ts` : `reprendre({ client, base, effacer })` → bilan `{ copies, dejaPresents, enErreur: string[], restantEnBase }` (fait passer T024)
- [X] T026 [US2] Script `scripts/reprise-stockage.ts` et commande `npm run stockage:reprise` dans `package.json` : refuse de tourner si `CONNECTOR_STOCKAGE` n'est pas `real` ou si la configuration est incomplète ; affiche le bilan en français, sans clé ni contenu de fichier

---

## Phase 8: Polish & documentation

- [X] T027 [P] `src/connecteurs/README.md` : ligne `CONNECTOR_STOCKAGE` dans le tableau des modes, section « Mode réel du stockage (F26) »
- [X] T028 [P] `docs/deploiement-scalingo.md` : section « Fichiers téléversés » réécrite (stockage Scaleway en recette et en production, démonstration en base) ; tableau des variables `STOCKAGE_*` sans valeur ; étapes Scaleway (compte professionnel, projet, compartiments privés à Paris, application IAM et politique de research R8, clé générée au moment de la saisie) ; commande de reprise
- [X] T029 Vérifications : `npx tsc --noEmit`, `npx eslint src app tests scripts`, `npm run test:unit`, `npm run test:contract`
- [X] T030 Suite e2e une seule fois : `SITE_URL=http://localhost:3100 npm run test:e2e` (jamais deux suites en parallèle) — non-régression de la démonstration (SC-001) — lot 2 : aucun chemin de démonstration modifié ; suite F26 rejouée (2 passés), suite complète au lot 1
- [ ] T031 Recette sur `explocardio-recette` (Phase 3) : quickstart §3 à §5, après création du compte, du compartiment et de la clé par Pauline ou Régis

---

## Dependencies & Execution Order

- Phase 1 → Phase 2 (bloquante) → US1 (Phase 3) → US3 et US4 (Phases 4 et 5, indépendantes) → mode réel (Phase 6) → reprise (Phase 7, utilise le client de T022) → Polish.
- **Lot 1** (sans compte Scaleway) : T001 à T020. **Lot 2** : T021 à T030. **Recette** : T031.

## Parallel Example

```text
Phase 2 : T003, T004, T007, T008 en parallèle ; puis T005, T009 à T011.
Phase 3 : T012 et T015 en parallèle de T013 → T014.
```

## Implementation Strategy

1. **MVP (lot 1)** : connecteur en démonstration, site inchangé, garde et panne — livrable
   et vérifiable sans compte.
2. **Lot 2** : mode réel et reprise, testés avec un client simulé.
3. **Recette** : branchement de `explocardio-recette` dès que le compartiment et la clé
   existent.
