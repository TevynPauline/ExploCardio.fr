# Feature Specification: F01 — Socle, navigation et page d'accueil

**Feature Branch**: `001-socle-navigation-accueil`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "F01 — Socle, navigation et page d'accueil : en-tête commun (bandeau promotionnel, barre de navigation fixe, méga-menus), recherche instantanée, page d'accueil en 8 sections, pied de page, page Qui sommes-nous / Contact, bandeau cookies. Objectif : qu'un médecin voie en un coup d'œil tous les produits ET tous les services, et n'en manque aucun."

## Contexte et objectif

ExploCardio.fr est le site e-commerce et de services du spécialiste des explorations
fonctionnelles cardiaques (hors imagerie). Il s'adresse aux cardiologues libéraux, cabinets et
centres de France métropolitaine, qui veulent trouver vite, voir un tarif clair et ne pas
parcourir un catalogue généraliste.

F01 pose le socle commun à toutes les pages (en-tête, recherche, pied de page, consentement
aux cookies) et la page d'accueil. Son objectif : qu'un médecin voie en un coup d'œil tous les
produits **et** tous les services, et n'en manque aucun.

Toute l'interface respecte `docs/brand/design-system.md` et les tokens de `docs/brand/`.

**Hors périmètre de F01** : fiches produit détaillées, panier et commande, création et
validation de compte client, parcours de mise à disposition et de financement, programme de
fidélité, tutoriels et FAQ, back-office complet (F13), branchement des services réels (phase 2). F01 fournit les
points d'entrée vers ces modules, une page de présentation simple par famille et par service,
et un mini back-office limité aux contenus de l'accueil et de l'en-tête.

**Phases (constitution v2.2.0)** : en phase 1, F01 fonctionne avec les connecteurs de démonstration : les produits et
les prix viennent de la base fictive du connecteur Odoo, et les emails sont simulés par le
connecteur emailing. Les contenus gérés dans le mini back-office (bandeau, tuiles,
actualités, coordonnées) sont réels dès la phase 1. Le site de démonstration est protégé
(FR-047 à FR-049).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Comprendre toute l'offre depuis l'accueil (Priority: P1)

Un cardiologue arrive sur la page d'accueil. Sans rien chercher, il comprend qui est
ExploCardio.fr, voit les trois familles d'équipements et les services (hébergement des
données de santé, assistance, financement), et accède à celle qui l'intéresse en un clic.

**Why this priority**: c'est l'objectif même du module. Sans cette page, le médecin ne
perçoit ni la spécialisation ni l'étendue de l'offre.

**Independent Test**: ouvrir la page d'accueil sur ordinateur et sur mobile, vérifier la
présence et l'ordre des 8 sections, puis cliquer sur chacune des 6 tuiles d'accès rapide et
constater l'arrivée sur la page attendue.

**Acceptance Scenarios**:

1. **Given** un visiteur sur la page d'accueil, **When** la page s'affiche, **Then** il voit
   dans cet ordre : héros, accès rapide, équipement et marques, offre digitale et flexibilité,
   offre de bienvenue, service et fidélité, actualités, contact.
2. **Given** le héros, **When** il s'affiche, **Then** il présente le logo empilé, le titre
   « Le spécialiste des explorations fonctionnelles cardiaques », la mention
   « (hors imagerie) », les grands points décoratifs, et les boutons « Découvrir le
   catalogue » (principal) et « Demander une mise à disposition » (secondaire).
3. **Given** la grille d'accès rapide, **When** le visiteur clique sur l'une des 6 tuiles,
   **Then** il arrive en 1 clic sur la page correspondante.
4. **Given** les tuiles « Hébergement des données de santé » et le bloc « logiciel Cloud »,
   **When** ils s'affichent, **Then** ils portent le badge « En préparation ».
5. **Given** un écran d'ordinateur, de tablette ou de mobile, **When** la grille d'accès
   rapide s'affiche, **Then** elle présente respectivement 3, 2 ou 1 tuile par ligne.
