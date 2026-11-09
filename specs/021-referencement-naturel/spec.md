# Feature Specification: F21 — Référencement naturel d'explocardio.fr

**Feature Branch**: `021-referencement-naturel` (travail sur `main`, comme les autres modules)

**Created**: 2026-11-06

**Status**: Draft

**Input**: User description: "F21 — Référencement naturel (SEO) d'explocardio.fr, sans publicité
payante. Lot 1 avant l'ouverture (indexation de la page d'attente, Search Console, titres et
descriptions, plan du site, canoniques, données structurées, aperçus de partage, textes
alternatifs, performance mobile, tests de non-régression) ; lot 2 (mots-clés, textes des
catégories, fiches rédigées) ; lot 3 continu (guides, liens, suivi mensuel)."

## Contexte

ExploCardio.fr vise un public étroit : cardiologues libéraux, cabinets et centres en France
métropolitaine. Les recherches sur ce sujet sont peu nombreuses mais très qualifiées (« holter
ECG prix », « location holter tensionnel », nom exact d'un modèle, consommables). Être bien
placé sur ces recherches, sans publicité payante, est le premier canal d'acquisition du site.

Situation au 2026-11-06 :

- `www.explocardio.fr` affiche la page d'attente (F17), aujourd'hui exclue de l'indexation :
  la marque est absente des résultats de recherche.
- La démonstration est protégée par mot de passe et non indexée ; elle DOIT le rester
  (constitution, principe V).
- Il n'a jamais existé d'ancien site : aucune ancienne adresse à rediriger.
- Le site a des adresses lisibles et un titre par fiche produit, mais pas de plan du site, pas
  de données structurées, pas d'adresse canonique, pas d'aperçu de partage, et peu de texte
  sur les pages catégories.

La fonctionnalité est découpée en trois lots livrables séparément :

- **Lot 1 — Fondations, avant l'ouverture** : User Stories 1 à 4.
- **Lot 2 — Mots-clés et contenus des pages existantes** : User Story 5.
- **Lot 3 — Guides, liens et suivi, en continu** : User Stories 6 et 7.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - La marque apparaît dans les résultats dès maintenant (Priority: P1)

Un cardiologue a reçu la brochure au salon ou entendu parler d'ExploCardio. Il tape
« ExploCardio » dans un moteur de recherche et trouve la page d'attente, avec un titre et une
description clairs, avant même l'ouverture du site. Pendant ce temps, le domaine commence à
acquérir de l'ancienneté auprès des moteurs.

**Why this priority**: c'est le seul gain disponible immédiatement, il ne coûte presque rien
et chaque semaine d'indexation gagnée avant l'ouverture compte. Sans lui, la marque reste
introuvable.

**Independent Test**: sur l'adresse de la page d'attente, la page est déclarée indexable,
le fichier des consignes aux robots l'autorise, un plan du site la liste ; sur l'adresse de la
démonstration, rien ne change (tout reste interdit aux robots).

**Acceptance Scenarios**:

1. **Given** la page d'attente en ligne, **When** un robot d'indexation la consulte, **Then**
   elle est autorisée à l'indexation, avec un titre et une description dédiés, une adresse
   canonique et un aperçu de partage (logo, titre, description).
2. **Given** la page d'attente en ligne, **When** un robot consulte les consignes du site,
   **Then** seule la page d'attente (et ses ressources) est autorisée, et un plan du site d'une
   seule adresse est proposé.
3. **Given** l'adresse de la démonstration, **When** un robot la consulte, **Then** toutes les
   pages restent interdites à l'indexation, comme aujourd'hui.
4. **Given** la page d'attente, **When** Pauline prépare la Search Console et Bing Webmaster
   Tools, **Then** le site peut accueillir le code de validation de propriété fourni par ces
   outils sans modification du code (saisi dans la configuration de l'hébergement).

---

### User Story 2 - Chaque page du site ouvert est comprise par les moteurs (Priority: P1)

À l'ouverture, un cardiologue cherche « holter tensionnel MAPA » ou le nom exact d'un modèle.
Le moteur connaît toutes les pages publiques du site, sait laquelle est la bonne version de
chaque page, affiche un titre et une description qui donnent envie de cliquer, et peut montrer
le prix TTC affiché, la disponibilité et le fil d'Ariane directement dans le résultat.

**Why this priority**: sans ces fondations, aucun contenu, même excellent, ne sera bien
positionné. C'est la condition de tout le reste et elle doit être prête le jour de l'ouverture.

**Independent Test**: en mode production sur un environnement de test, contrôler chaque
type de page (accueil, catégorie, sous-catégorie, fiche produit, service, aide, pages légales,
recherche, compte, panier) : présence ou absence d'indexation conforme à la règle, titre et
description uniques, adresse canonique, données structurées valides, plan du site complet.

**Acceptance Scenarios**:

1. **Given** le site en mode production, **When** un robot consulte le plan du site, **Then**
   il y trouve toutes les pages publiques indexables (accueil, catégories, fiches produit
   publiées, services, aide, qui sommes-nous, financement, mise à disposition, pages légales)
   avec leur date de dernière modification, et aucune page privée.
2. **Given** une fiche produit, **When** elle est affichée, **Then** elle porte un titre et une
   description propres au produit, une adresse canonique unique (sans paramètre d'option ni de
   filtre) et une description structurée du produit : nom, marque, référence, image, prix TTC
   affiché en euros (HT précisé à part), disponibilité issue du stock, vendeur ExploCardio.fr.
3. **Given** une page catégorie ou une fiche, **When** elle est affichée, **Then** elle porte la
   description structurée de son fil d'Ariane, identique au fil d'Ariane visible.
4. **Given** l'accueil, **When** il est affiché, **Then** il porte la description structurée de
   l'entreprise (nom ExploCardio.fr, logo, adresse, coordonnées publiques, numéro SIREN).
5. **Given** une page d'aide sous forme de questions-réponses, **When** elle est affichée,
   **Then** elle porte la description structurée de ses questions et réponses.
6. **Given** les pages compte, panier, commande, connexion, inscription, mot de passe,
   préférences, newsletter et résultats de recherche, **When** un robot les consulte, **Then**
   elles sont exclues de l'indexation et absentes du plan du site ; le back-office, l'API et
   la démonstration sont interdits aux robots.
7. **Given** n'importe quelle page publique partagée sur une messagerie ou un réseau social,
   **When** le lien est collé, **Then** un aperçu s'affiche avec titre, description et image
   (image du produit pour une fiche, image par défaut de la marque sinon).
8. **Given** une adresse inexistante ou un produit retiré, **When** elle est consultée,
   **Then** le site répond « page introuvable » avec le bon code, et le produit retiré
   disparaît du plan du site.

---

### User Story 3 - L'équipe règle titres et descriptions depuis le back-office (Priority: P2)

Régis ou Pauline veut améliorer le titre affiché dans Google pour la page « Holter ECG », ou la
description d'une fiche. Dans le back-office, ils modifient le titre et la description de
référencement de la page, voient un aperçu du résultat de recherche et un avertissement si le
texte est trop long. Sans saisie, un titre et une description sont produits automatiquement à
partir du contenu.

**Why this priority**: les textes s'affinent avec le temps, au vu des résultats de la Search
Console. L'équipe doit pouvoir le faire seule, sans développement (constitution : contenus
gérés dans le back-office).

**Independent Test**: modifier le titre de référencement d'une catégorie dans le back-office,
puis vérifier que la page publique le reprend, que l'aperçu correspondait et que vider le champ
rétablit le titre automatique.

**Acceptance Scenarios**:

1. **Given** une page sans titre ni description saisis, **When** elle est affichée, **Then**
   elle porte un titre et une description produits automatiquement, uniques sur le site.
2. **Given** le back-office, **When** un utilisateur ayant le droit de modifier les contenus
   saisit un titre et une description de référencement pour une page (accueil, catégorie,
   service, aide, page éditoriale) ou une fiche produit, **Then** la page publique les reprend
   et la modification est journalisée.
3. **Given** la saisie, **When** le titre dépasse 60 caractères ou la description
   160 caractères, **Then** un avertissement s'affiche (sans bloquer), avec l'aperçu du
   résultat de recherche.
4. **Given** deux pages avec le même titre saisi, **When** l'équipe ouvre le contrôle de
   référencement du back-office, **Then** le doublon est signalé.

---

### User Story 4 - Le référencement ne régresse jamais (Priority: P2)

À chaque modification du site, des contrôles automatiques vérifient que la démonstration
n'est pas indexable, que les pages publiques le sont, que titres, descriptions, canoniques,
données structurées et textes alternatifs sont présents et valides, et que les pages restent
rapides sur mobile. Un oubli bloque la livraison au lieu d'être découvert des semaines plus tard
dans la Search Console.

**Why this priority**: une seule erreur (par exemple la démonstration indexée, ou le site de
production interdit aux robots) peut coûter des mois de référencement. Les contrôles protègent
le travail des lots suivants.

**Independent Test**: introduire volontairement un défaut (image sans texte alternatif, page
sans titre, consigne d'indexation inversée) et constater que les tests échouent.

**Acceptance Scenarios**:

1. **Given** la suite de tests, **When** elle s'exécute, **Then** elle vérifie pour chaque type
   de page la règle d'indexation, le titre, la description, l'adresse canonique et les données
   structurées attendues.
2. **Given** une image de contenu, **When** elle est affichée, **Then** elle a un texte
   alternatif descriptif ; une image décorative est explicitement marquée comme telle. Le
   back-office exige un texte alternatif pour toute image téléversée qui n'est pas décorative.
3. **Given** les pages accueil, catégorie et fiche produit sur mobile, **When** leurs
   performances sont mesurées, **Then** elles respectent les seuils « bons » des signaux
   d'expérience des moteurs (voir SC-004).

---

### User Story 5 - Les pages répondent aux recherches réelles des cardiologues (Priority: P3, lot 2)

Un cardiologue cherche « louer un holter tensionnel » ou « électrodes holter ». Il arrive sur
une page qui répond précisément : une page catégorie avec un texte utile (à quoi sert
l'appareil, comment choisir, achat ou location), ou une fiche produit rédigée par ExploCardio
plutôt que la reprise du texte du fabricant.

**Why this priority**: c'est ce qui positionne le site sur les recherches commerciales, mais
cela demande les fondations du lot 1 et la relecture de Régis.

**Independent Test**: pour un mot-clé prioritaire, vérifier qu'une page lui est attribuée,
que le mot-clé figure dans son titre, son intertitre principal et son texte, et que le texte
a été validé par Régis.

**Acceptance Scenarios**:

1. **Given** le lot 2 démarré, **When** la liste de mots-clés est livrée, **Then** chaque
   mot-clé est classé (recherche d'achat, référence exacte de modèle, consommable), priorisé et
   rattaché à une seule page cible du site ; aucune page ne vise deux fois le même mot-clé.
2. **Given** une page catégorie, **When** son texte éditorial est publié, **Then** il compte
   300 à 600 mots, respecte le ton éditorial (vouvoiement, phrases courtes, sans jargon
   marketing), est relu et validé par Régis, et s'édite depuis le back-office.
3. **Given** une fiche produit prioritaire, **When** sa description est publiée, **Then** elle
   est rédigée par ExploCardio (pas de copie du texte fabricant) et validée par Régis.
4. **Given** les pages catégories, **When** elles sont publiées, **Then** elles renvoient par
   des liens vers les fiches et guides liés, et inversement (maillage interne).

---

### User Story 6 - Des guides pratiques attirent et rassurent (Priority: P3, lot 3)

Un cardiologue se demande « holter 24 h, 48 h ou 7 jours ? » ou « acheter ou louer son
matériel ». Il trouve un guide d'ExploCardio, signé par une personne nommée et relu, qui
répond concrètement et propose les produits adaptés.

**Why this priority**: les guides captent les recherches d'information en amont de l'achat et
renforcent la crédibilité, critère important dans le domaine de la santé. Ils se publient
progressivement après l'ouverture.

**Independent Test**: publier un guide depuis le back-office et vérifier qu'il apparaît dans
l'aide et le plan du site, avec auteur, date de mise à jour et description structurée d'article.

**Acceptance Scenarios**:

1. **Given** le back-office, **When** l'équipe publie un guide, **Then** il porte un auteur
   nommé avec sa fonction, une date de publication et de dernière mise à jour, et apparaît
   dans le plan du site.
2. **Given** un guide publié, **When** il est affiché, **Then** il porte la description
   structurée d'un article (titre, auteur, dates, éditeur ExploCardio.fr) et des liens vers les
   produits concernés.
3. **Given** un guide, **When** il est rédigé, **Then** il ne contient aucune donnée de patient
   ni cas clinique identifiable, et ne donne pas de consigne médicale individuelle.

---

### User Story 7 - L'équipe suit les résultats et développe la notoriété (Priority: P3, lot 3)

Chaque mois, Pauline consulte les pages indexées, les recherches qui amènent des visiteurs,
les positions et les erreurs signalées par la Search Console, et décide des textes à
améliorer. En parallèle, l'équipe obtient des liens depuis des sites reconnus (fabricants
distribués, partenaire de la plateforme Cloud, annuaires professionnels, sociétés savantes,
presse spécialisée).

**Why this priority**: le référencement se construit dans la durée ; ce travail n'est pas du
développement, mais il doit être outillé et cadré.

**Independent Test**: produire un premier bilan mensuel à partir de la Search Console et une
liste de sites cibles pour les liens, avec un texte de présentation prêt à envoyer.

**Acceptance Scenarios**:

1. **Given** la Search Console validée, **When** le bilan mensuel est réalisé, **Then** il
   présente pages indexées, impressions, clics, position moyenne, principales recherches,
   erreurs à corriger et actions décidées.
2. **Given** la stratégie de liens, **When** elle est livrée, **Then** elle liste les sites
   cibles par catégorie, la personne à contacter si connue, un texte de présentation et
   l'état d'avancement ; aucun lien n'est acheté et aucun échange de liens artificiel n'est
   pratiqué.

---

### Edge Cases

- **Bascule de la page d'attente vers le site ouvert** : à l'ouverture, la page d'attente
  disparaît ; son adresse (`/`) devient l'accueil du site, sans perte d'indexation. Les
  adresses éventuellement indexées propres à la page d'attente (`/bientot`) renvoient
  définitivement vers l'accueil.
- **Démonstration et production sur le même code** : la règle d'indexation dépend uniquement
  du mode du site ; une erreur de configuration DOIT aboutir à « non indexable » plutôt qu'à
  « indexable » (sécurité par défaut).
- **Domaine sans « www »** : `explocardio.fr` renvoie définitivement vers
  `https://www.explocardio.fr` ; toutes les adresses canoniques utilisent cette forme.
- **Produit en rupture ou sur commande** : la description structurée indique la disponibilité
  réelle (en stock, sur commande avec délai, rupture) ; le prix déclaré reste le prix public
  affiché (TTC, HT précisé à part), jamais un prix client personnalisé.
- **Produit sans prix public** (cas exceptionnel) : aucune donnée de prix n'est déclarée plutôt
  qu'un prix faux ou nul.
- **Fiche avec options ou variantes** : une seule adresse canonique par produit ; les
  variantes sont décrites dans la même fiche, pas comme des pages concurrentes.
- **Pages de résultats de recherche interne et filtres** : jamais indexées, pour éviter des
  milliers de pages quasi identiques.
- **Image téléversée sans texte alternatif** : refusée par le back-office tant que le texte
  n'est pas saisi ou que l'image n'est pas marquée décorative.
- **Données indisponibles (catalogue injoignable)** : le plan du site reste servi avec les pages
  connues plutôt qu'en erreur ; une erreur temporaire ne retire pas toutes les fiches.
- **Pages légales** : indexables mais sans données structurées commerciales.

## Requirements *(mandatory)*

### Functional Requirements

**Lot 1 — Page d'attente (avant l'ouverture)**

- **FR-001**: La page d'attente DOIT être indexable par les moteurs de recherche. Cette règle
  modifie F17 (FR-002, « elle n'est pas indexée ») et en reprend tout le reste.
- **FR-002**: Sur l'adresse de la page d'attente, les consignes aux robots DOIVENT autoriser
  uniquement la page d'attente et ses ressources, et proposer un plan du site contenant cette
  seule page.
- **FR-003**: La page d'attente DOIT porter un titre et une description dédiés, une adresse
  canonique, un aperçu de partage et la description structurée de l'entreprise.
- **FR-004**: Le site DOIT pouvoir afficher les codes de validation de propriété de la Search
  Console et de Bing Webmaster Tools, saisis dans la configuration de l'hébergement (pas dans
  le code). La validation elle-même est faite par Pauline.
- **FR-005**: La démonstration DOIT rester interdite aux robots et exclue de l'indexation sur
  toutes ses pages, quel que soit le réglage des autres environnements. En cas de
  configuration absente ou incohérente, le site DOIT se comporter comme non indexable.

**Lot 1 — Site ouvert (prêt pour l'ouverture)**

- **FR-006**: Le site DOIT servir un plan du site produit automatiquement : accueil, catégories
  et sous-catégories, fiches produit publiées, services, aide, pages éditoriales et légales,
  chacune avec sa date de dernière modification.
- **FR-007**: Les pages privées ou sans valeur de recherche (compte, panier, commande,
  connexion, inscription, mot de passe, préférences, newsletter, résultats de recherche
  interne, pages filtrées) DOIVENT être exclues de l'indexation et du plan du site ; le
  back-office, l'API et la démonstration DOIVENT être interdits aux robots.
- **FR-008**: Chaque page indexable DOIT avoir une adresse canonique absolue unique, sur
  `https://www.explocardio.fr`, sans paramètre d'option, de filtre ni de suivi.
- **FR-009**: `explocardio.fr` et `http://` DOIVENT renvoyer définitivement vers
  `https://www.explocardio.fr` avec le même chemin.
- **FR-010**: Chaque page indexable DOIT avoir un titre et une description uniques. À défaut de
  saisie, ils DOIVENT être produits automatiquement depuis le contenu (titre : nom de la page,
  complété du type d'appareil et de « ExploCardio.fr » ; description : premières phrases utiles
  du contenu ou résumé du produit), sans dépasser 60 et 160 caractères.
- **FR-011**: Les fiches produit DOIVENT porter la description structurée d'un produit : nom,
  marque, référence, image, description, prix public TTC en euros (tel qu'affiché, HT précisé à part), disponibilité issue du stock,
  vendeur ExploCardio.fr. Aucun prix client personnalisé ni prix nul NE DOIT y figurer.
- **FR-012**: Les pages ayant un fil d'Ariane DOIVENT porter sa description structurée,
  identique au fil d'Ariane affiché.
- **FR-013**: L'accueil DOIT porter la description structurée de l'entreprise : nom
  « ExploCardio.fr », logo officiel, adresse, coordonnées publiques et identifiant légal,
  repris des contenus légaux existants.
- **FR-014**: Les pages de questions-réponses de l'aide DOIVENT porter la description
  structurée de leurs questions et réponses.
- **FR-015**: Chaque page publique DOIT fournir un aperçu de partage : titre, description, image
  (image principale du produit pour une fiche, image de marque par défaut sinon), adresse
  canonique, langue française.
- **FR-016**: Toute image de contenu DOIT avoir un texte alternatif descriptif ; les images
  décoratives DOIVENT être marquées comme telles. Le back-office DOIT exiger l'un ou l'autre au
  téléversement.
- **FR-017**: Chaque page DOIT avoir un seul intertitre principal (titre de niveau 1),
  cohérent avec son titre de référencement.
- **FR-018**: Une adresse inexistante ou un produit retiré DOIT répondre « page introuvable »
  avec le code correspondant ; un produit retiré DOIT disparaître du plan du site.
- **FR-019**: À l'ouverture, l'ancienne adresse de la page d'attente DOIT renvoyer
  définitivement vers l'accueil.
- **FR-020**: Les pages accueil, catégorie et fiche produit DOIVENT respecter, sur mobile, les
  seuils « bons » des signaux d'expérience utilisateur des moteurs de recherche (affichage du
  contenu principal, stabilité de la mise en page, réactivité).

**Lot 1 — Back-office et contrôles**

- **FR-021**: Les utilisateurs ayant le droit de modifier les contenus DOIVENT pouvoir saisir
  un titre et une description de référencement pour l'accueil, chaque catégorie, chaque
  service, chaque page d'aide ou éditoriale et chaque fiche produit, avec un aperçu du
  résultat de recherche et un avertissement non bloquant au-delà de 60 et 160 caractères.
  Ces textes sont des contenus du site (pas des données Odoo) ; leur modification est
  journalisée.
- **FR-022**: Le back-office DOIT proposer un contrôle de référencement listant : titres ou
  descriptions en double, pages sans texte saisi (titre automatique utilisé), images sans
  texte alternatif, fiches sans image.
- **FR-023**: Des tests automatiques DOIVENT vérifier à chaque livraison : la règle
  d'indexation de chaque environnement (démonstration, page d'attente, production), la
  présence et l'unicité des titres et descriptions, les adresses canoniques, la validité des
  données structurées, le contenu du plan du site, les textes alternatifs et un intertitre
  principal par page.

**Lot 2 — Mots-clés et contenus**

- **FR-024**: Une liste de mots-clés DOIT être établie, classée (recherche d'achat, référence
  exacte de modèle, consommable, information), priorisée et rattachée chacune à une seule page
  cible.
- **FR-025**: Chaque page catégorie DOIT pouvoir afficher un texte éditorial de 300 à
  600 mots, éditable dans le back-office, placé sans gêner l'accès aux produits (les produits
  restent visibles sans défilement excessif, conformément à la règle des 3 clics).
- **FR-026**: Les textes de catégories et les descriptions de fiches prioritaires DOIVENT être
  rédigés par ExploCardio (pas de copie de texte fabricant), respecter le ton éditorial et être
  validés par Régis avant publication.
- **FR-027**: Les catégories, fiches et guides DOIVENT être reliés par des liens internes
  pertinents (produits liés, guides liés, catégorie parente).

**Lot 3 — Guides, liens, suivi**

- **FR-028**: L'aide DOIT pouvoir accueillir des guides avec auteur nommé et sa fonction, date
  de publication et de mise à jour, liens vers les produits liés et description structurée
  d'article.
- **FR-029**: Les guides NE DOIVENT contenir aucune donnée de patient ni consigne médicale
  individuelle.
- **FR-030**: Une stratégie de liens DOIT être documentée : sites cibles par catégorie
  (fabricants distribués, partenaire de la plateforme Cloud, annuaires professionnels de
  santé, sociétés savantes et congrès, presse spécialisée), texte de présentation, suivi
  d'avancement. Aucun achat de liens ni échange artificiel.
- **FR-031**: Un bilan mensuel de référencement DOIT pouvoir être produit à partir de la
  Search Console : pages indexées, impressions, clics, position moyenne, principales
  recherches, erreurs, actions décidées.
- **FR-032**: F21 N'AJOUTE aucun outil de mesure d'audience sur le site ; le suivi repose sur
  les outils des moteurs de recherche, qui ne déposent rien chez le visiteur. Un éventuel outil
  de mesure d'audience fera l'objet d'une décision séparée, avec consentement.

### Key Entities *(include if feature involves data)*

- **Réglage de référencement d'une page** : titre et description saisis (facultatifs), page ou
  produit concerné, date et auteur de la dernière modification. Contenu du site, géré dans le
  back-office.
- **Texte éditorial de catégorie** (lot 2) : catégorie, texte, état (brouillon, validé par
  Régis, publié), auteur, dates.
- **Guide** (lot 3) : titre, texte, auteur nommé et fonction, dates de publication et de mise à
  jour, produits liés, réglage de référencement.
- **Mot-clé cible** (lot 2) : expression, famille, priorité, page cible, volume estimé ; tenu
  dans un document de travail plutôt que dans le site.
- **Image** : texte alternatif ou marque « décorative » (complète les images déjà gérées).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** [Phase 1] : sur l'adresse de démonstration, 100 % des pages testées sont
  interdites aux robots et exclues de l'indexation ; sur l'adresse de la page d'attente, la
  page d'attente est indexable et seule autorisée.
- **SC-002** [Phase 1] : 100 % des pages indexables testées ont un titre (60 caractères au
  plus) et une description (160 caractères au plus) uniques, une adresse canonique et un seul
  intertitre principal ; 100 % des pages privées sont exclues de l'indexation.
- **SC-003** [Phase 1] : les données structurées de l'accueil, d'une catégorie, d'une fiche
  produit et d'une page d'aide sont valides sans erreur selon le validateur de résultats
  enrichis.
- **SC-004** [Phase 3] : sur mobile, les pages accueil, catégorie et fiche produit affichent
  leur contenu principal en moins de 2,5 s, ont un décalage de mise en page inférieur à 0,1 et
  réagissent à une action en moins de 200 ms ; score de performance mobile d'au moins 90.
- **SC-005** [Phase 3] : dans les 4 semaines suivant la validation de la Search Console, la
  page d'attente est indexée et apparaît en première position sur la recherche
  « ExploCardio ».
- **SC-006** [Phase 3] : 1 mois après l'ouverture, au moins 90 % des adresses du plan du site
  sont indexées, sans erreur bloquante signalée.
- **SC-007** [Phase 3] : 6 mois après l'ouverture, au moins 50 % des mots-clés prioritaires
  du lot 2 placent la page cible dans les 10 premiers résultats.
- **SC-008** [Phase 1] : 100 % des images de contenu ont un texte alternatif ou sont marquées
  décoratives ; le contrôle du back-office ne signale aucun doublon de titre.
- **SC-009** [Phase 1] : un test qui inverse la règle d'indexation de la démonstration, retire
  un titre ou un texte alternatif fait échouer la suite de tests.

## Assumptions

- L'adresse de référence du site est `https://www.explocardio.fr` (forme avec « www »).
- Le mode « production » et le mode « page d'attente » existent déjà dans la configuration de
  l'hébergement (F17) ; F21 s'appuie sur eux pour décider de l'indexation.
- Les prix déclarés aux moteurs sont les prix publics affichés à tous, en TTC comme à
  l'affichage (constitution 2.3.0), le HT étant précisé à part ; le calcul du TTC vient de F22 ; les prix clients
  (F14) ne sont jamais exposés aux robots.
- Les données de l'entreprise (raison sociale, adresse, SIREN, coordonnées) viennent des
  contenus légaux déjà saisis (Kbis, mentions légales).
- Pauline crée et valide les comptes Search Console et Bing Webmaster Tools, et saisit les
  codes de validation dans la configuration de l'hébergement ; Pauline ou Régis créent la
  fiche d'établissement Google si l'entreprise le souhaite (hors développement).
- La rédaction des textes (lots 2 et 3) est préparée sous forme de brouillons, puis relue et
  validée par Régis ; aucun texte médical n'est publié sans sa validation.
- Les tests de performance mobile sont mesurés en laboratoire en phase 1 et confirmés sur le
  site réel en phase 3.
- Hors périmètre : publicité payante, mesure d'audience avec traceurs, site en d'autres
  langues, référencement d'images ou de vidéos dédié, achat de liens.
