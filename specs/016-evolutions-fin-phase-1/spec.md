# Feature Specification: F16 — Évolutions de fin de phase 1

**Feature Branch**: `016-evolutions-fin-phase-1`

**Created**: 2026-10-25

**Status**: Draft

**Input**: User description: "F16 — Évolutions de fin de phase 1 : retours de Régis Andrieu sur le site de démonstration, validés par Pauline le 2026-10-25 : en-tête mobile (menu à gauche, logo au centre, loupe, panier et compte à droite) ; menu horizontal dès 1 024 px (Mac et Windows) ; fil d'Ariane ; « Régis Andrieu, fondateur » retiré du bloc contact ; « (hors imagerie) » retiré du slogan partout ; carrousel dynamique à la place du grand bandeau vert (news, opérations, produits phares, offre de bienvenue) ; section « Pourquoi préférer ExploCardio.fr » à la place de la section Équipement ; nouvel ordre de l'accueil ; prix du panier mis à jour en direct ; devis depuis le panier ; inscription sans RPPS, SIRET/SIREN demandé à la première commande ; commandes hors France métropolitaine orientées vers un contact. Reportés : particuliers, parrainage, Partenariats."

## Contexte et objectif

La phase 1 (site complet en démonstration, F01 à F13) est terminée. Régis Andrieu, fondateur
d'ExploCardio.fr, a parcouru le site et relevé des améliorations. F16 les regroupe. Objectifs :

- **une navigation plus familière et plus lisible** sur tous les écrans (téléphone, Mac, PC
  Windows), avec un fil d'Ariane pour savoir où l'on est ;
- **un accueil plus vivant et moins redondant** : un carrousel qui met en avant l'actualité
  commerciale du moment, et des arguments clairs plutôt qu'une redite du catalogue ;
- **moins de freins à l'achat** : prix du panier mis à jour en direct, devis téléchargeable
  avant de commander, inscription sans numéro RPPS ;
- **un périmètre géographique explicite** : la commande en ligne reste réservée à la France
  métropolitaine, et les autres demandes sont orientées vers l'équipe.

F16 modifie des parcours déjà livrés par F01 (accueil, navigation), F02 (inscription), F04
(panier, commande), F05 (mise à disposition) et F13 (back-office). Les règles de ces modules
restent valables pour tout ce que F16 ne change pas.

**Hors périmètre de F16 (reportés)** : les comptes et commandes de particuliers ; le
parrainage et la cagnotte d'inscription ; une rubrique « Partenariats » (la tuile
« Financement » reste parmi les six accès rapides).

**Phases** : en phase 1, tout fonctionne avec les connecteurs de démonstration (devis créé
dans la base fictive, emails dans la boîte de démonstration). Le branchement réel (devis dans
Odoo) relève de F14 et se vérifie en phase 3.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Se repérer et naviguer sur tous les écrans (Priority: P1)

Un cardiologue consulte le site sur son téléphone entre deux patients, puis sur le PC Windows
de son cabinet. Sur téléphone, il trouve le menu à gauche, comme sur la plupart des sites, et
la recherche et le panier à droite. Sur son PC, dont l'affichage est agrandi, le menu
s'affiche à l'horizontale comme sur un Mac. Sur chaque page, un fil d'Ariane lui montre où il
se trouve et lui permet de remonter d'un clic.

**Why this priority** : la navigation est vue sur chaque page et par chaque visiteur ; un menu
caché derrière un bouton sur un ordinateur fait croire à un site mobile mal adapté.

**Independent Test** : ouvrir le site à 390 px, 1 024 px, 1 280 px et 1 920 px de large, puis
une fiche produit : vérifier la disposition de l'en-tête et le fil d'Ariane.

**Acceptance Scenarios** :

1. **Given** un écran de téléphone, **When** une page s'affiche, **Then** le bouton du menu
   est à gauche, le logo au centre, et la loupe, le panier et l'accès au compte à droite.
2. **Given** un écran d'au moins 1 024 px de large (par exemple un PC Windows de 1 280 px
   affiché à 125 %), **When** une page s'affiche, **Then** le menu principal est horizontal et
   toutes ses entrées sont visibles sans bouton de menu ni défilement.
3. **Given** une fiche produit atteinte depuis l'accueil, **When** elle s'affiche, **Then** un
   fil d'Ariane indique « Accueil › Holter ECG › [nom du produit] », chaque étape sauf la
   dernière étant un lien.
4. **Given** un téléphone, **When** une page profonde s'affiche, **Then** le fil d'Ariane tient
   sur une ligne et permet au moins de revenir à la rubrique parente.
5. **Given** l'accueil, **When** il s'affiche, **Then** aucun fil d'Ariane n'est affiché.

---