6. **Given** le bloc contact sans aucune coordonnée renseignée, **When** il s'affiche,
   **Then** il montre « Régis Andrieu, fondateur » et aucune ligne vide ni libellé orphelin.
7. **Given** une photo d'équipement non encore fournie, **When** la section s'affiche,
   **Then** un emplacement provisoire conforme à la charte la remplace.

---

### User Story 2 - Naviguer depuis n'importe quelle page (Priority: P1)

Depuis n'importe quelle page, le médecin dispose d'un en-tête fixe : logo, sept entrées de
navigation avec méga-menus, recherche, panier et accès au compte. Sur mobile, le même contenu
est accessible depuis un menu replié.

**Why this priority**: la navigation porte la promesse « un produit en 3 clics maximum »
(principe II de la constitution). Tous les autres modules s'y rattachent.

**Independent Test**: depuis trois pages différentes, ouvrir chaque méga-menu à la souris, au
clavier et au toucher, et vérifier que chaque lien mène à sa destination.

**Acceptance Scenarios**:

1. **Given** une page quelconque du site, **When** le visiteur fait défiler la page,
   **Then** la barre de navigation reste visible en haut de l'écran.
2. **Given** la barre de navigation sur ordinateur, **When** elle s'affiche, **Then** elle
   présente à gauche le logo horizontal compact, puis les entrées Holter ECG, Holter
   tensionnel, Épreuve d'effort, Accessoires & consommables, Services, Financement,
   Qui sommes-nous / Contact, et à droite la recherche, le panier avec compteur et
   « Mon compte / Connexion ».
3. **Given** une entrée de navigation, **When** le visiteur la survole (ordinateur), la
   touche (mobile) ou l'active au clavier, **Then** un méga-menu s'ouvre avec ses
   sous-catégories, ses produits phares et ses liens rapides.
4. **Given** un méga-menu ouvert, **When** le visiteur appuie sur Échap, clique en dehors ou
   quitte la zone, **Then** le méga-menu se ferme et le focus revient sur l'entrée.
5. **Given** un écran mobile, **When** le visiteur touche l'icône de menu, **Then** il
   retrouve les mêmes entrées et le même contenu que sur ordinateur, avec des cibles tactiles
   d'au moins 44 px.
6. **Given** le logo de l'en-tête, **When** le visiteur clique dessus, **Then** il revient à
   la page d'accueil.
7. **Given** une promotion en cours, **When** une page s'affiche, **Then** le bandeau
   promotionnel est visible et le visiteur ne peut pas le masquer. **Given** aucune
   promotion en cours, **Then** le bandeau n'est pas affiché.
8. **Given** plusieurs messages promotionnels actifs, **When** le bandeau s'affiche,
   **Then** les messages se succèdent, le visiteur peut mettre la rotation en pause, et
   elle est suspendue d'office s'il a demandé la réduction des animations.

---

### User Story 3 - Choisir ses cookies à la première visite (Priority: P2)

À sa première visite, le visiteur voit un bandeau de consentement conforme aux
recommandations de la CNIL. Il accepte ou refuse en un seul geste et peut revenir sur son
choix à tout moment.

**Why this priority**: obligation légale (principe V). Le site ne peut pas être ouvert au
public sans ce bandeau.

**Independent Test**: ouvrir le site dans une session vierge, vérifier l'apparition du
bandeau, refuser, puis contrôler qu'aucun traceur non essentiel n'est déposé.

**Acceptance Scenarios**:

1. **Given** une première visite, **When** une page s'affiche, **Then** le bandeau cookies
   apparaît avec « Tout accepter » et « Tout refuser » au même niveau, de même apparence et
   accessibles en un seul geste.
2. **Given** un visiteur qui n'a pas encore choisi, **When** il navigue, **Then** aucun
   traceur non essentiel n'est déposé.
3. **Given** un visiteur qui a refusé, **When** il revient sur le site, **Then** le bandeau
   ne réapparaît pas pendant la durée de conservation du choix.
4. **Given** un visiteur qui a déjà choisi, **When** il clique sur « Gestion des cookies »
   dans le pied de page, **Then** il peut modifier son choix par finalité.

