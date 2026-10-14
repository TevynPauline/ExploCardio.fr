# Feature Specification: F03 — Catalogue et fiches produit à onglets

**Feature Branch**: `003-catalogue-fiches-produit`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "F03 — Catalogue et fiches produit à onglets : catégories, pages services, pages catégorie avec cartes et filtres, fiche équipement avec sélecteur de formule (Acheter, Mise à disposition mensuelle, Financement longue durée), onglets d'information, fiche consommable, données saisies au back-office. Objectif : un catalogue court et clair, où chaque fiche permet de choisir entre acheter, louer ou financer."

## Contexte et objectif

ExploCardio.fr propose un catalogue volontairement court, limité aux explorations
fonctionnelles cardiaques hors imagerie. F03 livre ce catalogue : les pages catégorie, les
pages services, la fiche équipement et la fiche consommable.

Son objectif : sur chaque fiche, le médecin choisit entre **acheter**, **louer** ou
**financer** aussi simplement qu'on choisit une option sur une fiche produit d'apple.com, et
voit aussitôt le prix et le contenu correspondants.

**Hors périmètre de F03** : le panier, la commande, le paiement et le parcours de demande de
financement (F04), le parcours de mise à disposition (F05), le calcul des points
et droits d'assistance (F06), les tutoriels et la bibliothèque de documents (F09), le
back-office complet (F13), la gestion des produits, configurations, prix et stocks, qui se
fait dans Odoo (base fictive en phase 1). F03
affiche les informations de ces modules et y renvoie, sans les réaliser.

**Lien avec F01 et F02** : les pages catégorie et services de F03 remplacent les pages de
présentation simples livrées par F01 (FR-038 de F01), aux mêmes adresses. La navigation, les
méga-menus et la recherche de F01 mènent aux pages de F03. Les règles de compte de F02
s'appliquent : tout visiteur consulte le catalogue et ses prix, seul un compte validé peut
finaliser une commande.

**Phases (constitution v2.1.0)** : en phase 1, F03 fonctionne avec le connecteur Odoo de démonstration : produits,
configurations, prix, stocks et barèmes viennent de sa base fictive, qui reprend les
références réelles de la brochure. Les contenus du catalogue (textes, photos, documents,
publication) sont réels dès la phase 1 et gérés dans le back-office.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Parcourir une catégorie (Priority: P1)

Un cardiologue ouvre une catégorie, par exemple Holter tensionnel. Il lit une courte
introduction, voit les produits sous forme de cartes avec leur prix HT, repère ceux qui sont
disponibles en location et affine par marque, type ou disponibilité.

**Why this priority**: c'est le chemin principal vers un produit et la condition de la
règle « 3 clics maximum » de la constitution.

**Independent Test**: ouvrir chaque catégorie, vérifier le contenu des cartes, appliquer
chaque filtre et ouvrir une fiche depuis une carte.

**Acceptance Scenarios**:

1. **Given** une page catégorie, **When** elle s'affiche, **Then** elle présente un texte
   d'introduction court puis les produits en cartes, chacune avec photo, marque, nom, prix
   HT « à partir de » et, le cas échéant, la mention « Disponible en location ».
2. **Given** une catégorie, **When** le visiteur applique un filtre marque, type ou
   disponibilité, **Then** la liste se met à jour, le nombre de résultats est indiqué et
   les filtres actifs sont visibles et retirables.
3. **Given** des filtres sans aucun résultat, **When** la liste s'affiche, **Then** un
   message le dit et propose de retirer les filtres.
4. **Given** une carte produit, **When** le visiteur clique dessus, **Then** il arrive sur
   la fiche du produit.
5. **Given** un produit indisponible, **When** sa carte s'affiche, **Then** elle indique
   « indisponible » ou « délai X jours ».
6. **Given** la catégorie ECG de repos, **When** elle s'affiche, **Then** elle présente
   quelques modèles et le formulaire « Vous cherchez un autre modèle ? ».
7. **Given** n'importe quel produit du catalogue, **When** on compte les clics depuis
   l'accueil, **Then** sa fiche est atteinte en 3 clics maximum.

---

### User Story 2 - Choisir sa formule sur une fiche équipement (Priority: P1)

