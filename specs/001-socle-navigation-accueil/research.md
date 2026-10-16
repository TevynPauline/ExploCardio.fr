# Recherche et décisions techniques — F01 Socle, navigation et accueil

**Date** : 2026-10-15
**Plan** : [plan.md](plan.md)

F01 s'appuie sur tout ce que F11 a livré (stack, registre des connecteurs, base du site,
authentification, contrôles de charte et d'accessibilité, tests). Ce document ne traite que
les choix propres à F01. Les choix de F11 sont dans
[../011-connecteurs-base-demonstration/research.md](../011-connecteurs-base-demonstration/research.md).

---

## R1. Rendu des pages et fraîcheur des contenus

- **Décision** : pages publiques rendues côté serveur. Les données lentes ou partagées sont
  mises en cache avec des étiquettes (`unstable_cache` de Next.js) :
  - contenus du site (bandeau, tuiles, actualités, coordonnées, menus) : étiquette `contenus`,
    invalidée par chaque enregistrement du mini back-office ;
  - catalogue lu par le connecteur Odoo : étiquettes `catalogue`, `prix`, `stock` (déjà
    définies par F11), durée 5 minutes en mode réel ; invalidées aussitôt par l'écran de
    démonstration.
- **Justification** : SC-003 demande un changement visible en moins d'une minute ;
  l'invalidation par étiquette le rend immédiat. Le rendu serveur sert le référencement et la
  performance (pages utilisables en moins de 2 s sur mobile 4G).
- **Écarté** : génération statique pure (les contenus changent sans redéploiement) ;
  rendu côté navigateur (plus lent, mauvais pour le référencement).

## R2. En-tête, méga-menus et menu mobile

- **Décision** : composant client unique pour la barre de navigation, construit sur le
  modèle d'accessibilité « bouton qui déplie un panneau » (`aria-expanded`, `aria-controls`),
  et non sur le rôle ARIA `menu` réservé aux menus d'application. Ouverture au survol (délai
  de 150 ms pour éviter les ouvertures accidentelles), au clic, au toucher et au clavier
  (Entrée, Espace, flèche bas) ; fermeture par Échap, clic à l'extérieur ou sortie de la zone,
  avec retour du focus sur l'entrée (scénarios US2-3 et US2-4).
- **Contenu** : les sous-catégories viennent du catalogue (connecteur Odoo) ; les produits
  phares et liens rapides sont choisis par l'administrateur (mini back-office). Le contenu
  est préparé côté serveur et passé au composant : aucun appel au connecteur depuis le
  navigateur.
- **Mobile** : même contenu dans un panneau plein écran (accordéons), ouvert par une icône
  « Menu » ; cibles de 44 px ; défilement de la page bloqué pendant l'ouverture.
- **Barre fixe** : `position: sticky` en haut de la page ; le bandeau promotionnel est au-dessus
  et défile avec la page (FR-001). Le bandeau de démonstration de F11 reste tout en haut.
- **Écarté** : bibliothèque de composants externe (dépendance et style à reprendre pour la
  charte) ; menus en survol seul (inaccessibles au toucher et au clavier).

## R3. Bandeau promotionnel

- **Décision** : messages lus dans la base du site (contenus de type `bandeau`, actifs et dans
  leur période). Rotation toutes les 6 secondes, bouton « Mettre en pause » toujours
  présent ; rotation désactivée d'office si `prefers-reduced-motion: reduce` (US2-8) ; zone
  annoncée poliment aux lecteurs d'écran seulement à la demande (pas d'annonce automatique à
  chaque rotation). Aucun message actif : le bandeau n'est pas rendu, sans espace vide.
- **Lien avec F06** : les promotions (remises, ventes flash, codes) sont définies dans Odoo ;
  le bandeau, lui, est un contenu du site rédigé par l'administrateur (principe III : le
  back-office gère les contenus).

## R4. Recherche instantanée