---

### User Story 4 - Trouver par la recherche (Priority: P2)

Le médecin connaît le nom d'un produit ou la référence d'un consommable. Il ouvre la
recherche, tape quelques caractères et voit aussitôt des suggestions classées par type.

**Why this priority**: c'est le chemin le plus court pour un médecin pressé qui sait ce qu'il
veut, notamment pour recommander un consommable par sa référence.

**Independent Test**: avec un jeu de contenus de test, saisir un nom partiel, puis une
référence fabricant exacte, et vérifier les suggestions et la page de résultats.

**Acceptance Scenarios**:

1. **Given** la recherche ouverte, **When** le visiteur saisit 2 caractères ou plus,
   **Then** des suggestions apparaissent, groupées par type (produits, consommables,
   services, tutoriels, FAQ).
2. **Given** une référence fabricant ou une référence de consommable exacte, **When** le
   visiteur la saisit, **Then** l'article correspondant apparaît en premier.
3. **Given** une suggestion, **When** le visiteur la sélectionne, **Then** il arrive
   directement sur la page concernée.
4. **Given** une recherche sans résultat, **When** elle s'affiche, **Then** le site le dit
   clairement et propose les familles de produits et le contact.
5. **Given** un type de contenu qui n'existe pas encore sur le site, **When** les résultats
   s'affichent, **Then** ce groupe n'apparaît pas.
6. **Given** une saisie avec ou sans accents, majuscules ou tirets, **When** la recherche
   s'exécute, **Then** les résultats sont identiques.

---

### User Story 5 - Contacter l'équipe et rester informé (Priority: P3)

Le médecin veut savoir à qui il a affaire, poser une question ou recevoir les nouveautés. Il
consulte la page Qui sommes-nous / Contact, envoie un message, ou s'inscrit à la newsletter
depuis le pied de page.

**Why this priority**: la confiance et le contact comptent, mais le site reste utile sans
eux dans une première livraison.

**Independent Test**: envoyer un message depuis le formulaire et vérifier qu'il parvient à
l'équipe ; s'inscrire à la newsletter et vérifier la demande de confirmation.

**Acceptance Scenarios**:

1. **Given** la page Qui sommes-nous / Contact, **When** elle s'affiche, **Then** elle
   présente l'équipe et son expertise, mentionne sobrement les partenariats (plateforme
   Cloud HDS, financement) et propose le formulaire de contact.
2. **Given** le formulaire rempli (motif, coordonnées, message), **When** le visiteur
   l'envoie, **Then** le message est transmis à l'équipe et une confirmation s'affiche.
3. **Given** un champ obligatoire manquant ou invalide, **When** le visiteur envoie,
   **Then** le formulaire signale le champ concerné, conserve la saisie et n'envoie rien.
4. **Given** un téléphone ou un email non renseigné par l'administrateur, **When** la page
   s'affiche, **Then** la ligne correspondante est masquée.
5. **Given** le pied de page, **When** il s'affiche, **Then** il présente le logo blanc, les
   liens contact, qui sommes-nous, mentions légales, CGV, CGU, politique de confidentialité
   et gestion des cookies, ainsi que l'inscription à la newsletter.
6. **Given** une adresse email saisie pour la newsletter, **When** le visiteur valide,
   **Then** il reçoit une demande de confirmation et n'est inscrit qu'après l'avoir validée.

---

### User Story 6 - Mettre à jour les contenus sans développeur (Priority: P3)

L'administrateur ExploCardio.fr modifie lui-même les messages du bandeau, les six tuiles, le
bloc actualités et les coordonnées de contact. Les changements sont visibles sur le site sans
intervention technique.

**Why this priority**: l'autonomie éditoriale est un critère d'acceptation du module, mais le
site peut ouvrir avec des contenus initiaux.

**Independent Test**: modifier un message du bandeau, une tuile et une actualité, puis
vérifier leur affichage sur le site public.

**Acceptance Scenarios**:

1. **Given** un administrateur, **When** il ajoute, modifie, ordonne, active ou désactive un
   message du bandeau, **Then** le site reflète le changement.