Sur la fiche d'un équipement, le médecin choisit entre « Acheter », « Mise à disposition
mensuelle (sans engagement) » et « Financement longue durée ». Le prix, le contenu et le
bouton d'action changent aussitôt, sans rechargement de la page.

**Why this priority**: c'est la promesse centrale du module et du modèle économique. Elle
rend visibles, côte à côte, les trois façons de s'équiper.

**Independent Test**: sur une fiche proposant les trois formules, passer de l'une à
l'autre et vérifier que le prix, le contenu et le bouton changent sans rechargement ;
ajouter une configuration au panier.

**Acceptance Scenarios**:

1. **Given** une fiche équipement, **When** elle s'affiche, **Then** elle présente la
   galerie photos, la marque, le nom, une description courte orientée bénéfices, la
   disponibilité et le sélecteur de formule.
2. **Given** le sélecteur, **When** le visiteur choisit une autre formule, **Then** le
   prix, le contenu et le bouton d'action se mettent à jour sans rechargement de la page,
   et le changement est annoncé aux lecteurs d'écran.
3. **Given** la formule « Acheter », **When** elle est sélectionnée, **Then** la fiche
   affiche les configurations standard (par exemple appareil seul, appareil + logiciel
   Cloud, pack complet avec accessoires), le prix HT de la configuration choisie et le
   bouton d'ajout au panier.
4. **Given** une configuration choisie, **When** le visiteur en choisit une autre,
   **Then** le prix, la référence, le contenu et la disponibilité se mettent à jour.
5. **Given** la formule « Mise à disposition mensuelle », **When** elle est sélectionnée,
   **Then** la fiche affiche le prix du premier mois, le prix des mois suivants, le contenu
   du pack (enregistreur, accès logiciel Cloud, formation), le kit d'accessoires requis et
   un bouton vers le parcours de mise à disposition.
6. **Given** la formule « Financement longue durée », **When** elle est sélectionnée,
   **Then** la fiche affiche une mensualité indicative « à partir de » selon la durée, la
   mention de son caractère indicatif, et le bouton « Demander mon financement ». Si
   l'administrateur a forcé un montant pour ce client connecté, c'est ce montant qui
   s'affiche.
7. **Given** un équipement qui ne propose pas l'une des formules, **When** la fiche
   s'affiche, **Then** cette formule n'apparaît pas dans le sélecteur.
8. **Given** un lien partagé vers une fiche avec une formule choisie, **When** il est
   ouvert, **Then** la fiche s'affiche sur cette formule.
9. **Given** un visiteur non connecté ou un compte en attente, **When** il ajoute un
   produit au panier, **Then** l'ajout est accepté ; la finalisation reste soumise aux
   règles de F02.

---

### User Story 3 - Commander un consommable rapidement (Priority: P1)

Le médecin recommande des électrodes ou des brassards. Il voit le prix à l'unité et par
lot, les conditionnements, les dégressifs, les équipements compatibles, et ajoute au panier
en un geste.

**Why this priority**: les consommables sont l'achat récurrent du site et la source des
droits d'assistance. Leur commande doit être la plus rapide du site.

**Independent Test**: ouvrir une fiche consommable, changer de conditionnement et de
quantité, vérifier le prix appliqué, puis ajouter au panier depuis la fiche et depuis
l'onglet « Consommables compatibles » d'un équipement.

**Acceptance Scenarios**:

1. **Given** une fiche consommable, **When** elle s'affiche, **Then** elle présente le prix
   HT unitaire, le prix par lot, les conditionnements disponibles et les équipements
   compatibles.
2. **Given** des dégressifs de quantité, **When** le visiteur augmente la quantité,
   **Then** le prix unitaire appliqué et le total se mettent à jour, et les paliers sont
   affichés.
3. **Given** une fiche consommable ou une liste de consommables compatibles, **When** le
   visiteur utilise l'ajout rapide, **Then** l'article est ajouté au panier sans quitter la
   page, et une confirmation s'affiche.
4. **Given** le programme d'assistance actif, **When** la fiche consommable s'affiche,
   **Then** elle indique les points ou droits d'assistance générés par l'achat.
5. **Given** un client qui a déjà commandé ce consommable, **When** il consulte son
   historique ou la fiche, **Then** il dispose de l'action « Commander à nouveau ».