### User Story 2 - Découvrir l'actualité commerciale sur l'accueil (Priority: P1)

En arrivant sur l'accueil, le médecin voit un carrousel de grandes vignettes : une offre sur
les électrodes ce mois-ci, l'offre de bienvenue, une information temporaire, un produit phare. Chaque vignette mène à
la page concernée. Les vignettes défilent seules, et il peut les arrêter ou les parcourir à
son rythme.

**Why this priority** : le haut de l'accueil est l'endroit le plus vu du site ; le grand bandeau
actuel répète le logo et la signature au lieu de servir les ventes.

**Independent Test** : publier deux vignettes au back-office, dont une programmée pour demain ;
vérifier l'accueil aujourd'hui puis le lendemain, le défilement, la pause et l'accès au clavier.

**Acceptance Scenarios** :

1. **Given** plusieurs vignettes publiées et dans leur période, **When** l'accueil s'affiche,
   **Then** la première vignette est visible sous le menu, et les suivantes défilent toutes les
   6 secondes.
2. **Given** le carrousel en mouvement, **When** le visiteur touche « Pause », survole le
   carrousel ou y place le focus du clavier, **Then** le défilement s'arrête ; « Lecture » le
   relance.
3. **Given** le carrousel, **When** le visiteur utilise les flèches ou les points, au toucher,
   à la souris ou au clavier, **Then** la vignette demandée s'affiche.
4. **Given** une vignette, **When** le visiteur touche son bouton, **Then** il arrive sur la page
   liée (fiche produit, page d'opération, inscription pour l'offre de bienvenue…).
5. **Given** un visiteur qui a demandé à réduire les animations dans son système, **When**
   l'accueil s'affiche, **Then** le carrousel ne défile pas tout seul.
6. **Given** une vignette dont la période est terminée ou pas encore commencée, **When**
   l'accueil s'affiche, **Then** elle n'apparaît pas.
7. **Given** l'accueil, **When** il s'affiche, **Then** il ne montre ni le grand logo ni la
   signature dans le bandeau du haut, et l'offre de bienvenue y figure comme vignette.

---

### User Story 3 - Gérer les vignettes du carrousel au back-office (Priority: P1)

Un commercial prépare l'opération du mois prochain : il crée une vignette (image, titre, une
phrase, texte et lien du bouton), fixe ses dates, la prévisualise sur ordinateur et sur
mobile, puis la publie. Il range les vignettes dans l'ordre voulu.

**Why this priority** : sans outil de gestion, le carrousel resterait figé ; l'équipe doit
pouvoir le faire vivre sans développeur (objectif de F13).

**Independent Test** : créer, prévisualiser, publier, réordonner et retirer une vignette ; une
vignette avec image sans texte de remplacement est refusée.

**Acceptance Scenarios** :

1. **Given** un commercial ou un administrateur, **When** il crée une vignette en préparation,
   **Then** elle est visible dans l'aperçu (ordinateur et mobile) et pas sur le site public.
2. **Given** une vignette publiée, **When** il l'enregistre, **Then** elle apparaît sur le site
   en moins d'une minute, à la place prévue par l'ordre choisi.
3. **Given** une vignette avec une image mais sans texte de remplacement, **When** il
   l'enregistre, **Then** l'enregistrement est refusé avec l'explication.
4. **Given** une vignette sans image, **When** elle s'affiche, **Then** elle utilise un fond aux
   couleurs de la charte et reste lisible.
5. **Given** deux personnes qui modifient la même vignette, **When** la seconde enregistre,
   **Then** elle est prévenue et rien n'est écrasé (règle de F13).

---

### User Story 4 - Comprendre pourquoi choisir ExploCardio.fr (Priority: P2)

Sous les six accès rapides, le médecin lit en quelques secondes pourquoi commander ici
plutôt qu'ailleurs : quatre arguments courts, chacun illustré d'un petit schéma sobre. Plus
bas, il retrouve la partie « Service et fidélité », puis l'offre digitale et le contact.

**Why this priority** : la section « Équipement » actuelle répète les six accès rapides ; des
arguments clairs aident davantage à convaincre un nouveau visiteur.

**Independent Test** : afficher l'accueil et vérifier l'ordre des sections, l'absence de la
section Équipement et la présence des quatre arguments ; modifier un argument au back-office.

**Acceptance Scenarios** :

1. **Given** l'accueil, **When** il s'affiche, **Then** les sections apparaissent dans cet ordre :
   carrousel ; six accès rapides ; « Pourquoi préférer ExploCardio.fr » ; « Service et
   fidélité » ; « Offre digitale » ; bloc contact.
2. **Given** l'accueil, **When** il s'affiche, **Then** il ne contient plus la section
   « L'équipement » (trois familles, marques de référence, trois cartes) ni la section
   « Actualités » (décision du 2026-10-25 : les informations du moment passent par le
   carrousel).