2. **Given** un administrateur, **When** il modifie le titre, la phrase, le lien ou le badge
   d'une tuile, **Then** la tuile est mise à jour sur l'accueil.
3. **Given** un administrateur, **When** il publie ou retire une actualité, **Then** le bloc
   actualités est mis à jour.
4. **Given** un administrateur, **When** il renseigne ou vide l'email, le téléphone ou
   l'adresse, **Then** la ligne correspondante apparaît ou disparaît partout où elle est
   affichée.
5. **Given** un visiteur ou un client non administrateur, **When** il tente d'accéder à ces
   fonctions, **Then** l'accès lui est refusé.

---

### Edge Cases

- Aucune promotion en cours (aucun message actif, ou période de validité échue) : le bandeau
  n'est pas affiché et ne laisse pas d'espace vide.
- Aucune actualité publiée : la section actualités est masquée.
- Une tuile, une carte ou un méga-menu pointe vers une page d'un module non encore livré : le
  visiteur n'arrive jamais sur une erreur.
- Titre de tuile ou message de bandeau très long : le texte reste lisible et la grille n'est
  pas déformée.
- Logo de marque partenaire manquant : la tuile affiche le nom de la marque en texte.
- Navigation au clavier uniquement ou avec un lecteur d'écran : tous les menus, la recherche
  et le bandeau cookies restent utilisables.
- Zoom du texte à 200 % : aucun contenu n'est tronqué ni superposé.
- Panier vide : le compteur n'affiche pas de pastille.
- Recherche indisponible : un message invite à utiliser la navigation, sans bloquer la page.
- Envois répétés ou automatisés du formulaire de contact : ils sont limités sans gêner un
  visiteur légitime.
- Page inexistante : une page d'erreur à la charte propose l'accueil, la recherche et les
  familles de produits.

## Requirements *(mandatory)*

### Functional Requirements

**En-tête et navigation**

- **FR-001** : Le site DOIT afficher sur toutes les pages une barre de navigation qui reste
  fixe en haut de l'écran, surmontée du bandeau promotionnel en période de promotion.
- **FR-002** : Le bandeau promotionnel DOIT apparaître uniquement en période de promotion,
  c'est-à-dire quand au moins un message est actif et dans sa période de validité. Le
  visiteur NE DOIT PAS pouvoir le masquer. Le bandeau DOIT faire défiler les messages en
  cours, et le visiteur DOIT pouvoir mettre ce défilement en pause.
- **FR-003** : La barre de navigation DOIT présenter le logo horizontal compact (lien vers
  l'accueil) et les sept entrées : Holter ECG, Holter tensionnel, Épreuve d'effort,
  Accessoires & consommables, Services, Financement, Qui sommes-nous / Contact.
- **FR-004** : Chaque entrée DOIT ouvrir un méga-menu sobre, moins haut et moins large que
  la page, contenant sous-catégories, produits phares et liens rapides.
- **FR-005** : Les méga-menus DOIVENT s'ouvrir au survol, au toucher et au clavier, et se
  fermer par Échap ou par un clic à l'extérieur.
- **FR-006** : L'en-tête DOIT proposer la recherche, un accès au panier avec le nombre
  d'articles, et un accès « Mon compte / Connexion ».
- **FR-007** : Sur mobile, la navigation DOIT être repliée derrière une icône et donner accès
  au même contenu que sur ordinateur.
- **FR-008** : Tout produit du catalogue DOIT être atteignable en 3 clics maximum depuis
  l'accueil.
- **FR-009** : L'offre « ECG de repos » DOIT être accessible depuis le méga-menu de l'entrée
  « Holter ECG », comme sous-catégorie clairement nommée. Elle n'a pas d'entrée propre dans
  la barre de navigation.

**Recherche**

- **FR-010** : La recherche DOIT proposer des suggestions dès 2 caractères saisis, groupées
  par type : produits, consommables, services, tutoriels, FAQ.
- **FR-011** : La recherche DOIT retrouver un article par sa référence fabricant ou sa
  référence de consommable, et le classer en premier en cas de correspondance exacte.
- **FR-012** : La recherche DOIT ignorer les différences d'accents, de casse et de tirets.
- **FR-013** : Une recherche sans résultat DOIT l'indiquer et proposer des chemins
  alternatifs (familles de produits, contact).
- **FR-014** : Les prix éventuellement montrés dans les suggestions et résultats DOIVENT
  être affichés HT.

**Page d'accueil**

- **FR-015** : La page d'accueil DOIT présenter, dans cet ordre, les 8 sections : héros,
  accès rapide, équipement et marques, offre digitale et flexibilité, offre de bienvenue,
  service et fidélité, actualités, contact.
- **FR-016** : Le héros DOIT présenter, sur le fond eucalyptus pâle de la charte, le logo
  empilé, le titre « Le spécialiste des explorations fonctionnelles cardiaques », la mention
  « (hors imagerie) », les grands points décoratifs et les deux boutons « Découvrir le
  catalogue » et « Demander une mise à disposition ».
- **FR-017** : L'accès rapide DOIT présenter 6 tuiles carrées (Holter ECG, Holter
  tensionnel, Épreuve d'effort, Hébergement des données de santé, Assistance et service,
  Financement), chacune avec un fond d'encart doux de la charte, la pastille des trois
  points, un titre, une phrase courte et un lien.
