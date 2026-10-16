---
description: "Liste des tâches — F01 Socle, navigation et page d'accueil"
---

# Tasks: F01 — Socle, navigation et page d'accueil

**Input**: documents de conception de `specs/001-socle-navigation-accueil/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md) ;
socle de F11 livré (registre des connecteurs, base du site, authentification, tests).

**Tests** : exigés par la constitution (principe X) et par les critères de la spec (SC-001 à
SC-012). Ils sont écrits **avant** l'implémentation qu'ils vérifient.

**Organisation** : par user story, pour que chacune soit réalisable et vérifiable seule.

## Format : `[ID] [P?] [Story] Description`

- **[P]** : réalisable en parallèle (fichiers différents, sans dépendance non terminée)
- **[Story]** : user story concernée (US1 à US6)

## Conventions communes

Celles de F11 restent valables : TypeScript strict ; textes en français au vouvoiement ;
uniquement les tokens `--ec-*` et le thème (`styles/theme.css`) ; aucun import d'implémentation
de connecteur hors de `src/connecteurs/` ; aucune requête vers un service tiers ; cibles de
44 px, focus visible, animations coupées en mode réduit ; chaque page nouvelle ajoutée aux
listes de `tests/e2e/no-egress.spec.ts` et `tests/e2e/accessibilite-charte.spec.ts`.

---

## Phase 1: Setup

- [X] T001 Ajouter les dépendances `marked` (rendu Markdown côté serveur) et `isomorphic-dompurify` (nettoyage des SVG et du HTML) avec versions exactes dans `package.json`
- [X] T002 [P] Ajouter `STORAGE_DIR` à `.env.example` (dossier des fichiers téléversés, `./stockage` en local) et `stockage/` à `.gitignore`
- [X] T003 [P] Créer le dossier `contenus/` avec un fichier Markdown par page de présentation (`catalogue.md`, `holter-ecg.md`, `ecg-de-repos.md`, `holter-tensionnel.md`, `epreuve-effort.md`, `accessoires-consommables.md`, `services.md`, `hebergement-donnees-sante.md`, `assistance.md`, `financement.md`, `mise-a-disposition.md`, `qui-sommes-nous.md`) et par page légale (`mentions-legales.md`, `cgv.md`, `cgu.md`, `confidentialite.md`, `cookies.md`) : brouillons sobres au vouvoiement (D2) ; pages légales marquées « Texte en cours de validation » (D5)

---

## Phase 2: Foundational (prérequis bloquants)

**⚠️ CRITICAL** : aucune user story ne commence avant la fin de cette phase.

### Base du site

- [X] T004 Compléter `prisma/site/schema.prisma` selon [data-model.md](data-model.md) : champs `lien`, `ordre`, `badge`, `fond` (`pale`, `blue-soft`, `lin`, `mint`), `typeActualite` (`actualite`, `nouveau_produit`, `nouvelle_offre`), `publieLe` sur `Contenu` ; nouveaux modèles `Marque` (nom unique, logo facultatif, familles `holter-ecg`/`mapa`/`effort`, ordre, visible), `ElementMenu` (entrée parmi les 7, type `produit_phare` ou `lien_rapide`, `defaultCode`, libellé, lien, ordre), `InscriptionNewsletter` (email unique, état `en_attente`/`confirmee`/`desinscrite`/`expiree`, `empreinteJeton`, dates, `textePresente`), `LimiteEnvoi` (clé, début de fenêtre, compte) ; migration par `scripts/nouvelle-migration.sh site f01_contenus`
- [X] T005 Créer les contenus initiaux dans `prisma/site/seed/contenus-initiaux.ts` : les 6 tuiles de FR-017 (titres, phrases, liens de [contracts/pages-et-liens.md](contracts/pages-et-liens.md), fonds de la charte, badge « En préparation » sur l'hébergement), les 8 marques de la brochure sans logo (D4), les paramètres de [data-model.md](data-model.md) §1 (motifs, texte de l'offre de bienvenue, badges) ; création seulement s'ils n'existent pas (conservés à la réinitialisation) ; appeler ce remplissage depuis `prisma/demo/seed/remplissage.ts`
- [X] T006 Ajouter `InscriptionNewsletter` et `LimiteEnvoi` au périmètre de la réinitialisation dans `src/connecteurs/demonstration.ts` et à [../011-connecteurs-base-demonstration/data-model.md](../011-connecteurs-base-demonstration/data-model.md) §4

### Lecture des contenus et cache

- [X] T007 [P] Créer `src/domaine/contenus.ts` : lecture des contenus publiés (bandeau visible selon `etat`, `debut`, `fin` et `ordre` ; tuiles ; actualités triées par `publieLe` décroissant), des paramètres de F01 et des marques, mise en cache avec l'étiquette `contenus` (ajouter cette étiquette à `src/lib/cache.ts`)
- [X] T008 [P] Créer `src/domaine/liens.ts` : liste des chemins internes existants (d'après [contracts/pages-et-liens.md](contracts/pages-et-liens.md)) et fonction `lienValide(lien)` (chemin interne existant ou adresse `https://`), utilisée par le mini back-office
- [X] T009 [P] Créer `src/lib/stockage.ts` (dépôt d'un fichier image : types PNG, JPEG, WebP, SVG nettoyé par `isomorphic-dompurify` ; 2 Mo au plus ; nom aléatoire ; dossier `STORAGE_DIR`) et la route `app/stockage/[...chemin]/route.ts` qui sert ces fichiers avec mise en cache, en refusant toute sortie du dossier, avec les en-têtes `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox` et `X-Content-Type-Options: nosniff`, et en pièce jointe pour un SVG ouvert directement (R8)
- [X] T010 [P] Créer `src/domaine/textes.ts` : lecture d'un fichier de `contenus/` et rendu Markdown en HTML sûr (`marked` puis `isomorphic-dompurify`), et le composant `src/ui/TexteRiche.tsx` qui l'affiche aux styles de la charte

### Connecteur Odoo : opération « Lister les références »

- [X] T011 Ajouter l'opération `catalogue.listerReferences` au contrat dans [../011-connecteurs-base-demonstration/contracts/odoo.md](../011-connecteurs-base-demonstration/contracts/odoo.md) §1 selon [data-model.md](data-model.md) §3
- [X] T012 Écrire le test de contrat dans `tests/contract/odoo/catalogue.test.ts` : une ligne par variante, avec référence interne, référence fabricant quand elle existe, nom, marque, type, catégorie, configuration, prix HT et disponibilité ; `98-0239-22` présent
- [X] T013 Déclarer `listerReferences()` dans `src/connecteurs/odoo/interfaces/catalogue.ts` et l'implémenter dans `src/connecteurs/odoo/demo/catalogue.ts` (l'emplacement réel lève déjà `ConfigurationIncomplete`)