3. **Given** la section « Pourquoi préférer ExploCardio.fr », **When** elle s'affiche, **Then**
   elle présente une courte introduction et quatre arguments (titre et phrase), chacun avec un
   schéma décoratif dans le style des trois points de la charte.
4. **Given** un commercial ou un administrateur, **When** il modifie l'introduction ou un
   argument au back-office, **Then** le nouveau texte apparaît sur l'accueil en moins d'une
   minute.

---

### User Story 5 - Voir le prix du panier changer en direct (Priority: P1)

Dans son panier, le médecin passe de 2 à 5 boîtes d'électrodes avec les flèches du champ ou
en tapant le chiffre. Le prix de la ligne et le total se mettent à jour immédiatement, sans
qu'il ait à cliquer ailleurs.

**Why this priority** : aujourd'hui le prix ne change qu'en quittant le champ ; le médecin croit
que le site ne réagit pas. C'est un défaut visible à chaque commande.

**Independent Test** : changer une quantité dans le panier et vérifier la mise à jour du prix
sans autre action, puis recharger la page.

**Acceptance Scenarios** :

1. **Given** un panier, **When** le médecin change une quantité (flèches, clavier, saisie),
   **Then** le prix de la ligne et le total HT et TTC se mettent à jour aussitôt.
2. **Given** une quantité changée, **When** il recharge la page ou passe à la commande, **Then**
   la nouvelle quantité est bien enregistrée.
3. **Given** une quantité qui dépasse la limite permise ou le stock annoncé, **When** il la
   saisit, **Then** le prix affiché correspond à la quantité retenue et un message explique la
   correction.
4. **Given** un enregistrement impossible (connexion coupée), **When** il change une quantité,
   **Then** il est prévenu et le panier revient à la dernière quantité enregistrée.

---

### User Story 6 - Recevoir un devis depuis le panier (Priority: P1)

Un médecin compose un panier de 6 000 € HT pour équiper sa salle d'effort. Avant de s'engager,
il veut un devis à montrer à son associé et à son comptable. Depuis le panier, il touche
« Recevoir un devis » : le devis est créé, téléchargeable aussitôt en PDF et envoyé par email.
Quelques jours plus tard, il le retrouve dans « Mon compte » et le transforme en commande.

**Why this priority** : face aux grosses sommes, un professionnel veut un document avant de
payer ; sans devis, il quitte le site.

**Independent Test** : composer un panier, demander un devis, télécharger le PDF, vérifier
l'email et la notification de l'équipe, puis commander depuis Mon compte.

**Acceptance Scenarios** :

1. **Given** un médecin connecté avec un panier non vide, **When** il touche « Recevoir un
   devis », **Then** un devis numéroté est créé avec les articles, formules, quantités et prix HT
   et TTC du panier, valable 30 jours, et le PDF est proposé au téléchargement aussitôt.
2. **Given** un devis créé, **Then** le médecin le reçoit par email (PDF joint ou lien), et
   l'équipe est prévenue.
3. **Given** un visiteur non connecté, **When** il touche « Recevoir un devis », **Then** il est
   invité à se connecter ou à s'inscrire, puis revient au panier pour obtenir son devis.
4. **Given** un devis valide, **When** le médecin choisit « Commander » depuis Mon compte,
   **Then** il passe au tunnel de commande avec les articles et les prix du devis.
5. **Given** un devis expiré, **When** il veut le commander, **Then** il est prévenu que les prix
   peuvent avoir changé, et le panier est recomposé aux prix du jour.
6. **Given** un devis demandé, **Then** le panier du médecin reste inchangé.

---

### User Story 7 - S'inscrire sans numéro RPPS (Priority: P1)

Un médecin s'inscrit en donnant son nom, son cabinet, son email et son adresse, sans numéro
RPPS. Il peut donner son SIRET ou son SIREN s'il l'a sous la main, mais ce n'est pas
obligatoire. Lors de sa première commande, le site le lui demande s'il ne l'a pas renseigné.
La commande part sans attendre ; l'équipe vérifie le numéro ensuite.

**Why this priority** : le RPPS est un frein à l'inscription et n'est pas nécessaire à la vente ;
seul le SIRET ou le SIREN compte pour la facturation (point à confirmer par la comptabilité et
le juridique).

**Independent Test** : s'inscrire sans aucun numéro, confirmer l'email, commander : le SIRET
est demandé à l'étape de commande, puis la commande part ; l'équipe voit le numéro à vérifier.

**Acceptance Scenarios** :

1. **Given** le formulaire d'inscription, **When** il s'affiche, **Then** il ne demande plus de
   numéro RPPS, et le champ SIRET ou SIREN est marqué facultatif.