- **FR-018** : La grille d'accès rapide DOIT afficher 3 tuiles par ligne sur ordinateur, 2
  sur tablette et 1 sur mobile.
- **FR-019** : La section équipement et marques DOIT présenter 3 cartes (Holter ECG, Holter
  tensionnel / MAPA, Épreuve & écho d'effort), puis une grille de marques en tuiles
  uniformes, logos en niveaux de gris, en couleur au survol ou au focus.
- **FR-020** : La section offre digitale et flexibilité DOIT présenter : achat direct,
  financement, mise à disposition au mois, pack dépannage express, logiciel Cloud, outils en
  ligne (tutos, espace client, contact WhatsApp).
- **FR-021** : Les éléments « Hébergement des données de santé » et « logiciel Cloud »
  DOIVENT porter le badge « En préparation » tant que l'administrateur ne l'a pas retiré.
- **FR-022** : L'offre de bienvenue DOIT apparaître dans un encart lin avec un bouton
  d'inscription et un texte modifiable par l'administrateur. Texte initial : « Un
  tensiomètre électronique offert avec votre première commande, pour toute inscription avec
  abonnement à la newsletter » (modalité de remise fixée par F02).
- **FR-023** : La section service et fidélité DOIT présenter le parcours en 3 étapes
  (consommables → points → hotline et SAV offerts) sous forme de trois cercles numérotés de
  taille croissante reliés par des flèches fines, ainsi que les engagements de réactivité.
- **FR-024** : La section actualités DOIT afficher les actualités, nouveaux produits et
  nouvelles offres publiés, les plus récents en premier.
- **FR-025** : Le bloc contact DOIT présenter uniquement « Régis Andrieu, fondateur » sur fond
  sombre. L'email, le téléphone et l'adresse sont saisis plus tard dans le back-office et
  chaque ligne reste masquée tant qu'elle est vide.
- **FR-026** : Tout emplacement de photo non fourni DOIT être remplacé par l'emplacement
  provisoire prévu par la charte.

**Pied de page et page Qui sommes-nous / Contact**

- **FR-027** : Le pied de page DOIT apparaître sur toutes les pages, sur fond sombre, avec le
  logo blanc, les liens contact, qui sommes-nous, mentions légales, CGV, CGU, politique de
  confidentialité, gestion des cookies, et l'inscription à la newsletter.
- **FR-028** : L'inscription à la newsletter DOIT recueillir un consentement explicite et
  n'être effective qu'après confirmation par email. Chaque envoi DOIT permettre la
  désinscription.
- **FR-029** : La page Qui sommes-nous / Contact DOIT présenter l'équipe, son expertise, les
  partenariats (plateforme Cloud HDS, financement), le téléphone et l'email s'ils sont
  renseignés, et un formulaire de contact.
- **FR-030** : Le formulaire de contact DOIT recueillir un motif, des coordonnées et un
  message, valider les champs, transmettre le message à l'équipe et confirmer l'envoi au
  visiteur.
- **FR-031** : Le formulaire de contact DOIT informer le visiteur de l'usage de ses données
  et l'avertir de n'y saisir aucune donnée de patient.
- **FR-032** : Le formulaire de contact DOIT être protégé contre les envois automatisés.

**Consentement aux cookies**

- **FR-033** : À la première visite, le site DOIT afficher un bandeau cookies où le refus
  est aussi simple et visible que l'acceptation.
- **FR-034** : Aucun traceur non essentiel NE DOIT être déposé avant un consentement
  explicite.
- **FR-035** : Le choix DOIT être conservé, et le visiteur DOIT pouvoir le modifier à tout
  moment depuis le lien « Gestion des cookies » du pied de page.

**Contenus administrables**

- **FR-036** : L'administrateur DOIT pouvoir, sans développeur, gérer les messages du
  bandeau (texte, lien, ordre, activation, dates de début et de fin), les 6 tuiles (titre, phrase, lien, badge), les
  actualités (titre, texte, image, lien, publication) et les coordonnées de contact (email,
  téléphone, adresse).
- **FR-037** : F01 DOIT livrer un mini back-office limité à ces contenus, avec une connexion
  administrateur. Ces fonctions DOIVENT être réservées aux administrateurs authentifiés, et
  chaque modification DOIT être journalisée. Le back-office complet (F13) reprendra et
  étendra ces écrans.
- **FR-038** : F01 DOIT livrer une page de présentation simple pour chaque famille de
  produits et chaque service de la navigation et des tuiles (Holter ECG, Holter tensionnel,
  Épreuve d'effort, Accessoires & consommables, Services, Hébergement des données de santé,
  Assistance et service, Financement, mise à disposition). Chaque page présente l'offre en
  quelques lignes et liste les produits correspondants fournis par le connecteur Odoo
  quand ils existent, avec leur prix HT. Les modules suivants enrichiront ces pages.
- **FR-046** : Les destinations des tuiles, cartes, boutons et méga-menus DOIVENT toujours
  mener à une page existante, jamais à une erreur ni à une page d'attente vide.

**Charte, accessibilité et langue**

- **FR-039** : Toutes les couleurs, polices, rayons et espacements DOIVENT provenir des
  tokens de la charte. Aucune valeur de couleur ni police NE DOIT être codée en dur.
- **FR-040** : Le logo DOIT toujours provenir des fichiers de `docs/brand/assets/` : version
  horizontale dans l'en-tête, version empilée dans le héros, version blanche sur fond sombre.
- **FR-041** : Aucun pastel de la charte NE DOIT être utilisé pour du texte.
- **FR-042** : L'interface DOIT respecter le niveau WCAG 2.2 AA : contrastes (≥ 4,5:1 pour
  le texte, ≥ 3:1 pour les composants), focus visible, cibles tactiles de 44 px minimum,
  respect de la préférence de réduction des animations.