6. **Given** un équipement compatible, **When** le visiteur clique dessus depuis la fiche
   consommable, **Then** il arrive sur la fiche de cet équipement.

---

### User Story 4 - S'informer avant de décider (Priority: P2)

Sous le sélecteur de formule, le médecin consulte les onglets d'information : caractéristiques
techniques, contenu du coffret, consommables compatibles, logiciel associé, documents et
garantie. Il voit aussi les produits associés.

**Why this priority**: l'information détaillée rassure et évite un appel à l'équipe, mais
la fiche reste utilisable avec le seul sélecteur.

**Independent Test**: sur une fiche complète, ouvrir chaque onglet à la souris et au
clavier, télécharger un document et ajouter un consommable compatible au panier.

**Acceptance Scenarios**:

1. **Given** une fiche équipement, **When** le visiteur ouvre un onglet, **Then** son
   contenu s'affiche sans rechargement de la page.
2. **Given** un onglet sans contenu pour ce produit, **When** la fiche s'affiche, **Then**
   cet onglet n'apparaît pas.
3. **Given** l'onglet « Documents », **When** le visiteur choisit une notice ou une fiche
   technique, **Then** il peut la consulter ou la télécharger, avec son type et sa taille
   indiqués.
4. **Given** l'onglet « Consommables compatibles », **When** il s'affiche, **Then** chaque
   consommable présente son prix HT et un ajout rapide au panier.
5. **Given** une fiche produit, **When** elle s'affiche, **Then** elle propose des produits
   associés et des ventes additionnelles (consommables, accessoires) choisis pour ce
   produit.
6. **Given** un écran mobile, **When** les onglets s'affichent, **Then** ils restent
   lisibles et utilisables, avec des cibles tactiles d'au moins 44 px.

---

### User Story 5 - Voir une disponibilité fiable (Priority: P2)

Le médecin voit, sur les cartes et les fiches, si un produit est disponible, sous quel
délai, ou indisponible. Cette information reflète Odoo, lu par son connecteur.

**Why this priority**: un médecin pressé ne doit pas découvrir une rupture après avoir
commandé. La fiabilité de cette information conditionne la confiance.

**Independent Test**: passer un produit en rupture dans la base fictive du connecteur Odoo
(phase 1) ou dans Odoo (phase 3) et vérifier, dans le délai prévu, l'affichage sur sa carte, sa fiche et dans les listes où il apparaît.

**Acceptance Scenarios**:

1. **Given** un produit en stock, **When** sa fiche s'affiche, **Then** elle indique
   qu'il est disponible.
2. **Given** un produit passé en rupture dans Odoo (base fictive en phase 1), **When** une
   page qui le présente est affichée ou rechargée, **Then** il apparaît, dans le délai prévu, « indisponible » ou
   « délai X jours ».
3. **Given** un produit dont le parc de location est épuisé mais le stock de vente
   disponible, **When** la fiche s'affiche, **Then** la disponibilité est indiquée
   séparément pour chaque formule.
4. **Given** un produit en « délai X jours », **When** le visiteur l'ajoute au panier,
   **Then** l'ajout est accepté et le délai est rappelé. **Given** un produit
   « indisponible », **Then** l'ajout au panier n'est pas proposé.
5. **Given** Odoo momentanément injoignable, **When** une fiche
   s'affiche, **Then** elle reste consultable, n'affirme pas une disponibilité non vérifiée
   et invite à réessayer ou à contacter l'équipe.

---

### User Story 6 - Tenir les contenus du catalogue à jour (Priority: P2)

L'équipe crée les produits, leurs configurations, leurs prix et leurs stocks dans Odoo (base
fictive en phase 1). Dans le back-office du site, l'administrateur rédige ce qui les
présente : textes, photos, documents, compatibilités, produits associés, puis publie.

**Why this priority**: sans contenus, un produit d'Odoo n'est pas présentable. Le partage
des rôles évite qu'une même donnée se saisisse à deux endroits (principe III).

**Independent Test**: pour un produit présent dans la base fictive, rédiger ses contenus
dans le back-office, le publier et vérifier son affichage ; vérifier qu'aucun écran du
back-office ne permet de modifier un prix ou un stock.

**Acceptance Scenarios**:

1. **Given** un produit présent dans Odoo, **When** l'administrateur rédige ses contenus
   dans le back-office et le publie, **Then** il apparaît dans sa catégorie avec ses prix,
   configurations et formules lus dans Odoo.