2. **Given** un SIRET ou un SIREN saisi au mauvais format (longueur ou clé de contrôle), **When**
   le professionnel valide, **Then** le formulaire refuse avec l'explication.
3. **Given** un compte dont l'email est confirmé, **When** le professionnel commande, **Then**
   la commande est possible sans attendre une validation de l'équipe ; pour une mise à
   disposition, l'appareil n'est expédié qu'après la vérification du numéro (FR-034).
4. **Given** un compte sans SIRET ni SIREN, **When** il passe sa première commande, **Then** le
   numéro lui est demandé dans le tunnel, avant le paiement, et enregistré sur son compte.
5. **Given** un compte dont le numéro est déjà renseigné, **When** il commande, **Then** le
   numéro ne lui est pas redemandé.
6. **Given** un numéro renseigné et pas encore vérifié, **Then** le compte apparaît dans « À
   traiter » du back-office comme numéro à vérifier ; l'équipe le marque vérifié ou refusé.
7. **Given** un numéro refusé par l'équipe, **Then** le compte est suspendu pour les commandes
   suivantes et le professionnel est prévenu par email avec le motif ; les commandes déjà
   passées sont traitées au cas par cas par l'équipe.

---

### User Story 8 - Commander depuis l'outre-mer ou l'étranger (Priority: P2)

Un cardiologue installé à La Réunion ou en Belgique s'intéresse à un Holter. Le site lui
indique clairement que la commande en ligne est réservée à la France métropolitaine et qu'il
peut demander une offre à l'équipe en quelques clics.

**Why this priority** : ces demandes existent ; sans indication, le médecin découvre le refus
au dernier moment, après avoir rempli son panier.

**Independent Test** : afficher une fiche produit et le panier (mention visible), puis saisir
une adresse de livraison en 974 : la commande est arrêtée et le contact proposé.

**Acceptance Scenarios** :

1. **Given** une fiche produit, le panier ou la page des conditions de livraison, **When** ils
   s'affichent, **Then** une mention indique « Livraison en France métropolitaine (Corse
   comprise). Outre-mer et étranger : contactez-nous », avec un lien vers le contact.
2. **Given** une adresse de livraison dont le code postal commence par 97 ou 98, ou un pays autre
   que la France, **When** le médecin la saisit à l'inscription, dans Mon compte ou dans le
   tunnel, **Then** la commande en ligne est refusée avec l'explication et un bouton « Nous
   contacter » ouvre le formulaire de contact prérempli (motif et contenu du panier, sans
   donnée de patient).
3. **Given** une adresse en Corse, **When** elle est saisie, **Then** la commande reste possible
   (délai des zones éloignées de F05 inchangé).

---

### User Story 9 - Un site cohérent avec la nouvelle présentation (Priority: P2)

Partout où la signature apparaît, elle devient « Le spécialiste des explorations
fonctionnelles cardiaques », sans « (hors imagerie) ». Le bloc contact du bas de l'accueil
garde l'email, le téléphone et l'adresse, sans le nom du fondateur, qui reste présenté sur la
page « Qui sommes-nous ».

**Why this priority** : changements de présentation demandés par le fondateur, simples mais
visibles sur toutes les pages et dans les documents envoyés.

**Independent Test** : rechercher « hors imagerie » sur le site, dans les emails et dans une
facture de démonstration ; afficher le bloc contact et la page Qui sommes-nous.

**Acceptance Scenarios** :

1. **Given** n'importe quelle page, un email ou un document du site, **When** il s'affiche,
   **Then** la mention « (hors imagerie) » n'apparaît nulle part.
2. **Given** le bloc contact, **When** il s'affiche, **Then** il ne contient plus « Régis Andrieu,
   fondateur » et garde les autres coordonnées.
3. **Given** la page « Qui sommes-nous », **When** elle s'affiche, **Then** elle présente toujours
   Régis Andrieu comme fondateur.

---

### Edge Cases

- **Aucune vignette publiée** : le carrousel n'est pas affiché ; l'accueil commence par les six
  accès rapides, avec un titre de page présent pour l'accessibilité.
- **Une seule vignette** : pas de défilement, ni flèches ni points.
- **Image manquante ou trop lourde** : refusée à l'enregistrement (formats et taille de F13) ;
  sans image, fond aux couleurs de la charte.
- **Texte de vignette trop long** : refusé à l'enregistrement (titre de 60 caractères et
  phrase de 140 caractères au plus) pour rester lisible sur téléphone.
- **Lien de vignette vers une page retirée** : refusé à l'enregistrement ; si la page disparaît
  ensuite, la vignette s'affiche sans bouton.
- **Écran étroit (320 px)** : le logo central se réduit au symbole s'il manque de place ; les
  boutons gardent 44 px.