- **FR-043** : L'affichage DOIT être correct sur mobile, tablette et ordinateur, sans
  défilement horizontal.
- **FR-044** : Tous les textes DOIVENT être en français, au vouvoiement, dans le ton sobre de
  la charte. Le nom s'écrit toujours « ExploCardio.fr ».
- **FR-045** : Aucun visuel interdit par la charte (cœur, tracé ECG, pictogramme médical
  cliché, dégradé vif, ombre lourde, photo de stock générique) NE DOIT apparaître.

**Site de démonstration (phase 1)**

- **FR-047** : En phase 1, l'accès au site DOIT être protégé par un mot de passe.
- **FR-048** : En phase 1, le site NE DOIT PAS être indexé par les moteurs de recherche.
- **FR-049** : En phase 1, un bandeau « Version de démonstration » DOIT être affiché sur
  toutes les pages, distinct du bandeau promotionnel et impossible à masquer.
- **FR-050** : Le formulaire de contact et l'inscription à la newsletter DOIVENT passer par
  le connecteur emailing ; en phase 1, son mode démonstration n'envoie aucun email réel.

### Key Entities

- **Message promotionnel** : texte court du bandeau, lien facultatif, ordre d'affichage,
  état actif ou inactif, dates de début et de fin de la promotion.
- **Entrée de navigation** : libellé, destination, et contenu de son méga-menu
  (sous-catégories, produits phares, liens rapides).