2. **Given** un prix ou un stock modifié dans Odoo, **When** la page est affichée, **Then**
   le site présente la nouvelle valeur dans le délai prévu.
3. **Given** un produit en préparation, **When** il n'est pas publié, **Then** il est
   invisible du public et absent de la recherche.
4. **Given** le back-office du site, **When** l'administrateur cherche à modifier un prix,
   un stock, une référence ou une configuration, **Then** aucun écran ne le permet ; la
   donnée est affichée avec l'indication qu'elle se gère dans Odoo.
5. **Given** un produit incomplet (contenus manquants, ou absent d'Odoo), **When**
   l'administrateur tente de le publier, **Then** la publication est refusée avec la liste
   de ce qui manque.

---

### User Story 7 - Demander un devis pour un autre ECG de repos (Priority: P3)

Le médecin ne trouve pas le modèle d'ECG de repos qu'il cherche. Il remplit le formulaire
« Vous cherchez un autre modèle ? » et reçoit un devis de l'équipe.

**Why this priority**: l'ECG de repos est une offre complémentaire. Le formulaire évite
d'élargir le catalogue tout en répondant à la demande.

**Independent Test**: envoyer une demande depuis la catégorie ECG de repos et vérifier
qu'elle parvient à l'équipe avec toutes les informations saisies.

**Acceptance Scenarios**:

1. **Given** le formulaire, **When** le visiteur indique le modèle ou le besoin, ses
   coordonnées et valide, **Then** la demande est transmise à l'équipe et une confirmation
   s'affiche.
2. **Given** un client connecté, **When** il ouvre le formulaire, **Then** ses coordonnées
   sont préremplies.
3. **Given** un champ obligatoire manquant, **When** il valide, **Then** le champ est
   signalé, la saisie est conservée et rien n'est envoyé.

---

### User Story 8 - Découvrir les services (Priority: P3)

Le médecin consulte les pages services : hébergement des données de santé, assistance et
SAV, financement, installation et formation. Chacune explique l'offre et mène à l'action
correspondante.

**Why this priority**: les services distinguent ExploCardio.fr d'un simple revendeur, mais
leur parcours détaillé relève d'autres modules.

**Independent Test**: ouvrir chaque page service et suivre son bouton d'action.

**Acceptance Scenarios**:

1. **Given** une page service, **When** elle s'affiche, **Then** elle présente l'offre, ses
   bénéfices, son tarif HT lorsqu'il est standard, et un bouton vers l'action
   correspondante.
2. **Given** la page « Hébergement des données de santé », **When** elle s'affiche,
   **Then** elle porte le badge « En préparation » tant que l'administrateur ne l'a pas
   retiré, et ne propose aucune souscription.
3. **Given** le module de destination d'un bouton non encore livré, **When** le visiteur
   clique, **Then** il arrive sur le formulaire de contact avec le motif présélectionné.

---

### Edge Cases

- Catégorie sans aucun produit publié : la page reste accessible, avec son introduction et
  une invitation à contacter l'équipe.
- Produit sans photo : l'emplacement provisoire de la charte est affiché.
- Produit proposé uniquement à la mise à disposition : la carte affiche le prix mensuel « à
  partir de », pas un prix d'achat.
- Une seule configuration à l'achat : le choix de configuration n'est pas affiché.
- Configuration indisponible alors que les autres le sont : elle reste visible, marquée
  indisponible, et les autres restent commandables.
- Quantité demandée supérieure au stock d'un consommable : le visiteur est informé de la
  quantité disponible et du délai pour le reste.
- Prix modifié pendant qu'une fiche est ouverte : le prix appliqué est celui en vigueur au
  moment de l'ajout au panier, et le visiteur en est informé s'il diffère.
- Produit retiré du catalogue : son adresse n'affiche pas une erreur brute ; elle indique
  que le produit n'est plus proposé et suggère sa catégorie.
- Nom de produit ou liste de caractéristiques très longs : la mise en page reste lisible.
- Navigation au clavier ou avec un lecteur d'écran : sélecteur de formule, onglets, galerie
  et filtres restent utilisables.
- Fichier d'import contenant des références en double ou des prix invalides : les lignes
  concernées sont rejetées et signalées, les autres sont traitées.

## Requirements *(mandatory)*

### Functional Requirements

**Structure du catalogue**

- **FR-001** : Le catalogue DOIT être organisé en cinq catégories : Holter ECG, Holter
  tensionnel / MAPA, Épreuve / écho d'effort (avec l'environnement de l'épreuve d'effort),
  ECG de repos, Accessoires & consommables.
