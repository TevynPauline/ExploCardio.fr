---
description: "Liste des tâches — F03 Catalogue et fiches produit à onglets"
---

# Tasks: F03 — Catalogue et fiches produit à onglets

**Input**: documents de conception de `specs/003-catalogue-fiches-produit/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md) ;
socles de F11, F01 et F02 livrés.

**Tests** : exigés par la constitution (principe X) et par les critères SC-001 à SC-013 ;
écrits **avant** l'implémentation qu'ils vérifient.

**Organisation** : par user story, chacune réalisable et vérifiable seule.

## Format : `[ID] [P?] [Story] Description`

- **[P]** : réalisable en parallèle (fichiers différents, sans dépendance non terminée)
- **[Story]** : US1 à US8

## Conventions communes

Celles de F11, F01 et F02 : TypeScript strict ; français au vouvoiement ; tokens de la charte
uniquement ; aucun accès à Odoo hors du registre (SC-009) ; montants en centimes, HT en
premier et TTC en complément (FR-027) ; jamais « prix sur demande » (FR-017) ; erreur du
connecteur → « Information momentanément indisponible », jamais une erreur brute ; cibles de
44 px ; chaque page nouvelle ajoutée à `tests/e2e/no-egress.spec.ts`,
`tests/e2e/accessibilite-charte.spec.ts` et à la liste des largeurs de
`tests/e2e/f01/liens-et-largeurs.spec.ts`.

---

## Phase 1: Setup

- [X] T001 Ajouter les paramètres de F03 à `prisma/site/seed/contenus-initiaux.ts` (créés s'ils manquent) : badge de l'hébergement : paramètre existant `accueil.badge_hebergement` de F01 (une seule source), `services.assistance.tarif`, `services.financement.tarif`, `services.installation.tarif`, `services.hebergement.tarif` (vides), `financement.mention` = « Montant indicatif, sous réserve d'acceptation par notre partenaire financier. » (D6) ; les tarifs sont saisis HT et affichés avec le TTC calculé à 20 % ; et le texte `contenus/installation-formation.md`

---

## Phase 2: Foundational (prérequis bloquants)

**⚠️ CRITICAL** : aucune user story ne commence avant la fin de cette phase.

### Connecteur Odoo : champs ajoutés au contrat (R8)

- [X] T002 Reporter dans [../011-connecteurs-base-demonstration/contracts/odoo.md](../011-connecteurs-base-demonstration/contracts/odoo.md) les champs de [contracts/odoo.md](contracts/odoo.md) : `VarianteArticle.quantiteParLot` (entier ≥ 1, 1 par défaut), `VarianteArticle.paliers` (`[{ quantiteMin, prixUnitaireHt }]` de la liste de prix publique), `Article.mensualitesForcees` (`[{ dureeMois, montantHt }]`, pour tous), `PrixClient.mensualitesForcees` (remplace `mensualiteForceeHt`, D5)
- [X] T003 [P] Écrire les tests de contrat dans `tests/contract/odoo/catalogue.test.ts` : `quantiteParLot ≥ 1` pour toute variante ; paliers triés par quantité croissante et prix unitaire décroissant ; mensualités forcées sur une durée du barème ; client sans liste de prix → `mensualitesForcees: []` ; Dr Delvaux-Arnoux → mensualité forcée sur `EC-DMS-3004L-CLOUD` ; client inconnu → `NotFound`
- [X] T004 Mettre à jour `src/connecteurs/odoo/interfaces/catalogue.ts` ; ajouter `Variante.quantiteParLot` à `prisma/demo/schema.prisma` (migration `scripts/nouvelle-migration.sh demo f03_catalogue`) ; compléter le jeu de départ (`prisma/demo/seed/`) : quantités par lot des électrodes (50, 500), liste de prix publique (sans partenaire) avec paliers des électrodes et des brassards et une mensualité forcée générale de démonstration, `dureeMois` sur la règle du Dr Delvaux-Arnoux ; disponibilité d'une configuration en pack = la moins bonne de ses composants (indisponible si l'un l'est, sinon le délai le plus long) ; implémenter dans `src/connecteurs/odoo/demo/catalogue.ts` ; adapter les usages de `mensualiteForceeHt`

### Base du site

- [X] T005 Compléter `prisma/site/schema.prisma` selon [data-model.md](data-model.md) : `ContenuProduit` + `slug` (unique), `anciensSlugs`, `sousCategorieId`, `publieLe` ; modèles `SousCategorie` (catégorie, libellé unique dans la catégorie, slug, ordre), `Panier` (`jetonEmpreinte` unique facultatif, `compteId` unique facultatif, dates) et `LignePanier` (`defaultCode`, `formule` `achat` / `mise_a_disposition`, `quantite ≥ 1`, `prixHtConstate`, unique par panier, référence et formule) ; migration `scripts/nouvelle-migration.sh site f03_catalogue`
- [X] T006 Ajouter au périmètre de la réinitialisation (`src/connecteurs/demonstration.ts`) les paniers et demandes de devis des séances ; conserver contenus, sous-catégories et paramètres
- [X] T007 Créer le jeu de départ des contenus (`prisma/site/seed/catalogue.ts`, appelé par le remplissage) : pour chaque article de la base fictive, un `ContenuProduit` **publié** (D2) avec slug lisible tiré de la marque et du nom (D3), description courte provisoire tirée d'Odoo, emplacement photo de la charte ; sous-catégories de départ (Accessoires & consommables : électrodes, brassards, sacoches, chariots, défibrillateurs ; autres catégories : selon la base fictive) ; sans écraser un contenu existant

### Domaine « catalogue » : règles de base

- [X] T008 [P] Écrire `tests/unit/catalogue/prix.test.ts` : `prixTtc` (taux de la variante, arrondi au centime) ; `mensualites` : calcul prix × coefficient pour chaque durée, priorité client > général > calcul (FR-046) ; `prixPourQuantite` : prix unitaire du palier atteint, total, conditionnement (prix ÷ quantité par lot)
- [X] T009 [P] Écrire `tests/unit/catalogue/publication.test.ts` : `peutPublier` refuse un article absent d'Odoo, sans prix, sans catégorie, sans description courte, sans photo ni emplacement accepté, avec la liste de ce qui manque ; article publié puis disparu d'Odoo → orphelin, invisible
- [X] T010 Transformer `src/domaine/catalogue.ts` en dossier `src/domaine/catalogue/` : `prix.ts` (`prixTtc`, `mensualites`, `prixPourQuantite`), `publication.ts` (`peutPublier`, `articlesPublies`, `cheminFiche`, slugs et anciennes adresses), lecture mise en cache des articles et disponibilités (étiquettes `catalogue`, `prix`, `stock` ; disponibilité 1 minute en mode réel, R5) ; cartes, fiches, listes et recherche lisent la disponibilité par cette seule lecture, plus par la liste des références de F01 en cache 5 minutes ; garder l'export utilisé par F01
- [X] T011 Remplacer `cheminArticle` (ancre de F01) par `cheminFiche` dans `src/domaine/familles.ts`, `src/domaine/navigation.ts` et `src/domaine/recherche/index.ts` ; limiter l'index de recherche aux articles publiés (US6-3)
- [X] T012 [P] Créer les composants de base dans `src/ui/catalogue/` : `Prix.tsx` (HT en Semibold, TTC en complément moins appuyé, « à partir de »), `Disponibilite.tsx` (disponible, délai X jours, indisponible, information indisponible), `PhotoProduit.tsx` (`next/image`, texte de remplacement, emplacement provisoire de la charte)

**Checkpoint** : contrat d'Odoo étendu et testé, contenus de départ publiés, domaine prêt.

---

## Phase 3: User Story 1 - Parcourir une catégorie (Priority: P1) 🎯 MVP

**Goal** : pages catégorie avec cartes, filtres et tri.

**Independent Test** : ouvrir chaque catégorie, appliquer chaque filtre, ouvrir une fiche depuis une carte.

### Tests for User Story 1

- [X] T013 [P] [US1] Écrire `tests/unit/catalogue/categories.test.ts` : seuls les articles publiés et non orphelins ; filtres marque, type (sous-catégorie) et disponibilité combinables ; nombre de résultats ; tri par ordre de l'administrateur ou prix ; article proposé seulement en mise à disposition → prix mensuel « à partir de »
- [X] T014 [P] [US1] Écrire `tests/e2e/f03/categories.spec.ts` : cartes (photo ou emplacement, marque, nom, prix HT et TTC, « Disponible en location », délai ou indisponible) ; filtres appliqués, résultat annoncé, filtres retirables, « Tout retirer » ; aucun résultat → message ; filtres dans l'adresse (fonctionnent sans JavaScript) ; carte → fiche ; catégorie sans article publié → introduction et invitation à nous contacter ; **3 clics au plus depuis l'accueil pour chaque article publié** (SC-004) ; axe-core ; clavier

### Implementation for User Story 1

- [X] T015 [US1] Créer `src/domaine/catalogue/categories.ts` : `listerCategorie(categorie, filtres)` selon [contracts/domaine.md](contracts/domaine.md) (cartes, filtres disponibles, total, `indisponible` si le connecteur est injoignable)
- [X] T016 [P] [US1] Créer `src/ui/catalogue/CarteProduit.tsx` et `src/ui/catalogue/Filtres.tsx` (formulaire GET dans l'adresse, mise à jour sans rechargement complet avec JavaScript, compteur `aria-live`, filtres actifs retirables)
- [X] T017 [US1] Remplacer les pages de famille de F01 par les pages catégorie : `app/(public)/holter-ecg/page.tsx`, `holter-ecg/ecg-de-repos/page.tsx`, `holter-tensionnel/page.tsx`, `epreuve-effort/page.tsx`, `accessoires-consommables/page.tsx` (introduction de `contenus/`, filtres, cartes) ; mettre à jour `/catalogue`, les tuiles et méga-menus de F01 vers les fiches

**Checkpoint** : les cinq catégories se parcourent et se filtrent.

---

## Phase 4: User Story 2 - Choisir sa formule sur une fiche équipement (Priority: P1)

**Goal** : fiche équipement avec sélecteur de formule et ajout au panier.

**Independent Test** : passer d'une formule à l'autre sans rechargement, changer de configuration, partager l'adresse, ajouter au panier.

### Tests for User Story 2

- [X] T018 [P] [US2] Écrire `tests/unit/catalogue/panier.test.ts` : `ajouterAuPanier` crée le panier à la demande (cookie signé pour un visiteur, compte s'il est connecté) ; quantités cumulées pour une même référence et formule ; « indisponible » refusé ; « délai X jours » accepté avec le délai rappelé ; prix changé depuis l'affichage signalé ; connecteur injoignable → refus motivé ; panier anonyme inactif depuis 30 jours supprimé
- [X] T019 [P] [US2] Écrire `tests/e2e/f03/fiche-equipement.spec.ts` : galerie, marque, nom, description, disponibilité ; pilules au clavier ; changement de formule et de configuration sans rechargement en moins d'une seconde (SC-002), annoncé aux lecteurs d'écran ; formule absente non proposée ; adresse `?formule=…&config=…` rouverte sur la même formule ; mise à disposition (1er mois, mois suivants, pack, kit) ; financement (mensualités par durée, mention) ; mensualité forcée du Dr Delvaux-Arnoux une fois connecté, pas pour un autre ; ajout au panier non connecté → confirmation, ligne sur `/panier` ; boutons mise à disposition et financement → contact avec motif ; axe-core

### Implementation for User Story 2

- [X] T020 [US2] Créer `src/domaine/catalogue/fiches.ts` : `lireFiche(categorie, slug, compte?)` (fiche équipement ou consommable, redirection d'un ancien slug, article retiré, prix client et mensualités forcées du client connecté, **lus à chaque affichage hors du cache partagé** : la partie commune de la fiche est mise en cache, jamais les montants propres à un client, FR-046)
- [X] T021 [US2] Créer `src/domaine/catalogue/panier.ts` (`panierCourant`, `ajouterAuPanier`, `lignesPanier`) et l'action serveur `src/actions/panier.ts` (D1) ; déclarer le cookie du panier (nécessaire au service, sans consentement) dans `contenus/cookies.md` ; purge des paniers anonymes dans `src/file-attente/travailleurs.ts`
- [X] T022 [P] [US2] Créer `src/ui/catalogue/SelecteurFormule.tsx` (pilules `radiogroup`, panneau `aria-live`, adresse mise à jour par `history.replaceState`), `src/ui/catalogue/Galerie.tsx` et `src/ui/catalogue/AjoutPanier.tsx` (confirmation `role="status"` sans quitter la page)
- [X] T023 [US2] Créer un dossier `[slug]` par catégorie (`app/(public)/holter-ecg/[slug]/`, `holter-ecg/ecg-de-repos/[slug]/`, `holter-tensionnel/[slug]/`, `epreuve-effort/[slug]/`, `accessoires-consommables/[slug]/`), chacun rendant le composant commun `src/ui/catalogue/Fiche.tsx` ; `ecg-de-repos` réservé parmi les slugs de Holter ECG ; fiche équipement ; montants propres au client rendus à part, hors cache partagé (C1) ; article retiré → « Ce produit n'est plus proposé » et lien vers la catégorie (statut 410) ; ancien slug → redirection permanente ; métadonnées (titre, description)
- [X] T024 [US2] Remplacer `app/(public)/panier/page.tsx` : lignes en lecture seule (article, formule, quantité, prix en vigueur, délai), mention « la commande arrive bientôt » ; panier vide → lien vers le catalogue

**Checkpoint** : on choisit sa formule et on ajoute au panier.

---

## Phase 5: User Story 3 - Commander un consommable rapidement (Priority: P1)

**Goal** : fiche consommable avec conditionnements, dégressifs et ajout rapide.

**Independent Test** : changer de conditionnement et de quantité, vérifier le prix, ajouter au panier depuis la fiche.

### Tests for User Story 3

- [X] T025 [P] [US3] Écrire `tests/e2e/f03/consommables.spec.ts` : prix unitaire et par lot, conditionnements, paliers affichés ; quantité augmentée → prix unitaire et total mis à jour ; quantité supérieure au stock → quantité disponible et délai pour le reste ; ajout rapide avec confirmation ; équipements compatibles → leurs fiches ; consommable compatible trouvé depuis un équipement et ajouté en moins de 60 secondes (SC-006) ; axe-core

### Implementation for User Story 3

- [X] T026 [P] [US3] Créer `src/ui/catalogue/ChoixConditionnement.tsx` (conditionnement, quantité, paliers, total, `aria-live`)
- [X] T027 [US3] Ajouter la fiche consommable à la route des fiches (selon le type d'article d'Odoo) : prix, conditionnements, paliers, ajout rapide, équipements compatibles (compatibilités d'Odoo et du site) ; ni points d'assistance (F06) ni « Commander à nouveau » (F04) tant que ces modules ne sont pas livrés

**Checkpoint** : les trois user stories P1 sont livrées (MVP du catalogue).

---

## Phase 6: User Story 4 - S'informer avant de décider (Priority: P2)

**Goal** : onglets d'information et produits associés.

**Independent Test** : ouvrir chaque onglet à la souris et au clavier, télécharger un document, ajouter un consommable compatible.

### Tests for User Story 4

- [X] T028 [P] [US4] Écrire `tests/e2e/f03/onglets.spec.ts` : onglets au clavier (flèches, Origine, Fin) sans rechargement ; onglet sans contenu absent ; document avec type et taille, consultable ; consommables compatibles avec prix et ajout rapide ; produits associés ; mobile 390 px lisible, cibles de 44 px ; axe-core

### Implementation for User Story 4

- [X] T029 [P] [US4] Créer `src/ui/catalogue/Onglets.tsx` (motif « tabs » de l'ARIA) et le contenu de chaque onglet : caractéristiques (liste libellé/valeur), contenu du coffret, consommables compatibles (prix, ajout rapide), logiciel associé, documents (titre, type, taille), garantie
- [X] T030 [US4] Ajouter onglets et « Produits associés » (choisis par l'administrateur, sinon déduits des compatibilités) à la fiche équipement ; servir les documents PDF du stockage avec le bon type et un nom de fichier lisible

---

## Phase 7: User Story 5 - Voir une disponibilité fiable (Priority: P2)

**Goal** : disponibilité exacte, par formule, et comportement en cas de panne.

**Independent Test** : passer un article en rupture dans l'écran de démonstration et vérifier cartes, fiches et listes ; couper Odoo.

### Tests for User Story 5

- [X] T031 [P] [US5] Écrire `tests/e2e/f03/disponibilite.spec.ts` : rupture saisie dans **Démonstration → Stocks** visible en moins d'une minute sur la carte, la fiche, les consommables compatibles et la recherche (SC-013) ; prix modifié dans **Démonstration → Prix** visible en moins d'une minute (US6-2) ; pack indisponible quand l'un de ses composants l'est ; parc de location épuisé mais vente disponible → disponibilité indiquée par formule ; « indisponible » → pas d'ajout, contact proposé ; « délai X jours » → ajout et délai rappelé ; panne d'Odoo simulée → fiche consultable, ni prix ni disponibilité affirmés, invitation à réessayer (rétablir la panne en fin de test **et attendre la confirmation**)

### Implementation for User Story 5

- [X] T032 [US5] Afficher la disponibilité par formule sur la fiche et les cartes (FR-032), y compris celle des packs ; vérifier que les écrans de démonstration Stocks et Prix invalident les étiquettes `stock` et `prix` ; état « information momentanément indisponible » sur toutes les pages de F03

---

## Phase 8: User Story 6 - Tenir les contenus du catalogue à jour (Priority: P2)

**Goal** : back-office du catalogue : rédaction, fichiers, publication.

**Independent Test** : rédiger et publier un article, vérifier son affichage et sa présence dans la recherche ; aucun prix ni stock modifiable.

### Tests for User Story 6

- [X] T033 [P] [US6] Écrire `tests/e2e/f03/back-office-catalogue.spec.ts` : liste des articles d'Odoo avec l'état de leur contenu ; données d'Odoo en lecture seule (« se gère dans Odoo ») et aucun champ de prix, stock, référence, configuration ou formule ; publication refusée avec la liste des manques ; rédaction (textes, photo et texte de remplacement obligatoire, PDF ≤ 10 Mo, compatibilités, produits associés, sous-catégorie, ordre) puis publication → visible dans la catégorie et la recherche ; retrait → invisible ; changement de slug → l'ancienne adresse redirige ; journal ; commercial en lecture, support refusé ; contenus d'un article rédigés et publiés en moins de 10 minutes (SC-008) ; axe-core

### Implementation for User Story 6

- [X] T034 [US6] Compléter `src/domaine/catalogue/publication.ts` : `enregistrerContenu`, `publier`, `retirer` (journal avec auteur et date, FR-040 ; invalidation de l'étiquette `catalogue`) ; marquage des orphelins à la lecture du catalogue
- [X] T035 [US6] Étendre `src/lib/stockage.ts` aux documents PDF (type réel vérifié, 10 Mo au plus, D4) en gardant la limite des images
- [X] T036 [US6] Créer `app/(back-office)/admin/catalogue/page.tsx` (articles par catégorie, état, recherche) et `app/(back-office)/admin/catalogue/[reference]/page.tsx` (données d'Odoo en lecture seule, formulaire des contenus, publier ou retirer avec les manques) ; rôles admin (écriture) et commercial (lecture) ; « Catalogue » ajouté à la navigation du back-office
- [X] T037 [P] [US6] Créer `app/(back-office)/admin/catalogue/sous-categories/page.tsx` (par catégorie, ordre ; suppression refusée si utilisée)

---

## Phase 9: User Story 7 - Demander un devis pour un autre ECG de repos (Priority: P3)

**Goal** : formulaire « Vous cherchez un autre modèle ? ».

**Independent Test** : envoyer une demande et vérifier qu'elle parvient à l'équipe.

### Tests for User Story 7

- [X] T038 [P] [US7] Écrire `tests/e2e/f03/devis.spec.ts` : champ manquant signalé, saisie conservée, rien d'envoyé ; envoi complet → confirmation, `DemandeDevis` « devis ECG de repos » et notification dans la boîte de démonstration ; coordonnées préremplies pour un client connecté ; anti-robots et limite d'envoi ; aucun champ de patient ; axe-core

### Implementation for User Story 7

- [X] T039 [US7] Créer `src/domaine/catalogue/devis.ts` (`envoyerDemandeDevis` : validation, protections et limites de F01, enregistrement, notification à l'équipe), `src/ui/catalogue/FormulaireDevis.tsx` et l'intégrer à `app/(public)/holter-ecg/ecg-de-repos/page.tsx`

---

## Phase 10: User Story 8 - Découvrir les services (Priority: P3)

**Goal** : quatre pages services avec offre, tarif, badge et action.

**Independent Test** : ouvrir chaque page service et suivre son bouton.

### Tests for User Story 8

- [X] T040 [P] [US8] Écrire `tests/e2e/f03/services.spec.ts` : quatre pages (offre, bénéfices, tarif HT s'il est renseigné, bouton) ; hébergement avec « En préparation » et sans souscription ; badge retiré au back-office → disparaît ; bouton d'un module non livré → contact avec motif présélectionné ; axe-core

### Implementation for User Story 8

- [X] T041 [US8] Compléter `app/(public)/services/hebergement-donnees-sante/page.tsx`, `services/assistance/page.tsx`, `financement/page.tsx` et créer `services/installation-formation/page.tsx` (texte, bénéfices, tarif HT en paramètre avec TTC à 20 % en complément, badge, action) ; ajouter la page aux liens de F01
- [X] T042 [P] [US8] Créer `app/(back-office)/admin/catalogue/services/page.tsx` : badge et tarifs des pages services, mention du financement (administrateur, historique des paramètres)

---

## Phase 11: Polish & Cross-Cutting Concerns

- [X] T043 [P] Ajouter les pages catégorie, une fiche équipement, une fiche consommable, les pages services et `/panier` à `tests/e2e/no-egress.spec.ts`, `tests/e2e/accessibilite-charte.spec.ts` et au contrôle des largeurs de 320 à 1 920 px (SC-011) ; vérifier qu'aucun lien du catalogue ne mène à une erreur (SC-012) ni n'affiche « prix sur demande » (SC-005)
- [X] T044 [P] Ajouter une fiche équipement et une fiche consommable aux pages mesurées par `scripts/lighthouse.ts` (affichage principal < 2 s en 4G mobile)
- [X] T045 [P] Mettre à jour `docs/demonstration.md` (catalogue, formules, back-office du catalogue) et `tests/e2e/parcours/README.md`
- [X] T046 Dérouler [quickstart.md](quickstart.md) et corriger les écarts ; préparer la séance d'essai avec des médecins (SC-007 : 9 sur 10 identifient les trois façons de s'équiper)
- [X] T047 Vérifier la conformité finale : `npm run typecheck`, `npm run lint`, `npm run check:contrast`, `npm test`, `npm run test:e2e` (ordinateur et mobile), `npm run test:lighthouse` en local, puis en intégration continue

---

## Dependencies & Execution Order

- **Setup** puis **Foundational** : bloquent tout (T007 publie les contenus de départ dont dépendent toutes les pages).
- **US1** (catégories) : MVP ; **US2** (fiche équipement) après US1 (cartes → fiche) ; **US3** (consommable) après US2 (route des fiches, ajout au panier).
- **US4** et **US5** après US2 ; **US6** après la phase 2 (indépendante des pages publiques, mais vérifiée avec elles) ; **US7** après US1 ; **US8** après la phase 2.
- **Polish** en dernier.

```text
Setup → Foundational ─┬─ US1 ─┬─ US2 ─┬─ US3
                      │       │       ├─ US4
                      │       │       └─ US5
                      │       └─ US7
                      ├─ US6
                      └─ US8
                                   → Polish
```

## Parallel Example: Foundational

```text
T003 tests de contrat · T008 prix · T009 publication · T012 composants de base
```

## Parallel Example: après US2

```text
US3 (T025–T027) · US4 (T028–T030) · US5 (T031–T032)
```

## Implementation Strategy

1. Phases 1 et 2.
2. **MVP** : US1, US2 puis US3 — catégories, fiche équipement avec formules, consommables ;
   valider SC-002, SC-004, SC-005, SC-006.
3. US4, US5, US6 (P2), puis US7, US8 (P3).
4. Polish.

**Remarque** : le panier complet (modification, fusion à la connexion, commande) est livré
par F04, le parcours de mise à disposition par F05, les points d'assistance par F06 ; F03
enregistre les lignes de panier et renvoie vers le contact en attendant.