- **Tuile d'accès rapide** : titre, phrase courte, lien, fond d'encart, badge facultatif,
  position dans la grille.
- **Marque partenaire** : nom, logo, famille d'équipement, ordre d'affichage.
- **Actualité** : titre, texte court, image facultative, lien, type (actualité, nouveau
  produit, nouvelle offre), date et état de publication.
- **Coordonnées de contact** : email, téléphone, adresse, chacune facultative.
- **Message de contact** : motif, coordonnées de l'expéditeur, texte, date, état de
  traitement.
- **Inscription newsletter** : adresse email, date du consentement, état (en attente,
  confirmée, désinscrite).
- **Choix de consentement** : finalités acceptées ou refusées, date du choix.
- **Élément recherchable** : tout contenu trouvable par la recherche, avec son type, son
  titre, ses références et sa destination.

## Success Criteria *(mandatory)*

### Measurable Outcomes

Chaque critère est marqué [Phase 1] s'il se vérifie avec les connecteurs de démonstration,
ou [Phase 3] s'il nécessite les vrais services. Sauf mention contraire, les scénarios
d'acceptation des parcours se vérifient en phase 1.

- **SC-001** [Phase 1] : Depuis l'accueil, chacune des 6 tuiles mène à sa page en 1 clic (6 sur 6).
- **SC-002** [Phase 1] : 100 % des produits du catalogue sont atteignables en 3 clics maximum depuis
  l'accueil.
- **SC-003** [Phase 1] : Un administrateur modifie un message du bandeau, une tuile ou une actualité
  en moins de 5 minutes, sans développeur, et le changement est visible sur le site en moins
  d'une minute.
- **SC-004** [Phase 1] : Un contrôle des interfaces de F01 ne relève aucune couleur ni police hors des
  tokens de la charte.
- **SC-005** [Phase 1] : Un audit d'accessibilité des pages de F01 ne relève aucune non-conformité
  WCAG 2.2 AA, et aucun texte en couleur pastel.
- **SC-006** [Phase 1] : Toutes les pages de F01 s'affichent sans défilement horizontal ni contenu
  tronqué de 320 px à 1920 px de large.
- **SC-007** [Phase 1] : À la première visite, le bandeau cookies apparaît, le refus demande le même
  nombre de gestes que l'acceptation (un), et aucun traceur non essentiel n'est déposé avant
  le choix.
- **SC-008** [Phase 1] : Les suggestions de recherche apparaissent en moins d'une seconde après la
  saisie du deuxième caractère.
- **SC-009** [Phase 1] : Une référence fabricant exacte place l'article correspondant en première
  position dans 100 % des cas testés.
- **SC-010** [Phase 1] : Lors d'un test avec des médecins, au moins 9 sur 10 citent, après 30 secondes
  sur l'accueil, les trois familles d'équipements et au moins deux services.
- **SC-011** [Phase 1] : Tout le parcours (menus, recherche, formulaire, bandeau cookies) est
  réalisable au clavier seul.
- **SC-012** [Phase 1] : Aucun lien de l'en-tête, de l'accueil ou du pied de page ne mène à une
  erreur.

## Assumptions

Les points marqués « confirmé » n'étaient pas tranchés dans la demande initiale ; ils ont été
validés par la responsable du projet le 2026-10-12.

- **Offre de bienvenue (confirmé)** : le bouton d'inscription mène à la création de
  compte professionnel. Les conditions d'attribution du tensiomètre (compte validé,
  abonnement à la newsletter, remise avec la première commande) relèvent du module comptes
  (F02). Une inscription à la
  newsletter seule, depuis le pied de page, ne donne pas droit au cadeau.