- **Écran entre 1 024 et 1 279 px** : menu horizontal plus compact (espacements réduits), sans
  retour à la ligne ni entrée masquée.
- **Fil d'Ariane d'un produit trouvé par la recherche** : le chemin reflète la place du produit
  dans le site (famille, type), pas l'historique de navigation.
- **Pages hors arborescence** (connexion, panier, tunnel de commande, pages légales) : fil
  d'Ariane court (« Accueil › Panier ») ou absent dans le tunnel de paiement pour ne pas
  inviter à en sortir.
- **Quantité tapée rapidement** (« 1 », puis « 12 ») : seule la dernière valeur est enregistrée ;
  le prix affiché suit la saisie.
- **Quantité vidée ou à zéro** : le prix ne passe pas à zéro tant que le champ est vide ; la
  ligne n'est retirée que par le bouton « Retirer ».
- **Devis d'un panier contenant une mise à disposition** : le devis indique le premier mois et
  les mois suivants, comme le panier.
- **Panier modifié après un devis** : le devis garde son contenu d'origine.
- **Plusieurs devis** : chaque demande crée un nouveau devis ; Mon compte les liste du plus
  récent au plus ancien, avec leur état (valide, expiré, commandé).
- **Stock épuisé entre le devis et la commande** : la commande depuis le devis applique les
  règles de disponibilité habituelles (F03, F04), avec un message.