- **FR-050** : Les marques présentées DOIVENT être celles de la brochure : Holter ECG : DMS ;
  Holter tensionnel / MAPA : DMS, SunTech, Microlife WatchBP 03, IEM Mobil-O-Graph ; épreuve
  et écho d'effort : DMS, Norav, Ergoline, RAM, Koch Évolution, SunTech Tango M2.
- **FR-002** : Le site DOIT proposer quatre pages services : Hébergement des données de
  santé, Assistance et SAV, Financement, Installation et formation.
- **FR-003** : Tout produit publié DOIT être atteignable en 3 clics maximum depuis
  l'accueil.
- **FR-004** : Le catalogue NE DOIT contenir que des produits du périmètre défini par la
  constitution (principe I).

**Pages catégorie**

- **FR-005** : Chaque page catégorie DOIT présenter un texte d'introduction court, puis la
  liste des produits publiés sous forme de cartes.
- **FR-006** : Chaque carte DOIT afficher la photo, la marque, le nom, le prix HT « à partir
  de », la disponibilité lorsqu'elle n'est pas immédiate, et la mention « Disponible en
  location » si le produit est proposé à la mise à disposition.
- **FR-007** : Chaque page catégorie DOIT proposer des filtres par marque, par type et par
  disponibilité, combinables, avec le nombre de résultats et un moyen de tout retirer.
- **FR-008** : La catégorie ECG de repos DOIT présenter quelques modèles et un formulaire
  « Vous cherchez un autre modèle ? » de demande de devis.
- **FR-009** : Le formulaire de devis DOIT recueillir le modèle ou le besoin, les
  coordonnées et un message, être transmis à l'équipe, et confirmer l'envoi au visiteur.

**Fiche équipement**

- **FR-010** : La fiche équipement DOIT présenter une galerie photos, la marque, le nom,
  une description courte orientée bénéfices, la disponibilité et un sélecteur de formule.
- **FR-011** : Le sélecteur DOIT proposer, sous forme d'onglets ou de pilules, les formules
  « Acheter », « Mise à disposition mensuelle (sans engagement) » et « Financement longue
  durée », limitées à celles que l'administrateur a activées pour ce produit.
- **FR-012** : Le changement de formule ou de configuration DOIT mettre à jour le prix, le
  contenu, la disponibilité et le bouton d'action sans rechargement de la page.
- **FR-013** : La formule « Acheter » DOIT afficher les configurations standard
  prédéfinies, le prix HT de la configuration choisie et un bouton d'ajout au panier.
- **FR-014** : La formule « Mise à disposition » DOIT afficher le prix du premier mois, le
  prix des mois suivants, le contenu du pack, le kit d'accessoires requis et un bouton vers
  le parcours de mise à disposition.
- **FR-015** : La formule « Financement » DOIT afficher une mensualité indicative « à
  partir de » pour chaque durée proposée, la mention de son caractère indicatif et non
  contractuel, et un bouton « Demander mon financement ».
- **FR-016** : La mensualité indicative DOIT être calculée automatiquement à partir du prix
  du produit et d'un barème par durée réglé dans Odoo (base fictive en phase 1, principe VI).
- **FR-046** : Une mensualité forcée pour un produit, soit pour tous les visiteurs, soit pour
  un client en particulier, DOIT pouvoir être définie dans Odoo. Le montant forcé pour un
  client n'est visible que de ce client, une fois connecté ; il prime sur le montant forcé
  général, qui prime sur le calcul automatique.
- **FR-047** : Sans montant forcé, le site DOIT afficher le calcul automatique. La traçabilité
  des montants forcés relève d'Odoo.
- **FR-017** : Aucune formule standard NE DOIT afficher « prix sur demande ».
- **FR-018** : La fiche DOIT proposer, sous le sélecteur, les onglets d'information :
  Caractéristiques techniques, Contenu du coffret, Consommables compatibles, Logiciel
  associé, Documents, Garantie. Un onglet sans contenu NE DOIT PAS être affiché.