- **Décision** : un **index de recherche en mémoire du serveur**, reconstruit au plus toutes
  les 5 minutes (et aussitôt après une modification de l'écran de démonstration), alimenté :
  - par le connecteur Odoo, via une nouvelle opération du domaine catalogue, **« Lister les
    références »** (une ligne par variante : référence interne, référence fabricant, nom,
    marque, type, catégorie, prix HT, disponibilité) ;
  - par les pages du site (familles, services, pages d'information) ;
  - plus tard, par les tutoriels et la FAQ (F09), sans changement de comportement.
- **Normalisation** : minuscules, accents retirés (décomposition Unicode), tirets, points,
  espaces et barres obliques retirés pour la comparaison des références (FR-012). « 98-0239-22 »,
  « 98 0239 22 » et « 98023922 » donnent le même résultat.
- **Classement** : correspondance exacte d'une référence en premier (FR-011, SC-009), puis
  début de nom, puis contenu ; résultats groupés par type (produits, consommables, services,
  tutoriels, FAQ) ; groupe absent s'il est vide (US4-5). Prix affichés HT (FR-014).
- **Accès** : route serveur `GET /api/recherche?q=` (au moins 2 caractères, 8 suggestions par
  groupe au plus) et page `/recherche?q=` pour la liste complète. Le navigateur attend 150 ms
  après la dernière frappe avant d'interroger ; une requête en cours est annulée par la
  suivante. Objectif : suggestions en moins d'une seconde (SC-008).
- **Indisponibilité** : si le connecteur Odoo est en panne et qu'aucun index n'est encore en
  mémoire, la recherche affiche « La recherche est momentanément indisponible » et propose
  la navigation, sans bloquer la page.
- **Justification** : le même comportement dans les deux modes (principe III) — la recherche
  d'Odoo ne sait pas ignorer accents et tirets ; un index en mémoire n'est qu'un cache, pas une
  copie durable des données d'Odoo. Volume : quelques centaines de références, quelques
  centaines de kilo-octets.
- **Écarté** : moteur de recherche externe (Algolia, Meilisearch…) : service supplémentaire,
  coût, données envoyées hors du site ; recherche plein texte PostgreSQL : il faudrait copier
  le catalogue d'Odoo dans la base du site.

## R5. Consentement aux cookies

- **Constat** : à ce jour, le site ne dépose **aucun traceur non essentiel** : la session de
  connexion, l'accès au site de démonstration, le panier et le choix de consentement sont des
  cookies strictement nécessaires, exemptés de consentement.
- **Décision du 2026-10-15** (analyse, point A2) : le bandeau ne propose que les finalités
  réellement utilisées. Tant qu'il n'y en a aucune (décision D3 : pas de mesure d'audience),
  il **informe** sobrement que seuls des cookies nécessaires au fonctionnement sont utilisés,
  avec un bouton « J'ai compris » et un lien vers la page Cookies, sans demander de
  consentement inutile. Le mécanisme ci-dessous est prêt et s'active dès qu'une finalité est
  déclarée dans le code.
- **Mécanisme** : un bandeau maison, sans service tiers (aucune requête externe, principe V et
  garde réseau de F11) :
  - boutons « Tout accepter », « Tout refuser » et « Personnaliser », les deux premiers au
    même niveau et de même apparence (FR-033, SC-007) ;
  - finalités prévues : « Mesure d'audience » et « Contenus tiers » (vidéos intégrées), toutes
    deux refusées par défaut ;
  - choix conservé 6 mois dans un cookie strictement nécessaire (`ec_consentement` : version,
    date, finalités), puis redemandé ;
  - lien « Gestion des cookies » du pied de page qui rouvre le panneau (FR-035) ;
  - un composant `<SiConsentement finalite="…">` n'affiche un contenu tiers qu'après accord :
    tout futur traceur devra passer par lui.
- **Écarté** : plateformes de consentement du marché (Axeptio, Didomi, Tarteaucitron
  hébergé…) : requêtes externes et coût pour un site sans traceur aujourd'hui. Pourra être
  revu si une mesure d'audience non exemptée est choisie (décision D3 du plan).

## R6. Formulaire de contact

- **Décision** : action serveur ; validation des champs côté serveur (et rappel côté
  navigateur), saisie conservée en cas d'erreur, erreurs reliées aux champs
  (`aria-describedby`) et annoncées.
- **Traitement** : le message est enregistré dans la base du site (entité « Message de
  contact » de F11), puis une notification d'équipe est envoyée par le connecteur emailing au
  destinataire défini par l'administrateur (boîte de démonstration en phase 1, FR-050).
- **Anti-robots (FR-032)** sans service tiers : champ piège invisible, délai minimal de
  3 secondes entre l'affichage et l'envoi, limite de 5 envois par heure et par adresse IP
  (empreinte de l'adresse, jamais l'adresse en clair), au-delà un message clair invite à
  réessayer plus tard.
- **Adresse du visiteur** : lue dans l'en-tête `X-Forwarded-For` **uniquement** quand la
  variable `TRUSTED_PROXY=1` indique que le site est derrière le proxy de l'hébergeur (dernier
  saut ajouté par ce proxy), sinon l'adresse de la connexion. À vérifier lors de la
  publication chez o2switch (T095 de F11) ; si aucune adresse fiable n'est disponible, la
  limite s'applique par session de navigateur.
- **Écarté** : CAPTCHA tiers (reCAPTCHA, hCaptcha) : traceur, requête externe, gêne pour les
  visiteurs ; Friendly Captcha ou Turnstile : idem.

## R7. Inscription à la newsletter (double consentement)

- **Décision** : le formulaire du pied de page enregistre une **inscription en attente**
  (email, texte du consentement présenté, date), envoie un email de confirmation par le
  connecteur emailing (lien valable 7 jours, jeton aléatoire dont seule l'empreinte est
  conservée). Le clic confirme l'inscription, inscrit le consentement dans l'historique de
  la base du site (entité « Consentement » de F11), puis met à jour le contact marketing par
  le connecteur emailing. Chaque envoi comporte un lien de désinscription (FR-028).
- **Confidentialité** : la réponse affichée est identique que l'adresse soit déjà inscrite
  ou non (pas de divulgation).
- **Lien avec F02** : l'inscription seule à la newsletter ne donne pas droit au cadeau de
  bienvenue (hypothèse confirmée de la spec).

## R8. Mini back-office des contenus

- **Décision** : rubrique **Contenus** dans le back-office existant (`/admin/contenus`),
  réservée aux administrateurs avec double authentification (F11). Écrans : bandeau, tuiles,
  actualités, coordonnées et textes de l'accueil, menus (produits phares et liens rapides),
  marques partenaires, motifs du formulaire de contact. Chaque enregistrement est journalisé
  (journal des actions de F11) et invalide l'étiquette `contenus`.
- **Images** (actualités, logos de marques) : téléversées dans le back-office, contrôlées
  (types PNG, JPEG, WebP, SVG nettoyé ; 2 Mo au plus ; texte de remplacement obligatoire),
  stockées dans un dossier de stockage du serveur hors du code (`STORAGE_DIR`), servies par une
  route du site avec mise en cache et des en-têtes qui interdisent tout script
  (`Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox`,
  `X-Content-Type-Options: nosniff`) ; un SVG ouvert directement est servi en pièce jointe. Chez o2switch, ce dossier est sur le disque de
  l'hébergement, inclus dans la sauvegarde quotidienne.
- **F13** reprendra et étendra ces écrans (FR-037).

## R9. Pages de familles, de services et pages légales

- **Familles** (Holter ECG, ECG de repos, Holter tensionnel, Épreuve d'effort, Accessoires &
  consommables) : texte de présentation court et liste des articles fournis par le connecteur
  Odoo, avec prix HT « à partir de » et disponibilité (FR-038). Tant que F03 n'a pas livré les
  fiches produit, chaque article est présenté sans lien vers une fiche (FR-046 : jamais
  d'erreur) ; F03 ajoutera les liens, ce qui portera tout produit à 3 clics de l'accueil
  (accueil → famille → fiche, SC-002).
- **Services** (Hébergement des données de santé, Assistance et service, Financement, Mise à
  disposition) et **catalogue** (vue d'ensemble des familles) : textes courts.
- **Textes** : rédigés en fichiers Markdown dans le dépôt (`contenus/`), versionnés, à la
  charte et au vouvoiement ; brouillons proposés par l'équipe technique, validés par la
  porteuse du projet (décision D2). F13 les rendra modifiables dans le back-office.
- **Pages légales** (mentions légales, CGV, CGU, politique de confidentialité, cookies) :
  mêmes fichiers Markdown ; tant que les textes officiels ne sont pas fournis, la page
  affiche un texte provisoire explicite (« Texte en cours de validation ») plutôt qu'une
  erreur. La page « Cookies » décrit les cookies réellement utilisés (R5).
- **Panier** : tant que F04 n'existe pas, la page `/panier` indique « Votre panier est vide »
  et propose le catalogue ; le compteur de l'en-tête n'affiche pas de pastille (cas limite).

## R10. Marques partenaires

- **Décision** : entité « Marque partenaire » dans la base du site (nom, logo facultatif,
  famille, ordre) ; logos affichés en niveaux de gris par filtre CSS, en couleur au survol
  et au focus ; sans logo, le nom en texte (cas limite). Liste initiale : marques de la
  brochure (FR-019, hypothèses de la spec).
- **Justification** : les logos sont des contenus éditoriaux du site, pas des données de
  gestion d'Odoo.

## R11. Performance de l'accueil

- **Constat F11** : la page provisoire mesurait 1,4 à 2,5 s (élément principal) en 4G simulée,
  le dernier repeint venant du changement de police du bandeau de démonstration.
- **Décisions** : préchargement des seules graisses visibles en haut de page (300 pour le
  titre du héros, 400 et 600) ; police de repli aux métriques ajustées (`size-adjust`,
  `ascent-override`) pour qu'Inter remplace le repli sans décalage ni nouveau rendu visible ;
  logo du héros en SVG intégré avec dimensions fixes ; aucune image lourde au-dessus de la
  ligne de flottaison (emplacements provisoires) ; JavaScript du navigateur limité à la
  barre de navigation, à la recherche, au bandeau et au panneau cookies.
- **Contrôle** : Lighthouse sur l'accueil, la vue catalogue et une page de famille, objectif
  « élément principal affiché en moins de 2 s » en profil mobile 4G ; ajouté à l'intégration
  continue.
- **Mesure retenue (2026-10-16)** : ralentissement **réel** du réseau et du processeur
  (profil « 4G lente » de Lighthouse : latence 562 ms, 1,47 Mbit/s, processeur ralenti 4 fois),
  et non l'estimation par simulation. La simulation donnait de 1,4 à 2,8 s pour une même
  page, car elle ajoute au texte principal le téléchargement de tout le JavaScript chargé avant
  lui, alors que ce JavaScript ne retarde pas l'affichage du texte. Mesures réelles : 1,5 à
  1,8 s sur l'accueil, la vue catalogue et la page Holter ECG.

## R12. Pages d'erreur

- **Décision** : page « introuvable » à la charte (`not-found`) proposant l'accueil, la
  recherche et les familles ; page d'erreur générique (`error`) au même style, sans détail
  technique pour le visiteur. Les erreurs typées des connecteurs (`ServiceUnavailable`…)
  affichent un message sobre dans la section concernée, sans faire échouer toute la page.
