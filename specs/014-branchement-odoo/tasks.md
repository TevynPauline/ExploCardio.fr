---

description: "Tâches de F14 — Branchement d'Odoo, lot 1 (lecture du catalogue)"
---

# Tasks: F14 — Branchement d'Odoo (lot 1)

**Input**: Design documents from `/specs/014-branchement-odoo/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/odoo-reel.md, quickstart.md

**Tests**: exigés par la constitution (principe X : tests de contrat communs aux deux modes).
Les tests unitaires du mode réel tournent **sans réseau**, sur des réponses d'Odoo
enregistrées et anonymisées.

**Périmètre** : lot 1 seulement — lecture du catalogue, du stock et des prix client, garde de
neutralisation, rapport de contrôle. **Aucune écriture dans Odoo.** Les lots 2 à 5 sont des
phases réservées, détaillées plus tard.

**Règles permanentes** : aucun secret dans le code, les fixtures ou les messages ; la clé est
retirée de tout message d'erreur ; aucune page publique modifiée pour le branchement ;
`CONNECTOR_ODOO` reste `demo` sur l'application `explocardio`.

## Format: `[ID] [P?] [Story] Description`

- **[P]** : parallélisable (fichiers différents, sans dépendance en cours)
- **[Story]** : US1 = catalogue réel ; US2 = branchement sans risque

---

## Phase 1: Setup

- [X] T001 Ajouter `ODOO_ENVIRONNEMENT` aux variables exigées du connecteur `odoo` en mode réel, et valider ses valeurs (`recette` | `production`, sinon variable considérée comme manquante) dans `src/lib/config.ts` ; mettre à jour le tableau de `src/connecteurs/README.md`
- [X] T002 [P] Enregistrer des réponses d'Odoo 20 depuis la copie, en lecture seule, avec un script local hors dépôt (scratchpad), puis les **anonymiser** (aucun client, email, adresse de base ni clé) dans `tests/unit/odoo-reel/fixtures/` : `product.template`, `product.product`, `product.category` (avec `product_properties_definition`), `product.template.attribute.value`, `product.pricelist.item`, `product.supplierinfo`, `account.tax`, `stock.warehouse`, `stock.lot`, `ir.config_parameter` ; compléter à la main les cas absents de la copie (propriétés Marque/Type renseignées, règle de prix à quantité minimale, règle sur coût non gérée, variante sans référence, référence en double, numéro de série libre)
- [X] T003 [P] Créer le jeu de références par environnement `tests/contract/odoo/references.ts` (jeu `demo` = valeurs actuelles de `REF` ; jeu `copie` avec les mêmes clés, valeurs à `null` tant que Régis n'a pas saisi le jeu de test) et faire lire `REF` selon le mode dans `tests/contract/odoo/outils.ts` ; un test dont la référence vaut `null` est ignoré avec un message explicite

---

## Phase 2: Foundational (bloquant)

- [X] T004 Écrire les tests du client JSON-RPC dans `tests/unit/odoo-reel/client.test.ts` (fetch simulé) : authentification une seule fois puis réutilisation de l'uid ; délai de 10 s → `ServiceUnavailable` ; HTTP 429/502/503 → 2 nouvelles tentatives (0,5 s puis 2 s) en lecture puis `ServiceUnavailable` ; aucune nouvelle tentative pour une méthode d'écriture ; authentification refusée → `ServiceUnavailable` détail `{ cause: "acces_refuse" }` ; erreur de droit → détail `{ cause: "droit_insuffisant", modele }` ; la clé n'apparaît dans aucun message ni détail d'erreur
- [X] T005 Implémenter le client dans `src/connecteurs/odoo/real/client.ts` : `/jsonrpc`, services `common.authenticate` et `object.execute_kw`, fonctions `searchRead`, `read`, `searchCount`, `fieldsGet`, `appeler` (écriture, réservée aux lots suivants), contexte (langue `fr_FR`, entrepôt), masquage de la clé ; faire passer T004
- [X] T006 [P] Écrire les tests de la garde de neutralisation dans `tests/unit/odoo-reel/neutralisation.test.ts` : `recette` + `database.is_neutralized = True` → écriture permise ; `recette` + `False`, absent ou illisible → `OperationRefused` ; `production` + `True` → `OperationRefused` et ligne au journal « base de test branchée en production » ; `production` + absent → permise ; lecture du paramètre une seule fois par processus
- [X] T007 Implémenter `src/connecteurs/odoo/real/neutralisation.ts` (`verifierEcriturePermise(client, environnement)`) et l'appeler dans `client.appeler` avant toute écriture ; faire passer T006
- [X] T008 Restructurer `src/connecteurs/odoo/real/index.ts` : `creerOdooReel(variablesManquantes, env)` renvoie `implementationRefusee` pour tout si une variable manque ; sinon construit le client et les domaines `catalogue` et `stock` réels (phases suivantes), les six autres domaines restant `implementationRefusee` ; adapter l'appel dans `src/connecteurs/registre.ts` sans changer son comportement en démonstration

**Checkpoint** : client, garde et squelette en place ; `npm run test:unit` et `npm run test:contract` passent en démonstration.

---

## Phase 3: User Story 2 — Brancher sans risque (Priority: P1)

**Goal** : le mode réel s'active par configuration seule, échoue proprement, n'écrit jamais
dans une base non neutralisée en recette, et ne touche ni la démonstration ni la page d'attente.

**Independent Test** : variable manquante, clé refusée, base non neutralisée simulée : à
chaque fois une erreur claire, jamais de bascule en démonstration (quickstart §2 et §5).

- [X] T009 [P] [US2] Étendre `tests/unit/registre.test.ts` : `CONNECTOR_ODOO=real` sans `ODOO_ENVIRONNEMENT` → `ConfigurationIncomplete` citant la variable ; avec toutes les variables → `catalogue` et `stock.lireDisponibilite` réels, `stock.reserver` et les domaines `clients`, `commandes`, `factures`, `location`, `fidelite`, `opportunites` → `ConfigurationIncomplete` (« implémentation réelle non livrée »)
- [X] T010 [P] [US2] Vérifier dans `tests/unit/odoo-reel/journal.test.ts` qu'un appel réel est inscrit au journal des connecteurs (opération, durée, résultat) et qu'aucune entrée ne contient la clé, y compris en cas d'erreur
- [X] T011 [US2] Afficher l'environnement Odoo (`recette` | `production`) et le nom de la base, jamais la clé, à côté du mode des connecteurs dans le back-office : `src/connecteurs/registre.ts` (`registre.modes`) et la page existante qui les affiche sous `app/(back-office)/admin/`

**Checkpoint** : US2 vérifiable en [Phase 1] ; la démonstration est inchangée.

---

## Phase 4: User Story 1 — Voir le vrai catalogue (Priority: P1) 🎯 MVP

**Goal** : en mode réel, catégories, articles, variantes, prix HT, prix client et
disponibilité viennent d'Odoo ; un rapport liste ce qui manque dans Odoo.

**Independent Test** : quickstart §3 et §4 — tests de contrat de lecture sur la copie, site
local branché, fiche identique à Odoo, rapport exportable.

### Tests (à écrire d'abord)

- [X] T012 [P] [US1] `tests/unit/odoo-reel/correspondance.test.ts` : chemin complet de catégorie Odoo → code de rubrique ; une catégorie inclut ses sous-catégories ; « la plus précise l'emporte » ; catégorie non reliée → `null` ; défaut `{"Holter ECG":"holter-ecg","MAPA":"mapa","ERGOS":"effort","Consommables":"accessoires"}`
- [X] T013 [P] [US1] `tests/unit/odoo-reel/proprietes.test.ts` : lecture des propriétés par libellé « insensibles à la casse et aux accents » (Marque ; Type d'article : Équipement, Consommable, Accessoire, Logiciel, Service ; Quantité par lot, défaut 1 ; Mise à disposition – premier mois HT ; Mise à disposition – mois suivants HT ; Valeur de remplacement HT ; Kit requis ; Logiciel Cloud ; Éligible aux bons d'achat, défaut faux) ; montants convertis en centimes ; offre complète seulement si les trois montants sont renseignés
- [X] T014 [P] [US1] `tests/unit/odoo-reel/prix.test.ts` (R5) : prix fixe et remise en % sur le prix de vente ; portée variante > modèle > catégorie > globale ; quantité minimale ; dates de validité ; liste du partenaire puis liste par défaut ; paliers = règles à quantité minimale > 1 de la liste par défaut, triés ; règle sur coût, autre liste, arrondi ou marge → ignorée et remontée comme `REGLE_PRIX_NON_GEREE`
- [X] T015 [P] [US1] `tests/unit/odoo-reel/catalogue.test.ts` sur les fixtures : forme exacte des types de `src/connecteurs/odoo/interfaces/catalogue.ts` ; référence d'article = `default_code` de la première variante active ; `configuration` = valeurs d'attributs jointes par « , » ; `tauxTva` = somme des taxes de vente hors taxes ; `referenceFictive`, `prixInvente`, `estFictif` toujours `false` ; produits sans référence (Gift Card, Top-up eWallet) exclus ; `lireArticle` d'une référence inconnue → `NotFound` ; recherche sur nom, référence, référence fabricant, marque
- [X] T016 [P] [US1] `tests/unit/odoo-reel/stock.test.ts` (R6) : `free_qty` > 0 → `disponible` ; 0 avec délai fournisseur → `delai` ; 0 sans délai → `indisponible` ; `miseADisposition` `null` si pas d'offre, sinon `disponible` s'il existe un numéro de série libre en stock
- [X] T017 [P] [US1] `tests/unit/odoo-reel/controle.test.ts` : chaque code d'anomalie (`SANS_REFERENCE`, `REFERENCE_EN_DOUBLE`, `SANS_PRIX`, `SANS_TVA`, `CATEGORIE_NON_RELIEE`, `PROPRIETE_MANQUANTE`, `OFFRE_INCOMPLETE`, `SANS_NUMERO_SERIE`, `REGLE_PRIX_NON_GEREE`, `CLIENT_SANS_SIRET`, `SIRET_EN_DOUBLE`) ; bloquantes : `SANS_REFERENCE`, `REFERENCE_EN_DOUBLE`, `SANS_PRIX`, `SANS_TVA`, `CATEGORIE_NON_RELIEE`, `PROPRIETE_MANQUANTE` (marque, type) ; `OFFRE_INCOMPLETE` retire seulement la formule « mise à disposition » ; tri bloquantes d'abord
- [X] T018 [US1] Ajouter le test de `catalogue.controlerDonnees` aux tests de contrat communs `tests/contract/odoo/catalogue.test.ts` (forme d'une anomalie, tri) et faire lire les références via `references.ts` dans `catalogue.test.ts` et `stock.test.ts`

### Implémentation

- [X] T019 [US1] Ajouter le type `Anomalie` (`objet`, `reference`, `nom`, `code`, `detail`, `bloquant`) et l'opération `controlerDonnees(): Promise<Anomalie[]>` à `src/connecteurs/odoo/interfaces/catalogue.ts` ; documenter l'opération dans `specs/011-connecteurs-base-demonstration/contracts/odoo.md` §1
- [X] T020 [US1] Implémenter `controlerDonnees` en démonstration dans `src/connecteurs/odoo/demo/catalogue.ts` (mêmes codes, calculés sur la base fictive) ; faire passer T018 en mode démonstration
- [X] T021 [P] [US1] Ajouter le paramètre de fonctionnement `catalogue.correspondance_categories` (JSON, défaut ci-dessus, aide en français, validation : objet de chaînes vers un code parmi `holter-ecg`, `mapa`, `effort`, `ecg-repos`, `accessoires`) dans `src/domaine/parametres/catalogue.ts` et `src/domaine/parametres/validation.ts`, et dans `PARAMETRES_INITIAUX` de `prisma/site/seed/contenus-initiaux.ts`
- [X] T022 [P] [US1] Implémenter `src/connecteurs/odoo/real/correspondance.ts` ; la correspondance est transmise au connecteur par le registre (lue dans les paramètres du site par le domaine, jamais par le connecteur lui-même) ; faire passer T012
- [X] T023 [P] [US1] Implémenter `src/connecteurs/odoo/real/proprietes.ts` ; faire passer T013
- [X] T024 [P] [US1] Implémenter `src/connecteurs/odoo/real/prix.ts` ; faire passer T014
- [X] T025 [US1] Implémenter `src/connecteurs/odoo/real/catalogue.ts` : lecture groupée (modèles, variantes, valeurs d'attributs, catégories, taxes, fournisseurs, règles de prix, quantités) en quelques `search_read`, assemblage selon `contracts/odoo-reel.md`, filtre des articles affichables ; `listerCategories`, `listerArticles`, `lireArticle`, `lirePrixClient`, `rechercher`, `listerReferences` ; faire passer T015
- [X] T026 [US1] Implémenter les lectures de `src/connecteurs/odoo/real/stock.ts` (`lireDisponibilite` ; les autres opérations lèvent `ConfigurationIncomplete`) ; faire passer T016
- [X] T027 [US1] Implémenter `src/connecteurs/odoo/real/controle.ts` et brancher `controlerDonnees` dans le catalogue réel ; faire passer T017
- [X] T028 [US1] Ajouter `src/domaine/catalogue/controle.ts` : lecture du rapport via le registre, regroupement par objet, export CSV (séparateur `;`, UTF-8 avec BOM, colonnes Objet ; Référence ; Nom ; Anomalie ; Détail ; Bloquant), libellés français des codes
- [X] T029 [US1] Créer la page `app/(back-office)/admin/catalogue/controle/page.tsx` « Contrôle des données Odoo » : tableau accessible (en-têtes, tri par gravité), compteurs bloquant / à compléter, bouton « Exporter (CSV) », message « Aucune anomalie » ; lien depuis `app/(back-office)/admin/catalogue/page.tsx` ; accès réservé aux rôles qui voient déjà le catalogue
- [X] T030 [US1] Test e2e `tests/e2e/f14/controle.spec.ts` en démonstration : la page s'affiche, le compteur correspond, l'export se télécharge (desktop et mobile)

**Checkpoint** : US1 vérifiable en [Phase 1] (démonstration, page de contrôle) et en [Phase 3] sur la copie (quickstart §3, §4).

---

## Phase 5: Polish & vérifications

- [X] T031 [P] Documenter le mode réel dans `src/connecteurs/README.md` : variables, propriétés attendues dans Odoo, correspondance des catégories, garde de neutralisation, rapport de contrôle
- [X] T032 Lancer `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:contract`, puis les e2e (relancer les échecs avec `--last-failed --workers=1`)
- [X] T033 Vérification sur la copie avec `CONNECTOR_ODOO=real` en local (quickstart §3 et §4) : tests de contrat de lecture, rapport de contrôle, fiche identique à Odoo ; envoyer le rapport exporté à Pauline pour Régis
- [X] T034 Contrôle des secrets avant commit (procédure habituelle) ; vérifier que `tests/unit/odoo-reel/fixtures/` ne contient ni adresse de base, ni email, ni clé

---

## Phases réservées (non détaillées)

Détaillées à réception des réponses à `docs/questions-branchement-odoo.docx` et
`docs/donnees-test-odoo.docx`.

- **Lot 2 — Comptes clients (US3)** : clients, situation, archivage, opportunités CRM.
- **Lot 3 — Commandes (US4)** : devis Odoo, commandes carte et virement, réservation de stock, remboursements, frais de port par produit « Livraison », garde de neutralisation active.
- **Lot 4 — Location et factures (US5, US6)** : module Location, numéros de série, facturation mensuelle déclenchée par le site, factures et relances.
- **Lot 5 — Fidélité masquée et offre de bienvenue (US7)** : FR-026, FR-026b ; peut avancer en parallèle, en phase 1.
- **Recette** : création de l'application Scalingo de recette, puis F15.

---

## Dependencies & Execution Order

- **Phase 1** : T001 d'abord (T008 en dépend) ; T002 et T003 en parallèle.
- **Phase 2** : T004 → T005 ; T006 → T007 (après T005) ; T008 après T005 et T001.
- **US2 (Phase 3)** : après la phase 2 ; T009, T010 en parallèle ; T011 ensuite.
- **US1 (Phase 4)** : après la phase 2, indépendante de US2. Tests T012–T017 en parallèle ;
  T018 après T019 ; T019 → T020 ; T021–T024 en parallèle ; T025 après T022–T024 ; T026, T027
  après T025 ; T028 → T029 → T030.
- **Phase 5** : après US1 et US2.

## Parallel Example: User Story 1

```text
Ensemble : T012 correspondance.test, T013 proprietes.test, T014 prix.test,
           T015 catalogue.test, T016 stock.test, T017 controle.test
Puis ensemble : T021 paramètre, T022 correspondance.ts, T023 proprietes.ts, T024 prix.ts
```

## Implementation Strategy

1. Phases 1 et 2 : socle sûr (client, garde, configuration).
2. US1 jusqu'à T027 : catalogue réel vérifiable par les tests de contrat sur la copie.
3. T028–T030 : rapport de contrôle, livrable utile à Régis dès maintenant.
4. US2 en parallèle ou juste après ; Phase 5 ; commit après accord de Pauline.