### Mise en page publique

- [X] T014 Créer `app/(public)/layout.tsx` (emplacements du bandeau promotionnel, de l'en-tête, du contenu, du pied de page et du panneau cookies) ; déplacer la page d'accueil provisoire `app/page.tsx` vers `app/(public)/page.tsx`
- [X] T015 [P] Créer `app/(public)/not-found.tsx` et `app/(public)/error.tsx` à la charte : accueil, recherche, familles de produits, sans détail technique (R12)
- [X] T016 [P] Améliorer le chargement de la police dans `styles/fonts.css` et `app/layout.tsx` : police de repli aux métriques ajustées (`size-adjust`, `ascent-override`, `descent-override`) pour que le passage à Inter ne provoque ni décalage ni nouveau rendu visible (R11)

**Checkpoint** : socle de F01 prêt.

---

## Phase 3: User Story 1 — Comprendre toute l'offre depuis l'accueil (Priority: P1) 🎯 MVP

**Goal** : page d'accueil en 8 sections et pages de présentation des familles et services.

**Independent Test** : ouvrir l'accueil sur ordinateur et mobile, vérifier l'ordre des 8
sections, cliquer sur chacune des 6 tuiles (SC-001).

### Tests

- [X] T017 [P] [US1] Écrire `tests/e2e/f01/accueil.spec.ts` : ordre des 8 sections (FR-015), contenu du héros (FR-016), 6 tuiles menant chacune à sa page en un clic (SC-001), 3/2/1 tuiles par ligne à 1 280, 820 et 390 px (FR-018), badges « En préparation » (FR-021), bloc contact limité à « Régis Andrieu, fondateur » sans ligne vide (US1-6), section actualités masquée sans actualité, axe-core
- [X] T018 [P] [US1] Écrire `tests/e2e/f01/pages-presentation.spec.ts` : chaque page de [contracts/pages-et-liens.md](contracts/pages-et-liens.md) s'affiche, sans erreur ; les pages de famille listent les articles du connecteur avec prix HT (FR-038) ; axe-core

### Implémentation

- [X] T019 [P] [US1] Créer `src/ui/accueil/Heros.tsx` : fond eucalyptus pâle, logo empilé, titre, « (hors imagerie) », grands points décoratifs, boutons « Découvrir le catalogue » (principal) et « Demander une mise à disposition » (secondaire)
- [X] T020 [P] [US1] Créer `src/ui/accueil/AccesRapide.tsx` et `src/ui/accueil/Tuile.tsx` : 6 tuiles carrées (fond d'encart, pastille des trois points, titre, phrase, lien, badge), grille 3/2/1, textes longs sans déformation
- [X] T021 [P] [US1] Créer `src/ui/accueil/Equipements.tsx` (3 cartes de familles, emplacements photo provisoires) et `src/ui/accueil/Marques.tsx` (tuiles uniformes, logos en niveaux de gris puis en couleur au survol et au focus, nom en texte sans logo)
- [X] T022 [P] [US1] Créer `src/ui/accueil/OffreDigitale.tsx` (achat direct, financement, mise à disposition au mois, pack dépannage express, logiciel Cloud avec badge, outils en ligne avec liens WhatsApp de `src/lib/contact-whatsapp.ts`), chaque élément menant à la destination de [contracts/pages-et-liens.md](contracts/pages-et-liens.md) ; créer la section `#depannage-express` de la page mise à disposition et la section `#aide` de la page assistance
- [X] T023 [P] [US1] Créer `src/ui/accueil/OffreBienvenue.tsx` (encart lin, texte du paramètre `accueil.offre_bienvenue`, bouton d'inscription) et `src/ui/accueil/ServiceFidelite.tsx` (trois cercles numérotés de taille croissante reliés par des flèches fines ; engagements de réactivité masqués si vides)
- [X] T024 [P] [US1] Créer `src/ui/accueil/Actualites.tsx` (plus récentes d'abord, image avec texte de remplacement, section absente si vide) et `src/ui/accueil/BlocContact.tsx` (fond sombre, « Régis Andrieu, fondateur », lignes email, téléphone et adresse masquées si vides)
- [X] T025 [US1] Assembler l'accueil dans `app/(public)/page.tsx` à partir de `src/domaine/contenus.ts`
- [X] T026 [P] [US1] Créer `src/ui/PagePresentation.tsx` et `src/ui/CarteArticle.tsx` (nom, marque, prix HT « à partir de », disponibilité, mention « prix inventé » en démonstration ; sans lien vers une fiche tant que F03 n'existe pas) avec un message sobre si le connecteur est indisponible
- [X] T027 [US1] Créer les pages de familles `app/(public)/catalogue/page.tsx`, `holter-ecg/page.tsx`, `holter-ecg/ecg-de-repos/page.tsx`, `holter-tensionnel/page.tsx`, `epreuve-effort/page.tsx`, `accessoires-consommables/page.tsx` (texte de `contenus/` + articles de `registre.odoo().catalogue.listerArticles`, cache `catalogue`)
- [X] T028 [US1] Créer les pages de services `app/(public)/services/page.tsx`, `services/hebergement-donnees-sante/page.tsx`, `services/assistance/page.tsx`, `financement/page.tsx`, `mise-a-disposition/page.tsx` ; les boutons de demande mènent au formulaire de contact avec le motif présélectionné, et la page `app/(public)/panier/page.tsx` (« Votre panier est vide »)
- [X] T029 [US1] Créer `app/(public)/[legale]/page.tsx` pour les cinq pages légales (paramètres statiques, 404 pour tout autre nom)

**Checkpoint** : l'accueil et toutes ses destinations existent.

---

## Phase 4: User Story 2 — Naviguer depuis n'importe quelle page (Priority: P1)

**Goal** : bandeau promotionnel, barre de navigation fixe, méga-menus, menu mobile, pied de page.

**Independent Test** : depuis trois pages, ouvrir chaque méga-menu à la souris, au clavier et
au toucher ; vérifier chaque lien.

### Tests

- [X] T030 [P] [US2] Écrire `tests/e2e/f01/navigation.spec.ts` : barre fixe au défilement, logo vers l'accueil, 7 entrées dans l'ordre de FR-003, recherche, panier sans pastille, « Mon compte / Connexion » ; méga-menus ouverts au survol, au clic, au clavier (Entrée, flèche bas) et au toucher, fermés par Échap ou clic extérieur avec retour du focus (US2-3, US2-4) ; « ECG de repos » dans « Holter ECG » (FR-009) ; menu mobile au même contenu, cibles de 44 px (US2-5)
- [X] T031 [P] [US2] Écrire `tests/e2e/f01/bandeau-promo.spec.ts` : absent sans message actif, sans espace vide ; présent et non masquable avec un message actif ; rotation de deux messages, bouton de pause, rotation suspendue avec `reducedMotion: "reduce"` (US2-7, US2-8)
- [X] T032 [P] [US2] Écrire `tests/unit/bandeau.test.ts` : visibilité selon l'état, les dates de début et de fin et l'ordre
- [X] T033 [P] [US2] Écrire `tests/e2e/f01/liens-et-largeurs.spec.ts` : tous les liens de l'en-tête (méga-menus compris), de l'accueil et du pied de page répondent sans erreur (SC-012) ; aucune page de F01 n'a de défilement horizontal à 320, 390, 820, 1 280 et 1 920 px (SC-006) ; zoom du texte à 200 % sans contenu tronqué

### Implémentation

- [X] T034 [US2] Créer `src/domaine/navigation.ts` : les 7 entrées, leurs sous-catégories issues de `registre.odoo().catalogue.listerCategories` (ECG de repos rattachée à Holter ECG), les produits phares et liens rapides de `ElementMenu` (produits disparus ignorés) ; cache `catalogue` + `contenus`
- [X] T035 [P] [US2] Créer `src/ui/BandeauPromo.tsx` (composant client : rotation toutes les 6 s, bouton « Mettre en pause / Reprendre », suspension si `prefers-reduced-motion`, pas d'annonce automatique)
- [X] T036 [US2] Créer `src/ui/en-tete/BarreNavigation.tsx` et `src/ui/en-tete/MegaMenu.tsx` (composants clients : barre `sticky`, logo horizontal, entrées en boutons `aria-expanded`/`aria-controls`, ouverture au survol avec délai de 150 ms, au clic, au clavier et au toucher, fermeture par Échap, clic extérieur ou sortie, retour du focus ; panneau moins haut et moins large que la page) (R2)
- [X] T037 [US2] Créer `src/ui/en-tete/MenuMobile.tsx` : icône « Menu », panneau plein écran en accordéons au même contenu, défilement de la page bloqué, fermeture au clavier
- [X] T038 [P] [US2] Créer `src/ui/PiedDePage.tsx` : fond sombre, logo blanc, liens (contact, qui sommes-nous, mentions légales, CGV, CGU, confidentialité, « Gestion des cookies »), emplacement du formulaire newsletter (US5)
- [X] T039 [US2] Brancher bandeau, en-tête et pied de page dans `app/(public)/layout.tsx`, sous le bandeau de démonstration de F11

**Checkpoint** : navigation complète au clavier, à la souris et au toucher.

---

## Phase 5: User Story 3 — Choisir ses cookies à la première visite (Priority: P2)

**Goal** : bandeau de consentement conforme CNIL, sans service tiers.

**Independent Test** : session vierge, bandeau visible, refus, aucun traceur non essentiel (SC-007).

- [X] T040 [P] [US3] Écrire `tests/e2e/f01/cookies.spec.ts` : **sans finalité déclarée** (situation actuelle, D3), bandeau d'information à la première visite, « J'ai compris » le ferme pour 6 mois, aucun cookie hormis les strictement nécessaires, « Gestion des cookies » mène à la page Cookies ; **avec une finalité de test déclarée**, « Tout accepter » et « Tout refuser » au même niveau, même apparence, un seul geste, rien de déposé avant le choix, le choix est conservé et modifiable par finalité ; utilisable au clavier seul (SC-007, SC-011)
- [X] T041 [P] [US3] Créer `src/domaine/consentement.ts` : lecture et écriture du cookie `ec_consentement` (version, date, finalités « Mesure d'audience » et « Contenus tiers », 6 mois, `SameSite=Lax`), redemande à expiration ou au changement de version
- [X] T042 [US3] Créer `src/ui/PanneauCookies.tsx` : mode « information » tant qu'aucune finalité n'est déclarée dans `src/domaine/consentement.ts` (texte sobre, « J'ai compris », lien vers la page Cookies), mode « consentement » sinon (« Tout accepter », « Tout refuser », « Personnaliser ») ; accessible, sans bloquer la lecture de la page ; et `src/ui/SiConsentement.tsx` (n'affiche un contenu tiers qu'après accord de sa finalité)
- [X] T043 [US3] Brancher le panneau dans `app/(public)/layout.tsx` et le lien « Gestion des cookies » du pied de page (page Cookies en mode information, panneau de choix en mode consentement) ; décrire les cookies réellement utilisés dans `contenus/cookies.md` ([data-model.md](data-model.md) §4)

---

## Phase 6: User Story 4 — Trouver par la recherche (Priority: P2)

**Goal** : suggestions instantanées groupées par type, références exactes en premier.

**Independent Test** : nom partiel puis référence fabricant exacte (SC-008, SC-009).

### Tests

- [X] T044 [P] [US4] Écrire `tests/unit/recherche-normalisation.test.ts` : casse, accents, tirets, points, espaces et barres obliques ignorés (« 98-0239-22 » = « 98 0239 22 » = « 98023922 » ; « électrode » = « ELECTRODE ») (FR-012)
- [X] T045 [P] [US4] Écrire `tests/unit/recherche-classement.test.ts` : chaque référence interne et fabricant de la base de démonstration placée en première position quand elle est saisie exactement (100 %, SC-009) ; groupes vides omis ; 8 éléments par groupe au plus ; prix HT
- [X] T046 [P] [US4] Écrire `tests/e2e/f01/recherche.spec.ts` : suggestions après 2 caractères en moins d'une seconde (SC-008), navigation au clavier dans la liste (« combobox »), Entrée sur une suggestion, page `/recherche`, absence de résultat avec chemins alternatifs (FR-013), message si la recherche est indisponible (panne simulée d'Odoo)

### Implémentation

- [X] T047 [P] [US4] Créer `src/domaine/recherche/normaliser.ts` (texte et références) et `src/domaine/recherche/classer.ts` (exactitude de référence, début de nom, contenu ; groupement par type ; ordre des groupes de [contracts/recherche.md](contracts/recherche.md))
- [X] T048 [US4] Créer `src/domaine/recherche/index.ts` : index en mémoire reconstruit au plus toutes les 5 minutes à partir de `registre.odoo().catalogue.listerReferences` et des pages du site ; invalidé par l'écran de démonstration (`src/connecteurs/demonstration.ts`) ; état « indisponible » si le connecteur est en panne et qu'aucun index n'existe
- [X] T049 [US4] Créer la route `app/api/recherche/route.ts` selon [contracts/recherche.md](contracts/recherche.md) et la page `app/(public)/recherche/page.tsx`
- [X] T050 [US4] Créer `src/ui/en-tete/Recherche.tsx` (combobox WAI-ARIA, attente de 150 ms, annulation de la requête précédente, nombre de résultats annoncé, Échap pour fermer) et l'intégrer à la barre de navigation et au menu mobile

---

## Phase 7: User Story 5 — Contacter l'équipe et rester informé (Priority: P3)

**Goal** : page Qui sommes-nous / Contact, formulaire protégé, newsletter à double consentement.

**Independent Test** : envoyer un message et le retrouver dans la boîte de démonstration ;
s'inscrire à la newsletter et confirmer.

### Tests

- [X] T051 [P] [US5] Écrire `tests/e2e/f01/contact.spec.ts` : page Qui sommes-nous (équipe, expertise, partenariats, coordonnées masquées si vides) ; envoi valide avec confirmation et message dans la boîte de démonstration ; champ manquant signalé avec saisie conservée (US5-3) ; avertissement « aucune donnée de patient » (FR-031) ; motif présélectionné depuis la page mise à disposition ; sixième envoi de l'heure refusé
- [X] T052 [P] [US5] Écrire `tests/e2e/f01/newsletter.spec.ts` : inscription depuis le pied de page, email de confirmation dans la boîte de démonstration, inscription effective seulement après le lien, consentement historisé, lien de désinscription, même réponse pour une adresse déjà inscrite
- [X] T053 [P] [US5] Écrire `tests/unit/limites.test.ts` (fenêtre d'une heure, 5 envois, empreinte de l'adresse IP jamais en clair) et `tests/unit/newsletter.test.ts` (transitions, expiration à 7 jours, renvoi limité à un toutes les 10 minutes)

### Implémentation

- [X] T054 [P] [US5] Créer `src/domaine/limites.ts` : limite d'envois par empreinte d'adresse IP ; adresse lue dans `X-Forwarded-For` seulement si `TRUSTED_PROXY=1` (ajouté à `.env.example`), sinon adresse de connexion, à défaut par session (R6) ; et la tâche quotidienne de nettoyage dans `src/file-attente/travailleurs.ts`
- [X] T055 [US5] Créer `src/domaine/contact.ts` et l'action serveur du formulaire : validation, champ piège, délai minimal de 3 s, limite d'envois, enregistrement du message de contact, notification d'équipe par `registre.emailing()` au destinataire du paramètre `contact.destinataire_messages` (R6)
- [X] T056 [US5] Créer `app/(public)/qui-sommes-nous/page.tsx` et `src/ui/FormulaireContact.tsx` (motifs du paramètre `contact.motifs`, motif présélectionné par `?motif=`, erreurs reliées aux champs et annoncées, confirmation) ; quand le motif « Assistance » est choisi, afficher au-dessus du formulaire les boutons « Appeler » et « Écrire sur WhatsApp » (le SAV n'est pas géré par le site)
- [X] T057 [US5] Créer `src/domaine/newsletter.ts` (demande, jeton aléatoire dont seule l'empreinte est conservée, confirmation, désinscription, consentement historisé, `registre.emailing().mettreAJourContact`) et les modèles d'email `src/emails/modeles.tsx` « Confirmez votre inscription » et le pied de désinscription
- [X] T058 [US5] Créer `src/ui/FormulaireNewsletter.tsx` (consentement explicite, réponse identique dans tous les cas) dans le pied de page, et les pages `app/(public)/newsletter/confirmation/page.tsx` et `app/(public)/newsletter/desinscription/page.tsx`

---

## Phase 8: User Story 6 — Mettre à jour les contenus sans développeur (Priority: P3)

**Goal** : mini back-office des contenus de l'accueil et de l'en-tête.

**Independent Test** : modifier un message du bandeau, une tuile et une actualité, et les voir
sur le site en moins d'une minute (SC-003).

### Tests

- [X] T059 [P] [US6] Écrire `tests/e2e/f01/back-office-contenus.spec.ts` : chaque écran de [contracts/back-office-contenus.md](contracts/back-office-contenus.md) modifie le site public en moins d'une minute ; validations refusées avec l'explication (texte trop long, lien inexistant, image sans texte de remplacement) ; journal des actions ; accès refusé au support et à un client (US6-5) ; axe-core
- [X] T060 [P] [US6] Écrire `tests/unit/liens.test.ts` : liens internes existants acceptés, inconnus refusés, `https://` accepté, `javascript:` et `http://` refusés

### Implémentation

- [X] T061 [US6] Créer `app/(back-office)/admin/contenus/layout.tsx` (administrateurs uniquement) et `app/(back-office)/admin/contenus/page.tsx` (sommaire), et ajouter « Contenus » à la navigation du back-office
- [X] T062 [US6] Créer `app/(back-office)/admin/contenus/actions.ts` : actions serveur communes (vérification du rôle, validation, journal des actions avec valeurs avant et après, invalidation de l'étiquette `contenus` et de l'index de recherche si nécessaire)
- [X] T063 [P] [US6] Créer l'écran du bandeau `app/(back-office)/admin/contenus/bandeau/page.tsx` (ajout, modification, ordre, activation, dates)
- [X] T064 [P] [US6] Créer l'écran des tuiles `app/(back-office)/admin/contenus/tuiles/page.tsx` (6 tuiles, titre, phrase, lien, badge, fond, ordre)
- [X] T065 [P] [US6] Créer l'écran des actualités `app/(back-office)/admin/contenus/actualites/page.tsx` (création, modification, publication, retrait, image téléversée par `src/lib/stockage.ts`)
- [X] T066 [P] [US6] Créer l'écran des coordonnées et textes `app/(back-office)/admin/contenus/coordonnees/page.tsx` (email, téléphone, adresse, destinataire des messages, offre de bienvenue, engagements de réactivité, badges, motifs ; historique des paramètres de F11)
- [X] T067 [P] [US6] Créer l'écran des menus `app/(back-office)/admin/contenus/menus/page.tsx` (produits phares par référence vérifiée auprès du connecteur, liens rapides ; 4 + 4 au plus par entrée)
- [X] T068 [P] [US6] Créer l'écran des marques `app/(back-office)/admin/contenus/marques/page.tsx` (ajout, ordre, familles, visibilité, logo)

---

## Phase 9: Polish & Cross-Cutting Concerns

- [X] T069 [P] Ajouter toutes les pages de F01 aux listes de `tests/e2e/no-egress.spec.ts` et `tests/e2e/accessibilite-charte.spec.ts` (cibles de 44 px, focus visible, animations réduites, SC-005, SC-011)
- [X] T070 [P] Ajouter l'accueil, `/catalogue` et `/holter-ecg` à `scripts/lighthouse.ts`, et une étape Lighthouse (construction de production, démarrage, mesure) à `.github/workflows/ci.yml` ; objectif : élément principal en moins de 2 s en profil mobile 4G
- [X] T071 [P] Mettre à jour `docs/demonstration.md` (rubrique Contenus du back-office) et `tests/e2e/parcours/README.md`
- [X] T072 Dérouler [quickstart.md](quickstart.md) de bout en bout et corriger les écarts ; relecture visuelle de chaque page : aucun visuel interdit par la charte (cœur, tracé ECG, pictogramme médical cliché, dégradé vif, ombre lourde, photo de stock générique, FR-045) ; préparer la séance d'essai avec la porteuse du projet (SC-003 : modification d'un contenu en moins de 5 minutes ; SC-010 : test avec des médecins)
- [ ] T073 Vérifier la conformité finale : `npm run typecheck`, `npm run lint`, `npm run check:contrast`, `npm test`, `npm run test:e2e`, `npm run test:lighthouse` passent en local puis en intégration continue

---

## Dependencies & Execution Order

- **Setup (Phase 1)** puis **Foundational (Phase 2)** : bloquent toutes les user stories.
- **US1** (accueil, pages) et **US2** (navigation) : après la phase 2 ; US2 relie les pages
  créées par US1, mais se teste sur les pages déjà existantes. Ensemble, elles forment le MVP.
- **US3** (cookies) : après la phase 2 ; indépendante.
- **US4** (recherche) : après T011 à T013 (opération du connecteur) ; s'intègre à l'en-tête de US2 (T050).
- **US5** (contact, newsletter) : après la phase 2 ; le formulaire newsletter s'insère dans le pied de page de US2 (T058).
- **US6** (mini back-office) : après la phase 2 ; ses tests vérifient l'affichage de US1 et US2.
- **Polish** : après les user stories.

```text
Setup → Foundational ─┬─ US1 ─┬─ US2 ─┬─ US4
                      │       │       └─ US5
                      ├─ US3  └─ US6
                      └──────────────────────→ Polish
```

## Parallel Example: User Story 1

```text
T017 test de l'accueil · T018 test des pages
T019 héros · T020 accès rapide · T021 équipements et marques · T022 offre digitale
T023 bienvenue et fidélité · T024 actualités et contact · T026 composants de page
```

## Parallel Example: User Story 6

```text
T063 bandeau · T064 tuiles · T065 actualités · T066 coordonnées · T067 menus · T068 marques
```

## Implementation Strategy

1. Phases 1 et 2.
2. **MVP** : US1 puis US2 — accueil complet et navigation ; valider SC-001, SC-006, SC-012.
3. US3 (cookies) : indispensable avant toute ouverture au public.
4. US4 (recherche), US5 (contact et newsletter), US6 (mini back-office).
5. Polish, dont Lighthouse dans l'intégration continue.

**Remarque sur SC-002** : « tout produit à 3 clics » sera pleinement vérifiable avec les fiches
produit de F03 (accueil → famille → fiche). F01 garantit les deux premiers clics.

**Remarque sur SC-010** : le test avec des médecins (9 sur 10 citent les familles et deux
services) se fait lors d'une séance de critique sur le site de démonstration, pas par un test
automatique.