- **FR-019** : L'onglet « Consommables compatibles » DOIT permettre l'ajout rapide au
  panier de chaque consommable.
- **FR-020** : L'onglet « Documents » DOIT donner accès aux notices, fiches techniques et
  tutoriels vidéo rattachés au produit.
- **FR-021** : La fiche DOIT proposer des produits associés et des ventes additionnelles
  choisis par l'administrateur ou déduits des compatibilités.

**Fiche consommable**

- **FR-022** : La fiche consommable DOIT afficher le prix HT unitaire, le prix par lot, les
  conditionnements, les dégressifs de quantité éventuels et les équipements compatibles.
- **FR-023** : Le prix appliqué DOIT se mettre à jour selon le conditionnement et la
  quantité choisis.
- **FR-024** : La fiche consommable DOIT proposer un ajout rapide au panier.
- **FR-025** : La fiche consommable DOIT indiquer les points ou droits d'assistance générés
  par l'achat, selon les règles en vigueur du programme (F06).
- **FR-026** : Un client DOIT disposer de l'action « Commander à nouveau » pour un
  consommable déjà commandé, depuis son historique.

**Prix**

- **FR-027** : Chaque prix DOIT être affiché HT en premier, avec le montant TTC indiqué en
  complément, de façon moins appuyée.
- **FR-028** : Les prix DOIVENT être visibles de tout visiteur, sans compte.
- **FR-029** : Les prix, dégressifs, tarifs de mise à disposition et barèmes de financement
  DOIVENT être réglés dans Odoo (base fictive en phase 1), jamais codés en dur (principe VI).

**Disponibilité**

- **FR-030** : La disponibilité affichée DOIT provenir d'Odoo, lu par son connecteur, et prendre
  l'un des états : disponible, délai X jours, indisponible.
- **FR-031** : Un changement de stock ou de disponibilité dans Odoo DOIT être visible sur le
  site, sur les cartes, les fiches et les listes : en moins d'une minute avec la base
  fictive, en moins de 5 minutes avec Odoo réel.
- **FR-032** : La disponibilité DOIT être indiquée séparément pour l'achat et pour la mise
  à disposition quand elles diffèrent.
- **FR-033** : Un produit en « délai X jours » DOIT rester commandable, avec le délai
  affiché sur la fiche et rappelé au panier. Un produit « indisponible » NE DOIT PAS pouvoir
  être ajouté au panier ; la fiche reste consultable et propose de contacter l'équipe.
- **FR-048** : L'état d'un produit hors stock, « délai X jours » (avec le nombre de jours) ou
  « indisponible », DOIT être défini dans Odoo et lu par le site.

**Pages services**

- **FR-034** : Chaque page service DOIT présenter l'offre, ses bénéfices, son tarif HT
  lorsqu'il est standard, et un bouton vers l'action correspondante.
- **FR-035** : La page « Hébergement des données de santé » DOIT porter le badge « En
  préparation » tant que l'administrateur ne l'a pas retiré.

**Données et administration**

- **FR-036** : Le back-office du site DOIT permettre de gérer, sans développeur, les seuls
  contenus du catalogue : textes, photos, documents, compatibilités, produits associés,
  ordre d'affichage, sous-catégories de filtre et publication. Les produits, configurations,
  prix, stocks, références et formules proposées se gèrent dans Odoo (principe III).
- **FR-049** : La base fictive du connecteur Odoo DOIT reprendre les références produits
  réelles de la brochure, avec des prix, stocks et configurations de démonstration
  (principe III).
- **FR-037** : Un produit DOIT pouvoir être en préparation ou publié. Seul un produit
  présent dans Odoo et complet (nom, catégorie, prix, photo ou emplacement provisoire) est
  visible.
- **FR-038** : Toutes les données de produits, prix et stocks DOIVENT être lues par le
  connecteur Odoo (principe III), avec les notions d'Odoo : article, variante, référence.
  Aucune page NE DOIT appeler Odoo directement.
- **FR-039** : Les contenus marketing (textes, photos, documents, produits associés) DOIVENT
  être conservés par le site, distincts des données de gestion, et rattachés à l'article
  d'Odoo par sa référence.