- **SIRET déjà utilisé par un autre compte** : accepté (plusieurs médecins d'un même cabinet),
  et signalé à l'équipe dans le numéro à vérifier.
- **Location sans compte (F05)** : le compte créé pendant la commande suit les mêmes règles ;
  le numéro est demandé dans le tunnel. Le compte doit avoir un numéro vérifié par l'équipe avant
  l'expédition de l'appareil (FR-034).
- **Adresse de facturation hors métropole mais livraison en métropole** : la commande est
  possible (seule l'adresse de livraison compte).
- **Connecteur Odoo indisponible au moment du devis** : le devis n'est pas créé, le médecin est
  prévenu et invité à réessayer ou à contacter l'équipe ; le panier est conservé.

## Requirements *(mandatory)*

### Functional Requirements

**Navigation et en-tête**

- **FR-001** : Sur les écrans de moins de 1 024 px, l'en-tête DOIT présenter le bouton du menu à
  gauche, le logo au centre, et la recherche, le panier et l'accès au compte à droite.
- **FR-002** : À partir de 1 024 px de large, le menu principal DOIT être horizontal, avec toutes
  ses entrées visibles et ses méga-menus, sur tous les navigateurs courants (Mac et Windows,
  zoom système compris).
- **FR-003** : Toutes les pages, sauf l'accueil et les étapes du paiement, DOIVENT afficher un
  fil d'Ariane qui reflète la place de la page dans le site ; chaque étape sauf la dernière est
  un lien. Sur téléphone, il DOIT tenir sur une ligne et permettre au moins de remonter d'un
  niveau.
- **FR-004** : Le fil d'Ariane DOIT être annoncé aux technologies d'assistance comme tel, avec
  la page courante signalée.

**Accueil**

- **FR-005** : Le grand bandeau sous le menu (logo, signature) DOIT être remplacé par un
  carrousel de vignettes ; chaque vignette comporte un titre, une phrase, un bouton (texte et
  lien) et, au choix, une image avec son texte de remplacement.
- **FR-006** : Le carrousel DOIT passer à la vignette suivante toutes les 6 secondes, s'arrêter
  au survol, au focus clavier et sur le bouton « Pause », proposer des flèches et des points
  utilisables au toucher, à la souris et au clavier, et ne pas défiler seul si le visiteur a
  demandé à réduire les animations.
- **FR-007** : Une vignette DOIT n'apparaître que si elle est publiée et dans sa période
  (début et fin facultatifs).
- **FR-008** : L'offre de bienvenue DOIT être présentée sous forme de vignette du carrousel,
  modifiable comme les autres, et ne plus avoir de section propre sur l'accueil.
- **FR-009** : L'accueil DOIT présenter, dans cet ordre : carrousel ; six accès rapides ;
  « Pourquoi préférer ExploCardio.fr » ; « Service et fidélité » ; « Offre digitale » ; bloc
  contact. Les sections « L'équipement » et « Actualités » DOIVENT être retirées de l'accueil.
- **FR-010** : La section « Pourquoi préférer ExploCardio.fr » DOIT présenter une introduction
  et quatre arguments (titre et phrase), chacun accompagné d'un schéma décoratif dans le
  langage graphique de la charte (trois points, pastels décoratifs), sans pictogramme médical
  cliché. Textes de départ : voir « Textes de départ » ci-dessous.
- **FR-011** : L'accueil DOIT garder un titre de page (pour l'accessibilité et le
  référencement), même si le carrousel ne l'affiche pas en grand.

**Back-office (F13)**

- **FR-012** : L'administrateur et le commercial DOIVENT pouvoir créer, modifier, ordonner,
  prévisualiser (ordinateur et mobile), publier et retirer les vignettes du carrousel, avec les
  règles de F13 : état en préparation / publié / retiré, aperçu réservé à l'équipe, verrou
  contre les modifications simultanées, texte de remplacement obligatoire pour toute image,
  journal des actions.
- **FR-013** : Les vignettes DOIVENT être limitées à 60 caractères pour le titre, 140 pour la
  phrase et 30 pour le texte du bouton, et leur lien DOIT être vérifié comme les liens de F13.
- **FR-014** : L'administrateur et le commercial DOIVENT pouvoir modifier l'introduction et les
  quatre arguments de « Pourquoi préférer ExploCardio.fr ».
- **FR-015** : Les vignettes du carrousel DOIVENT être des contenus distincts des actualités :
  le carrousel remplace uniquement le grand bandeau (logo et signature) et accueille des offres,
  des informations temporaires, des produits phares ou des consommables du moment, choisis au
  back-office. Les actualités n'étant plus affichées, leur écran de gestion DOIT être retiré du
  back-office ; les actualités déjà saisies sont conservées dans la base, sans être affichées.

**Panier**

- **FR-016** : Dans le panier, le prix de chaque ligne et les totaux HT et TTC DOIVENT se mettre
  à jour dès que la quantité change, sans autre action ; l'enregistrement DOIT suivre sans
  bloquer la saisie, et seule la dernière quantité saisie est retenue.
- **FR-017** : En cas d'échec de l'enregistrement d'une quantité, le médecin DOIT être prévenu et
  le panier revenir à la dernière quantité enregistrée.

**Devis depuis le panier**

- **FR-018** : Le panier DOIT proposer « Recevoir un devis » aux professionnels connectés ; un
  visiteur non connecté est invité à se connecter ou à s'inscrire, puis revient au panier.
- **FR-019** : La demande DOIT créer un devis dans Odoo (base fictive en phase 1), numéroté,
  reprenant articles, formules, quantités, prix HT et TTC, frais de livraison et date de fin de
  validité (30 jours) ; le PDF DOIT être téléchargeable aussitôt et envoyé par email au
  professionnel ; l'équipe DOIT être prévenue. Les frais de livraison du devis sont calculés
  pour l'adresse de livraison par défaut du compte et le mode de livraison standard ; si le
  mode change dans le tunnel, les frais sont recalculés. Sans adresse en France métropolitaine,
  le devis est refusé avec le bouton « Nous contacter » (FR-029).
- **FR-020** : « Mon compte » DOIT lister les devis du professionnel avec leur état (valide,
  expiré, commandé) et permettre de télécharger le PDF et de commander un devis valide aux prix
  du devis.
- **FR-021** : Commander un devis expiré DOIT recomposer le panier aux prix du jour, avec un
  message.
- **FR-022** : En phase 1, le PDF du devis DOIT porter la mention FICTIF, comme les factures.

**Inscription et numéro d'entreprise**

- **FR-023** : L'inscription des professionnels NE DOIT PLUS demander de numéro RPPS ; le SIRET
  ou le SIREN y DOIT être facultatif, vérifié dans sa forme (longueur et clé de contrôle)
  lorsqu'il est saisi. Sans RPPS, la qualité de professionnel de santé n'est plus contrôlée
  automatiquement : elle l'est par l'équipe lors de la vérification du numéro (FR-026), en
  attendant l'avis de la comptabilité et du juridique.
- **FR-024** : Un compte dont l'email est confirmé DOIT pouvoir commander sans validation
  préalable de l'équipe (la règle de F02 « en attente de validation : consulter sans
  commander » est remplacée), sous réserve de FR-034 pour les mises à disposition.