- **Bandeau promotionnel (confirmé)** : il n'apparaît qu'en période de promotion et n'est
  pas masquable. La mise en pause du défilement est conservée : c'est une exigence
  d'accessibilité (WCAG 2.2 AA), pas un masquage.
- **Grille « 2 puis 1 » (confirmé)** : 2 tuiles par ligne sur tablette
  et 1 sur mobile.
- **« Découvrir le catalogue » (confirmé)** : mène à une vue d'ensemble des familles de
  produits. « Demander une mise à disposition » mène au parcours de mise à disposition, ou
  au formulaire de contact avec ce motif présélectionné tant que ce parcours n'existe pas.
- **Motifs du formulaire de contact (confirmé)** : liste initiale proposée — information
  produit, mise à disposition, financement, assistance, autre. Liste modifiable par
  l'administrateur. Le SAV n'étant pas géré par le site (constitution v2.2.0), le motif
  « Assistance » affiche au-dessus du formulaire les boutons de contact WhatsApp (F09).
- **Contenu des méga-menus (confirmé)** : sous-catégories issues du catalogue ; produits
  phares et liens rapides choisis par l'administrateur.
- **Engagements de réactivité (confirmé)** : les délais annoncés (réponse, dépannage) ne
  sont pas chiffrés dans la demande. Le texte est saisi par l'administrateur ; rien n'est
  affiché tant qu'il est vide.
- **Textes légaux (confirmé)** : mentions légales, CGV, CGU et politique de
  confidentialité sont fournis par ExploCardio.fr. F01 livre les pages et leurs liens, pas
  leur rédaction.
- **Destinataire des messages de contact (confirmé)** : adresse définie par
  l'administrateur. Les messages sont aussi conservés et consultables par l'équipe.
- **Recherche** : elle couvre les contenus existants au moment de la livraison. Tutoriels et
  FAQ y entrent quand leurs modules sont livrés, sans changement de comportement.
- **Comptes administrateur** : les comptes du mini back-office de F01 sont créés par
  l'équipe technique ; leur gestion complète (rôles, création, révocation) relève de F13.
- **Panier et compte** : F01 livre les accès dans l'en-tête. Le panier, la connexion et
  l'espace client relèvent d'autres modules ; le compteur affiche le contenu réel du panier
  dès que celui-ci existe.
- **Cookies** : le choix est conservé 6 mois, conformément aux recommandations de la CNIL.
  Le bandeau ne propose que les finalités réellement utilisées. Tant que le site n'utilise
  que des cookies strictement nécessaires (décision du 2026-10-15 : pas de mesure
  d'audience pour l'instant), il informe le visiteur sans lui demander de consentement, et
  le lien « Gestion des cookies » mène à la page qui décrit ces cookies ; dès qu'une finalité
  soumise au consentement est ajoutée, les boutons « Tout accepter » et « Tout refuser »
  apparaissent (FR-033 à FR-035).
- **Newsletter** : l'envoi passe par l'outil d'emailing d'ExploCardio.fr ; l'inscription est
  confirmée par email (double consentement).
- **Marques affichées** : celles de la brochure — Holter ECG : DMS ; Holter tensionnel /
  MAPA : DMS, SunTech, Microlife WatchBP 03, IEM Mobil-O-Graph ; épreuve et écho d'effort :
  DMS, Norav, Ergoline, RAM, Koch Évolution, SunTech Tango M2. L'accord d'usage des logos est à la charge d'ExploCardio.fr.
- **Photos** : les photos réelles d'équipements seront fournies plus tard ; les emplacements
  provisoires sont acceptés à la mise en ligne.
- **Données** : les produits, catégories, références et prix affichés ou recherchés
  proviennent d'Odoo, via son connecteur (base fictive en phase 1, principe III). Les
  contenus de l'accueil et de l'en-tête sont réels dès la phase 1.
- **Périmètre** : site en français, pour des professionnels de santé de France
  métropolitaine. Aucune donnée de patient n'est collectée.