- **FR-040** : Toute modification de contenu ou de publication DOIT être journalisée avec son
  auteur et sa date. La traçabilité des prix relève d'Odoo.

**Charte, accessibilité et langue**

- **FR-041** : La présentation DOIT suivre la charte : photo sur fond ivoire, marque en
  surtitre, nom en titre de carte, prix en Semibold, formules en onglets ou pilules, et
  toutes les valeurs de style issues des tokens.
- **FR-042** : Le sélecteur de formule, les onglets, la galerie et les filtres DOIVENT être
  utilisables au clavier et annoncés correctement aux lecteurs d'écran, au niveau WCAG 2.2
  AA.
- **FR-043** : Chaque photo de produit DOIT avoir un texte de remplacement.
- **FR-044** : Les textes DOIVENT être en français, au vouvoiement, dans le ton sobre de la
  charte, sans jargon marketing.
- **FR-045** : Aucun champ des formulaires de F03 NE DOIT inviter à saisir une donnée de
  patient.

### Key Entities

- **Catégorie** : nom, texte d'introduction, ordre d'affichage, types (sous-catégories)
  servant de filtre.
- **Marque** : nom, logo.
- **Produit (article)** : équipement, consommable ou accessoire. Nom, marque, catégorie,
  type, description courte, état de publication, formules proposées.
- **Configuration (variante)** : déclinaison standard d'un produit à l'achat. Libellé,
  référence, référence fabricant, contenu, prix HT, taux de TVA, disponibilité.
- **Offre de mise à disposition** : pour un produit, prix du premier mois, prix des mois
  suivants, contenu du pack, kit d'accessoires requis, disponibilité du parc.
- **Barème de financement** : durées proposées et coefficient de chaque durée, réglés par
  l'administrateur.
- **Mensualité forcée** : pour un produit et une durée, montant qui remplace le calcul
  automatique, pour tous ou pour un client donné.
- **Conditionnement** : pour un consommable, unité, lot, quantité par lot, prix.
- **Palier dégressif** : quantité minimale et prix unitaire associé.
- **Compatibilité** : lien entre un consommable ou accessoire et un équipement.
- **Contenu de fiche** : caractéristiques techniques, contenu du coffret, logiciel associé,
  garantie, photos, documents, produits associés.
- **Document** : notice, fiche technique ou tutoriel vidéo rattaché à un produit.
- **Page service** : titre, présentation, bénéfices, tarif éventuel, badge, action.
- **Demande de devis** : modèle ou besoin, coordonnées, message, date, état de traitement.

## Success Criteria *(mandatory)*

### Measurable Outcomes

Chaque critère est marqué [Phase 1] s'il se vérifie avec les connecteurs de démonstration,
ou [Phase 3] s'il nécessite les vrais services. Sauf mention contraire, les scénarios
d'acceptation des parcours se vérifient en phase 1.

- **SC-001** [Phase 1] : 100 % des prix affichés dans le catalogue sont HT, avec le TTC en complément.
- **SC-002** [Phase 1] : Sur une fiche, le changement de formule met à jour le prix et le contenu
  sans rechargement de la page, en moins d'une seconde.
- **SC-003** [Phase 3] : Un produit passé en rupture dans Odoo apparaît « indisponible » ou « délai X
  jours » sur le site en moins de 5 minutes, sur toutes les pages qui le présentent.
- **SC-013** [Phase 1] : Un produit passé en rupture dans la base fictive apparaît « indisponible » ou
  « délai X jours » sur le site en moins d'une minute.
- **SC-004** [Phase 1] : 100 % des produits publiés sont atteignables en 3 clics maximum depuis
  l'accueil.
- **SC-005** [Phase 1] : Aucun produit standard publié n'affiche « prix sur demande ».
- **SC-006** [Phase 1] : Un médecin trouve un consommable compatible avec son équipement et l'ajoute
  au panier en moins de 60 secondes.
- **SC-007** [Phase 1] : Lors d'un test avec des médecins, au moins 9 sur 10 identifient sans aide
  les trois façons de s'équiper (acheter, louer, financer) sur une fiche.
- **SC-008** [Phase 1] : Un administrateur rédige et publie les contenus d'un produit présent dans
  Odoo en moins de 10 minutes, sans développeur.