- **FR-025** : Le SIRET ou le SIREN DOIT être demandé dans le tunnel de commande, avant le
  paiement, s'il n'est pas déjà renseigné, puis enregistré sur le compte. Le moment de cette
  exigence DOIT être un paramètre du back-office (« à la première commande », valeur par
  défaut ; « à l'inscription » en option), en attendant la confirmation de la comptabilité et
  du juridique.
- **FR-026** : Tout numéro renseigné et non vérifié DOIT apparaître dans « À traiter » ;
  l'administrateur ou le commercial le marque vérifié ou refusé (motif obligatoire). Un refus
  suspend automatiquement le compte pour les commandes suivantes (exception à la règle de F13 :
  la suspension liée à un numéro refusé est ouverte au commercial ; le rétablissement reste
  réservé à l'administrateur) et prévient le professionnel par email. En vérifiant le numéro,
  l'équipe contrôle aussi que l'activité déclarée correspond à un professionnel de santé
  (cabinet, centre, établissement).
- **FR-035** : Plus aucun email « Votre compte est validé » ni « Votre demande de compte »
  (refus) n'est envoyé : l'email de bienvenue qui suit la confirmation de l'adresse suffit, et le
  refus d'un numéro est annoncé par l'email « Votre numéro d'entreprise » (motif et contact),
  modifiable au back-office comme les autres modèles (F10).
- **FR-027** : Les textes du site qui parlent du RPPS (inscription, aide, conditions, emails)
  DOIVENT être mis à jour.
- **FR-034** : Exception pour les mises à disposition (décision du 2026-10-25) : l'expédition
  d'un appareil loué DOIT attendre que le numéro du compte soit vérifié par l'équipe (règle de
  F05 conservée). Le professionnel en est informé au moment de commander, et la date de
  livraison annoncée en tient compte ; les achats, eux, partent sans attendre.

**Hors France métropolitaine**

- **FR-028** : La mention « Livraison en France métropolitaine (Corse comprise). Outre-mer et
  étranger : contactez-nous », avec un lien vers le contact, DOIT apparaître sur les fiches
  produit, dans le panier et dans les conditions de livraison.
- **FR-029** : Une adresse de livraison en outre-mer (codes postaux commençant par 97 ou 98)
  ou dans un autre pays DOIT bloquer la commande en ligne, avec l'explication et un bouton
  « Nous contacter » qui ouvre le formulaire de contact prérempli (motif « Commande hors
  métropole » et contenu du panier).

**Présentation**

- **FR-030** : La signature DOIT devenir « Le spécialiste des explorations fonctionnelles
  cardiaques » partout (pages, titres, emails, documents PDF, textes, charte) ; « (hors
  imagerie) » NE DOIT plus apparaître.
- **FR-031** : Le bloc contact DOIT afficher les coordonnées sans « Régis Andrieu, fondateur » ;
  la page « Qui sommes-nous » DOIT continuer de le présenter.

**Transverse**

- **FR-032** : Toutes les pages et tous les écrans modifiés DOIVENT respecter la charte
  (docs/brand), le WCAG 2.2 AA (contraste, focus visible, cibles de 44 px, clavier, réduction
  des animations) et s'afficher sans défilement horizontal de 320 à 1 920 px.
- **FR-033** : Aucun écran ajouté ou modifié NE DOIT collecter de donnée de patient.

### Textes de départ (à valider par Régis)

**Pourquoi préférer ExploCardio.fr** — introduction : « Un seul métier, le vôtre : les
explorations fonctionnelles cardiaques. Tout est pensé pour vous faire gagner du temps. »

| Argument | Phrase |
|---|---|
| Le spécialiste de votre seul métier | Holter, MAPA, épreuve d'effort, ECG : une sélection de matériels éprouvés, sans catalogue de 10 000 références. |
| Des prix HT clairs | Chaque modèle standard affiche son prix dès la première page, sans « prix sur demande ». |
| Une assistance offerte | Vos achats de consommables ouvrent vos droits d'assistance et créditent vos bons d'achat. |
| Du matériel au mois | Location sans engagement, dépannage express livré dès le lendemain. |

### Key Entities

- **Vignette du carrousel** : titre, phrase, texte et lien du bouton, image et texte de
  remplacement (facultatifs), ordre, dates de début et de fin, état (en préparation, publié,
  retiré), auteur et date de dernière modification. Contenu réel du site (back-office).
- **Arguments « Pourquoi préférer ExploCardio.fr »** : introduction et quatre arguments (titre,
  phrase), modifiables. Contenu réel du site.
- **Devis** : numéro, professionnel, lignes (article, configuration, formule, quantité, prix HT,
  TVA), frais de livraison, totaux, date de création, date de fin de validité, état (valide,
  expiré, commandé), commande issue du devis. Géré dans Odoo (base fictive en phase 1) ; le
  site n'en garde que la référence.
- **Numéro d'entreprise du compte** : SIRET ou SIREN, état de vérification (à vérifier,
  vérifié, refusé), motif de refus, date et auteur de la vérification.
- **Paramètre « moment d'exigence du numéro »** : à la première commande (défaut) ou à
  l'inscription ; historisé comme les autres paramètres de F13.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** [Phase 1] : Sur un écran de 1 024, 1 280 et 1 920 px, et sur un PC Windows réglé
  à 125 % et 150 %, le menu principal est horizontal et complet ; sur 320 et 390 px, le bouton
  du menu est à gauche et le panier à droite.
- **SC-002** [Phase 1] : 100 % des pages profondes testées (familles, types, fiches, services,
  aide, Mon compte) affichent un fil d'Ariane dont chaque lien mène à la page attendue.
- **SC-003** [Phase 1] : Une vignette publiée au back-office apparaît sur l'accueil en moins
  d'une minute ; une vignette hors période n'apparaît jamais.
- **SC-004** [Phase 1] : Le carrousel est entièrement utilisable au clavier et au lecteur
  d'écran, s'arrête sur demande, et ne défile pas seul quand la réduction des animations est
  demandée (contrôle automatique d'accessibilité sans erreur).
- **SC-005** [Phase 1] : Le prix d'une ligne du panier se met à jour en moins d'un quart de
  seconde après un changement de quantité, sans autre action ; la quantité est retrouvée après
  rechargement dans 100 % des essais.
- **SC-006** [Phase 1] : Un devis est obtenu (PDF téléchargeable) en moins de 10 secondes après
  la demande, l'email arrive dans la boîte de démonstration et l'équipe est prévenue ; un devis
  valide se transforme en commande aux prix du devis.
- **SC-007** [Phase 1] : Une inscription sans aucun numéro se fait en moins de 3 minutes ; la
  première commande demande le numéro une seule fois, puis plus jamais.
- **SC-008** [Phase 1] : Avec une adresse de livraison en 971 à 976, 98 ou à l'étranger, aucune
  commande en ligne n'aboutit, et le contact est proposé en un clic.
- **SC-009** [Phase 1] : La recherche de « hors imagerie » dans les pages, les emails de
  démonstration et les PDF générés ne donne aucun résultat.
- **SC-010** [Phase 1] : L'affichage principal de l'accueil reste sous 2 secondes (mesure de
  F01), carrousel compris.
- **SC-011** [Phase 3] : Le devis créé depuis le panier existe dans la copie de test d'Odoo,
  avec les mêmes lignes et montants que le PDF reçu par le professionnel.

## Assumptions

- Le carrousel remplace le grand bandeau à fond eucalyptus pâle ; le petit bandeau
  promotionnel texte au-dessus du menu (F01, F06) est conservé tel quel.
- Inspiration d'apple.com pour l'organisation du carrousel uniquement : l'identité visuelle
  reste celle de la charte ExploCardio.fr.
- Les images des vignettes sont fournies par ExploCardio.fr ; en attendant, les vignettes
  utilisent des fonds de la charte (eucalyptus pâle, bleu doux, lin) et le motif des trois
  points.
- Une vignette « Offre de bienvenue » et deux vignettes d'exemple (une offre, un produit phare)
  sont créées au départ pour que le carrousel ne soit pas vide ; leur contenu définitif sera
  choisi par l'équipe au back-office.
- Le fil d'Ariane suit l'arborescence du site (familles, types, fiches), pas l'historique du
  navigateur, comme sur la plupart des sites marchands.
- Le devis n'est proposé qu'aux professionnels connectés, car il est nominatif et se retrouve
  dans Mon compte ; il ne réserve pas de stock.
- La durée de validité du devis (30 jours) est une règle commerciale : elle est lue dans Odoo
  (base fictive en phase 1), comme les autres règles commerciales.
- Le SIRET ou le SIREN est accepté (14 ou 9 chiffres, clé de contrôle vérifiée) ; plusieurs
  comptes d'un même cabinet peuvent partager le même numéro.
- L'offre de bienvenue (F02) reste attribuée à la première commande, désormais possible sans
  validation préalable du compte.
- Aucun compte réel n'existe encore : pas de reprise des comptes inscrits avec un RPPS ; le
  champ RPPS est retiré de l'inscription et de l'affichage.
- La commande hors métropole par l'équipe (devis manuel, frais de port spécifiques) se fait
  hors du site.
- Reportés à un module ultérieur : comptes et commandes de particuliers (qui demanderont une
  modification de la constitution), parrainage et cagnotte d'inscription, rubrique
  Partenariats.

## Dependencies

- **F01** (accueil, navigation, contenus), **F02** (inscription, validation des comptes),
  **F03** (fiches produit), **F04** (panier, tunnel, factures), **F05** (mise à disposition,
  location sans compte), **F06** (offre de bienvenue, bandeau des promotions), **F10** (emails),
  **F11** (connecteur Odoo : devis), **F13** (back-office : contenus, aperçu, verrou, à traiter,
  paramètres, journal).
- **Constitution** : principes inchangés (la signature n'y figure pas comme slogan affiché ; le
  périmètre « hors imagerie » du métier reste vrai).
- **À confirmer** par la comptabilité et le juridique : l'absence de RPPS et le moment où le
  SIRET ou le SIREN est exigé (réglable au back-office, FR-025).