- **SC-009** [Phase 1] : La base fictive reprend 100 % des références produits de la brochure, et
  aucune page du catalogue n'appelle Odoo autrement que par son connecteur.
- **SC-010** [Phase 1] : Un audit des pages de F03 ne relève aucune non-conformité WCAG 2.2 AA ni
  aucune valeur de style hors des tokens de la charte.
- **SC-011** [Phase 1] : Les pages catégorie et les fiches s'affichent correctement de 320 px à
  1920 px de large, sans défilement horizontal.
- **SC-012** [Phase 1] : Aucun lien du catalogue ne mène à une erreur, y compris vers les modules non
  encore livrés.

## Assumptions

Les points marqués « confirmé » n'étaient pas tranchés dans la demande initiale ; ils ont été
validés par la responsable du projet le 2026-10-12.

- **Montant TTC (confirmé)** : calculé à partir du taux de TVA de chaque article, 20 %
  par défaut. Le taux est une donnée de l'article, modifiable par l'administrateur.
- **Formules par produit (confirmé)** : l'achat, la mise à disposition et le financement
  sont activés produit par produit dans Odoo (base fictive en phase 1). Les consommables ne proposent que
  l'achat.
- **Configurations standard (confirmé)** : chaque configuration est une variante avec sa
  référence et son prix propres. Un pack est indisponible si l'un de ses composants l'est.
- **Filtre « type » (confirmé)** : sous-catégories définies par l'administrateur pour
  chaque catégorie (par exemple, dans Accessoires & consommables : électrodes, brassards,
  sacoches, chariots, défibrillateurs).
- **Ordre des produits (confirmé)** : ordre choisi par l'administrateur, avec un tri
  possible par prix. Pas de pagination tant que le catalogue reste court.
- **Demande de devis ECG de repos (confirmé)** : ouverte à tout visiteur, sans compte.
  Elle est transmise à l'équipe comme un message de contact (F01), avec le motif « devis
  ECG de repos ».
- **Points et droits d'assistance (confirmé)** : l'indication n'apparaît sur les fiches
  consommables qu'une fois F06 livré ; d'ici là, rien n'est affiché.
- **« Commander à nouveau » (confirmé)** : l'action dépend de l'historique des commandes
  (F04) ; elle apparaît quand ce module est livré.
- **Mention du financement (confirmé, formulation à valider par le conseil juridique)** : la mensualité est accompagnée de la mention
  « indicatif, sous réserve d'acceptation par notre partenaire financier ». Sa formulation
  exacte est à valider par le conseil juridique d'ExploCardio.fr.
- **Seuil de financement (confirmé)** : le financement n'est proposé que pour les
  produits désignés dans Odoo, sans seuil de prix automatique.
- **Tutoriels vidéo (confirmé)** : l'onglet « Documents » liste les tutoriels rattachés
  au produit quand F09 est livré ; d'ici là, il ne présente que les notices et fiches
  techniques.
- **Panier** : F03 fournit l'action « ajouter au panier ». Le panier lui-même, son compteur
  et la commande relèvent de F04.
- **Parcours de mise à disposition et de financement** : les boutons mènent à F05 et F04.
  Tant que ces modules ne sont pas livrés, ils mènent au formulaire de contact avec le motif
  présélectionné.
- **Taille du catalogue** : quelques dizaines d'équipements et quelques centaines de
  consommables et accessoires au plus.
- **Marques** : celles de la brochure, réparties par catégorie (FR-050). L'accord d'usage des logos, photos et documents des
  fabricants est à la charge d'ExploCardio.fr.
- **Photos** : fournies par ExploCardio.fr ; l'emplacement provisoire de la charte les
  remplace en attendant.
- **Écran de démonstration (F11)** : en mode démonstration uniquement, un écran simple du
  back-office, réservé à l'administrateur, permet de modifier les prix, stocks et
  paramètres commerciaux de la base fictive et de la réinitialiser. Il disparaît en mode
  réel. C'est une exigence de F11 (connecteurs et base de démonstration).
- **Référencement** : chaque catégorie, fiche et page service a une adresse stable et
  lisible, et peut être trouvée par les moteurs de recherche après la mise en ligne. En
  phase 1, le site n'est pas indexé (F01, FR-048).
- **Périmètre** : site en français, professionnels de santé de France métropolitaine, aucune
  donnée de patient.
