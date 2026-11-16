# Feature Specification: F27 — Nouveau menu et page Informatique médicale

**Feature Branch**: `027-menu-informatique-medicale`

**Created**: 2026-11-16

**Status**: Draft

**Input**: Demande de Pauline et Régis du 2026-11-16, maquette validée par Pauline le même
jour. La barre de menu passe de sept entrées à cinq, sur le modèle des sites spécialisés
(« Produits » regroupe toutes les familles d'appareils). Une nouvelle entrée « Informatique
médicale » présente l'offre PCA de notre partenaire Indoor Informatique (2i) et recueille les
besoins informatiques des cabinets par un court questionnaire.

## Contexte

Aujourd'hui, la barre de menu compte sept entrées (Holter ECG, Holter tensionnel, Épreuve
d'effort, Accessoires & consommables, Services, Financement, Qui sommes-nous / Contact). Elle
prend beaucoup de place et ne laisse aucune entrée pour l'informatique médicale.

Nouvelle barre :

| # | Entrée | Contenu du panneau |
|---|---|---|
| 1 | Produits | Une colonne par famille : Holter ECG, Holter tensionnel / MAPA, Épreuve d'effort, ECG de repos ; trois niveaux tirés des catégories d'Odoo ; lien « Voir tous les produits » |
| 2 | Consommables | Les produits marqués « Consommable » dans Odoo, rangés par examen |
| 3 | Informatique médicale | PCA, matériel informatique, support informatique, hébergement des données de santé, encadré « Décrire mon besoin » |
| 4 | Location et financement | Mise à disposition au mois, dépannage express, financement longue durée |
| 5 | Services | Assistance et service, centre d'aide, installation et formation |
| — | Qui sommes-nous · Contact | Liens simples, à droite, plus discrets |

Partenaire : Patient Care Anywhere® (« PCA ») est une solution d'Indoor Informatique (2i),
fondée par Nelson Dan. PCA rend le cabinet accessible à distance (examens Holter, MAPA,
épreuves d'effort consultables depuis le domicile), avec un hébergement certifié HDS. 2i
fournit aussi du matériel informatique et le support informatique des cabinets : ExploCardio.fr
ne vend ni l'un ni l'autre, il oriente le médecin vers 2i. Une commission est prévue pour chaque
contact envoyé vers 2i par un lien suivi ; ses modalités restent à fixer entre Nelson et Régis.

La page « Hébergement des données de santé » (F12) est fondue dans la page « Informatique
médicale ».

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trouver un produit dans le nouveau menu « Produits » (Priority: P1)

Un cardiologue cherche une sacoche pour son Holter ECG. Il survole « Produits » : un seul
panneau s'ouvre avec une colonne par famille. Dans la colonne « Holter ECG », il voit les
sous-catégories (Enregistreurs, Logiciels, Kits) et, sous « Accessoires Holter ECG » en gras,
les petits liens « Câbles » et « Sacoches ». Il clique sur « Sacoches » et arrive sur la liste
des sacoches pour Holter ECG.

**Why this priority**: c'est le cœur de la réorganisation demandée par Régis ; sans lui, le
nouveau menu n'a pas de sens et les familles d'appareils disparaîtraient de la barre.

**Independent Test**: survoler « Produits », vérifier les quatre colonnes et leurs trois
niveaux, cliquer sur un lien de chaque niveau et vérifier la liste de produits obtenue.

**Acceptance Scenarios**:

1. **Given** l'accueil sur ordinateur, **When** le médecin survole « Produits », **Then** un
   seul panneau s'ouvre avec les colonnes Holter ECG, Holter tensionnel / MAPA, Épreuve
   d'effort et ECG de repos, dans cet ordre, sans produit mis en avant. [Phase 1]
2. **Given** le panneau « Produits » ouvert, **When** le médecin clique sur « Sacoches » sous
   « Accessoires Holter ECG », **Then** il voit uniquement les produits de cette
   sous-sous-catégorie. [Phase 1]
3. **Given** le panneau ouvert, **When** le médecin clique sur le titre d'une famille ou d'une
   sous-catégorie, **Then** il voit tous les produits qu'elle contient, sous-niveaux compris.
   [Phase 1]
4. **Given** une catégorie technique d'Odoo (frais d'importation, logistique, transport, carte
   cadeau, porte-monnaie électronique, dépenses), **When** le menu est affiché, **Then** elle
   n'apparaît nulle part. [Phase 1]
5. **Given** une catégorie sans aucun produit en vente, **When** le menu est affiché, **Then**
   elle n'apparaît pas. [Phase 1]
6. **Given** les catégories rangées par Régis dans la copie de test d'Odoo, **When** le site
   est branché sur cette copie, **Then** le menu reproduit leur arborescence sans aucune
   saisie dans le back-office. [Phase 3]

---

### User Story 2 - Découvrir PCA et décrire son besoin informatique (Priority: P1)

Une cardiologue voudrait relire ses Holter depuis chez elle. Elle ouvre « Informatique
médicale », découvre PCA, comprend en quelques secondes ce que la solution change au cabinet,
puis remplit un questionnaire de trois étapes sans créer de compte. Régis reçoit sa demande et
la rappelle pour préciser le besoin avant de la transmettre à 2i.

**Why this priority**: c'est la nouvelle source de contacts demandée par Régis ; elle remplace
la page « Hébergement des données de santé », qui ne recueillait qu'une inscription d'attente.

**Independent Test**: ouvrir la page, la parcourir, remplir le questionnaire sans être
connecté, vérifier la confirmation affichée et la demande reçue dans le back-office.

**Acceptance Scenarios**:

1. **Given** n'importe quelle page, **When** le visiteur ouvre « Informatique médicale »
   dans le menu, **Then** il arrive sur une page qui présente, dans cet ordre : l'en-tête
   « Votre cabinet accessible partout, en toute sécurité » avec les boutons « Décrire mon
   besoin » et « Découvrir PCA » ; trois bénéfices de PCA ; « Comment ça se passe » en trois
   étapes ; l'encadré « Nous sommes fiers de vous présenter notre partenariat avec PCA » ;
   l'encadré « Besoin d'un prestataire informatique pour votre cabinet ? » ; le
   questionnaire ; le lien vers le site de PCA. [Phase 1]
2. **Given** l'étape 2 de « Comment ça se passe », **When** elle s'affiche, **Then** elle dit
   « On vous appelle » et « Nous précisons avec vous votre cabinet et vos logiciels », sans
   nommer une personne. [Phase 1]
3. **Given** un visiteur non connecté, **When** il remplit les trois étapes du questionnaire et
   l'envoie, **Then** une confirmation lui indique qu'il sera rappelé, et la demande apparaît
   dans le back-office avec toutes ses réponses. [Phase 1]
4. **Given** un médecin connecté, **When** il arrive à l'étape des coordonnées, **Then** ses
   nom, cabinet, e-mail et téléphone sont déjà remplis et modifiables. [Phase 1]
5. **Given** une étape incomplète, **When** le visiteur veut passer à la suivante, **Then** les
   champs manquants sont signalés et il reste sur l'étape. [Phase 1]
6. **Given** une demande envoyée, **When** le connecteur emailing est branché (F25), **Then**
   Régis reçoit aussi la demande par e-mail. [Phase 3]

---

### User Story 3 - Retrouver ses consommables par examen (Priority: P2)

Une secrétaire médicale recommande des électrodes pour le Holter du cabinet. Elle survole
« Consommables » et voit les consommables rangés par examen : pour le Holter ECG, pour la MAPA,
pour l'épreuve d'effort, pour l'ECG de repos. Le même produit (par exemple les protecteurs de
brassards) est aussi visible dans « Produits », dans sa famille.

**Why this priority**: c'est l'achat le plus fréquent, mais les consommables restent trouvables
par « Produits » et par la recherche si cette partie arrive plus tard.

**Independent Test**: marquer un produit « Consommable » dans la base de démonstration, vérifier
qu'il apparaît à la fois dans « Consommables » (sous son examen) et dans « Produits » (dans sa
catégorie).

**Acceptance Scenarios**:

1. **Given** un produit marqué « Consommable » dans Odoo, **When** le visiteur ouvre
   « Consommables », **Then** le produit apparaît sous l'examen de sa famille. [Phase 1]
2. **Given** ce même produit, **When** le visiteur ouvre « Produits », **Then** il apparaît
   aussi dans sa catégorie habituelle. [Phase 1]
3. **Given** un produit sans la marque « Consommable », **When** le visiteur ouvre
   « Consommables », **Then** il n'y apparaît pas. [Phase 1]
4. **Given** un examen sans aucun consommable, **When** le panneau s'ouvre, **Then** la colonne
   de cet examen n'est pas affichée. [Phase 1]

---

### User Story 4 - Une barre plus courte et les autres entrées (Priority: P2)

Le visiteur voit une barre de cinq entrées et deux liens discrets à droite. « Location et
financement » regroupe toutes les façons de ne pas payer comptant. « Services » garde
l'assistance, le centre d'aide, l'installation et la formation.

**Why this priority**: indispensable pour livrer le nouveau menu, mais ces panneaux reprennent
des liens existants.

**Independent Test**: vérifier les cinq entrées, les deux liens de droite et chaque lien des
panneaux « Location et financement » et « Services ».

**Acceptance Scenarios**:

1. **Given** n'importe quelle page sur ordinateur, **When** elle s'affiche, **Then** la barre
   montre Produits, Consommables, Informatique médicale, Location et financement, Services,
   dans cet ordre, et à droite « Qui sommes-nous » et « Contact ». [Phase 1]
2. **Given** les panneaux du menu et la page Informatique médicale, **When** ils s'affichent,
   **Then** aucun titre n'est précédé du motif des trois points. [Phase 1]
3. **Given** le panneau « Location et financement », **When** il s'ouvre, **Then** il mène à la
   mise à disposition au mois, au dépannage express et au financement longue durée. [Phase 1]
4. **Given** le panneau « Services », **When** il s'ouvre, **Then** il mène à l'assistance et
   service, au centre d'aide et à l'installation et formation, et plus à l'hébergement des
   données de santé. [Phase 1]
5. **Given** un téléphone ou une tablette, **When** le visiteur ouvre le menu, **Then** il
   retrouve les mêmes entrées sous forme de listes dépliables, avec les trois niveaux de
   « Produits ». [Phase 1]
6. **Given** le comportement au survol livré le 2026-11-10 (a62ebf2), **When** la souris
   passe d'une entrée à l'autre ou quitte le menu, **Then** il est conservé : ouverture après
   un court survol, fermeture dès que la souris sort de l'entrée et de son panneau. [Phase 1]

---

### User Story 5 - Suivre et traiter les demandes informatiques (Priority: P2)

Régis ouvre le back-office, voit les nouvelles demandes « Informatique médicale », les lit,
note son échange avec le médecin et indique s'il a transmis la demande à 2i.

**Why this priority**: sans suivi, les demandes du questionnaire se perdent ; mais elles sont
déjà enregistrées par la User Story 2.

**Independent Test**: envoyer une demande, la retrouver dans le back-office, changer son état,
ajouter une note, vérifier l'historique.

**Acceptance Scenarios**:

1. **Given** une demande envoyée, **When** Régis ouvre les demandes du back-office, **Then**
   elle apparaît comme nouvelle, avec la date, le cabinet, les intérêts cochés et le créneau de
   rappel. [Phase 1]
2. **Given** une demande ouverte, **When** Régis change son état (nouvelle, en cours,
   transmise à 2i, close) ou ajoute une note, **Then** le changement est enregistré et
   journalisé. [Phase 1]
3. **Given** la liste des demandes, **When** Régis filtre sur les demandes non traitées,
   **Then** seules les nouvelles et en cours s'affichent. [Phase 1]

---

### User Story 6 - Suivre les visites envoyées vers 2i (Priority: P3)

Les liens vers le site de PCA et de 2i portent un code de suivi, pour que 2i puisse attribuer
à ExploCardio.fr les contacts qui en viennent. Régis renseigne ce code dans le back-office dès
que Nelson le lui fournit.

**Why this priority**: la commission n'est pas encore fixée ; les liens fonctionnent sans code.

**Independent Test**: renseigner un code dans le back-office, vérifier qu'il figure dans les
liens sortants vers PCA ; le retirer, vérifier que les liens restent valides.

**Acceptance Scenarios**:

1. **Given** un code de suivi renseigné, **When** le visiteur clique sur un lien vers PCA ou
   2i, **Then** le lien ouvre le site du partenaire avec le code. [Phase 1]
2. **Given** aucun code renseigné, **When** le visiteur clique, **Then** le lien ouvre le site
   du partenaire normalement. [Phase 1]
3. **Given** un lien sortant vers le partenaire, **When** il est affiché, **Then** il indique
   qu'il ouvre un site extérieur. [Phase 1]

---

### Edge Cases

- Le connecteur Odoo est indisponible : la barre et les entrées sans catalogue (Informatique
  médicale, Location et financement, Services, Qui sommes-nous, Contact) restent affichées ;
  les panneaux « Produits » et « Consommables » montrent au moins le lien vers chaque famille.
- Une catégorie d'Odoo a plus de trois niveaux : les niveaux au-delà du troisième ne sont pas
  affichés dans le menu ; leurs produits restent dans la liste de la sous-sous-catégorie.
- Une famille n'a pas encore de sous-catégorie (Épreuve d'effort, ECG de repos aujourd'hui) :
  la colonne affiche le lien vers la famille et ses éventuels produits directs.
- Un produit n'a pas de catégorie dans Odoo : il reste trouvable par la recherche mais
  n'apparaît dans aucun panneau.
- Un produit est marqué « Consommable » mais sa famille n'est pas une des quatre familles : il
  est classé dans une colonne « Autres consommables ».
- Les anciennes adresses des familles (/holter-ecg, /holter-tensionnel, /epreuve-effort,
  /accessoires-consommables) et de la page Hébergement des données de santé : elles
  continuent de fonctionner ou redirigent définitivement vers la nouvelle adresse, sans page
  introuvable ni perte de référencement.
- Un visiteur saisit des données de patient dans un champ libre du questionnaire : les champs
  libres sont courts et la mention « Aucune donnée de patient » est visible à côté.
- Envois répétés ou robots : le questionnaire applique la même protection anti-robots et les
  mêmes limites d'envoi que les autres formulaires publics.
- Le connecteur emailing n'est pas encore branché : la demande est enregistrée dans le
  back-office et rien n'échoue côté visiteur.
- Le visiteur quitte le questionnaire à l'étape 2 : rien n'est enregistré (pas de demande
  partielle).

## Requirements *(mandatory)*

### Functional Requirements

**Barre de menu**

- **FR-001**: La barre de menu DOIT comporter cinq entrées, dans cet ordre : Produits,
  Consommables, Informatique médicale, Location et financement, Services ; et à droite, en
  plus discret, les liens « Qui sommes-nous » et « Contact ».
- **FR-002**: Chaque entrée DOIT conserver le comportement actuel des méga-menus : ouverture au
  survol (court délai), au clic, au toucher et au clavier ; fermeture par Échap avec retour du
  focus, par clic à l'extérieur, et dès que la souris quitte l'entrée et son panneau.
- **FR-003**: Les titres des panneaux du menu et de la page Informatique médicale NE DOIVENT
  PAS être précédés du motif des trois points.
- **FR-004**: Sur téléphone et tablette, le menu replié DOIT proposer les mêmes entrées et les
  mêmes liens, sous forme de listes dépliables, avec des cibles d'au moins 44 px.

**Produits**

- **FR-005**: Le panneau « Produits » DOIT afficher une colonne par famille, dans cet ordre :
  Holter ECG, Holter tensionnel / MAPA, Épreuve d'effort, ECG de repos.
- **FR-006**: Chaque colonne DOIT reprendre l'arborescence des catégories d'Odoo de la famille
  sur trois niveaux au plus : la famille en titre, les sous-catégories, et sous chaque
  sous-catégorie qui en a, ses sous-sous-catégories en petits liens.
- **FR-007**: Chaque titre et chaque lien DOIT mener à la liste des produits de la catégorie,
  sous-niveaux compris.
- **FR-008**: Les catégories techniques d'Odoo (frais d'importation, logistique, transport,
  cartes cadeaux, porte-monnaie électronique, dépenses, catégories génériques par défaut) et
  les catégories sans produit en vente NE DOIVENT JAMAIS apparaître.
- **FR-009**: Le site NE DOIT PAS recréer l'arborescence des catégories : il la lit dans Odoo,
  par le connecteur (base de démonstration en phase 1, qui reprend les catégories rangées de
  la copie de test d'Odoo). Le nom affiché d'une famille PEUT différer du nom d'Odoo (par
  exemple « Holter tensionnel / MAPA » pour « MAPA »).
- **FR-010**: Les panneaux du menu NE DOIVENT PAS afficher de produits phares ni de liens
  rapides (décision de Régis du 2026-11-16) : le réglage correspondant du back-office (F01) est
  retiré. Le panneau « Produits » se termine par un lien « Voir tous les produits » (catalogue).

**Consommables**

- **FR-011**: Le panneau « Consommables » DOIT afficher les produits marqués « Consommable »
  dans Odoo (propriété produit « Type d'article » déjà utilisée par le site depuis F14), rangés par examen selon leur famille : pour le Holter ECG,
  pour la MAPA, pour l'épreuve d'effort, pour l'ECG de repos ; et « Autres consommables » pour
  ceux d'une autre famille.
- **FR-012**: Un produit marqué « Consommable » DOIT rester visible dans « Produits », dans sa
  catégorie : il apparaît aux deux endroits sans avoir deux catégories dans Odoo.
- **FR-013**: Le panneau DOIT comporter un lien « Tous les consommables » vers la liste de tous
  les produits marqués « Consommable », et un rappel que le client connecté retrouve ses
  derniers consommables dans Mon compte.

**Location et financement, Services**

- **FR-014**: Le panneau « Location et financement » DOIT mener à la mise à disposition au
  mois, au dépannage express et au financement longue durée.
- **FR-015**: Le panneau « Services » DOIT mener à l'assistance et service, au centre d'aide et
  à l'installation et formation.

**Page Informatique médicale**

- **FR-016**: Le site DOIT proposer une page « Informatique médicale » accessible depuis le
  menu en un clic, qui présente dans cet ordre : en-tête ; trois bénéfices de PCA ; « Comment
  ça se passe » ; encadré hébergement des données de santé ; encadré prestataire informatique ;
  questionnaire ; partenaire.
- **FR-017**: L'en-tête DOIT porter le titre « Votre cabinet accessible partout, en toute
  sécurité », une phrase de présentation, les mentions « Hébergement certifié HDS »,
  « Conforme RGPD » et « Vos logiciels actuels », un bouton principal « Décrire mon besoin »
  (vers le questionnaire) et un bouton secondaire « Découvrir PCA » (vers les bénéfices),
  accompagnés d'un schéma dessiné avec les formes de la charte (cabinet, domicile,
  secrétariat, congés).
- **FR-018**: Les trois bénéfices DOIVENT présenter : consulter ses examens (Holter, MAPA,
  épreuve d'effort) où que l'on soit ; des postes synchronisés pour que le secrétariat
  continue de travailler ; des données protégées par un hébergement certifié HDS, sans changer
  ses logiciels.
- **FR-019**: « Comment ça se passe » DOIT présenter trois étapes : « Vous décrivez votre
  besoin » (questionnaire de 2 minutes, sans engagement) ; « On vous appelle » (« Nous
  précisons avec vous votre cabinet et vos logiciels ») ; « Démonstration » (notre partenaire
  vous montre PCA sur votre propre cas).
- **FR-020**: L'encadré hébergement DOIT porter le titre « Nous sommes fiers de vous présenter
  notre partenariat avec PCA », expliquer que les examens et logiciels sont hébergés chez un
  hébergeur certifié HDS et que les données des patients ne transitent jamais par
  ExploCardio.fr, et afficher les mentions Certifié HDS, ISO 27001, Conforme RGPD et
  Partenaire CNCF.
- **FR-021**: L'encadré « Besoin d'un prestataire informatique pour votre cabinet ? » DOIT
  présenter le matériel et le support informatique comme fournis par notre partenaire 2i
  (postes et écrans, réseau du cabinet, sauvegardes, support à distance) et mener au
  questionnaire. ExploCardio.fr NE DOIT PAS vendre ce matériel ni l'ajouter au catalogue.
- **FR-022**: La section partenaire DOIT nommer « Patient Care Anywhere®, par Indoor
  Informatique (2i) » et proposer un lien « Voir le site de PCA » qui ouvre le site du
  partenaire dans un nouvel onglet en l'annonçant.
- **FR-023**: Les textes de la page (titres et phrases des sections) DOIVENT être modifiables
  depuis le back-office, comme les autres contenus éditoriaux, avec des valeurs de départ
  reprenant la maquette.
- **FR-024**: Les mentions de conformité de PCA (HDS, ISO 27001, RGPD, CNCF) DOIVENT être
  validées par Régis avant la mise en ligne ; le site NE DOIT PAS reprendre les promesses
  chiffrées du site de PCA (par exemple « 0 changement », « 100 % compatible »).
- **FR-025**: La page DOIT être indexable (hors démonstration) avec un titre et une
  description propres, et figurer dans le plan du site.

**Questionnaire**

- **FR-026**: Le questionnaire DOIT être ouvert à tous, sans compte, et se dérouler en trois
  étapes avec une barre de progression : (1) ce qui vous intéresse et votre cabinet ;
  (2) vos logiciels et votre prestataire actuel ; (3) votre délai, vos coordonnées et votre
  créneau de rappel.
- **FR-027**: L'étape 1 DOIT proposer des choix à cocher (au moins un) : accéder à mes examens à
  distance ; du matériel informatique ; un prestataire informatique ; je ne sais pas encore.
  Elle DOIT demander le nombre de médecins, le nombre de postes et la présence d'un
  secrétariat sur place.
- **FR-028**: L'étape 2 DOIT demander les logiciels utilisés pour le Holter ECG, la MAPA et
  l'épreuve d'effort (choix dans une liste avec « Autre » et « Je ne sais pas ») et si le
  cabinet a un prestataire informatique (oui, satisfait ; oui, pas satisfait ; non).
- **FR-029**: L'étape 3 DOIT demander le délai (dès que possible ; dans les 3 mois ; je
  m'informe), le nom, le cabinet, le code postal, l'e-mail, le téléphone et un créneau de
  rappel préféré (matin, midi, après-midi), avec une case de consentement au traitement des
  données pour être recontacté.
- **FR-030**: Le questionnaire NE DOIT demander aucune donnée de patient ; la mention « Aucune
  donnée de patient n'est demandée. Vos réponses servent uniquement à vous recontacter. »
  DOIT être visible sur chaque étape, et les champs libres DOIVENT être courts.
- **FR-031**: Pour un médecin connecté, les coordonnées de l'étape 3 DOIVENT être préremplies
  à partir de son compte et rester modifiables ; la demande est alors rattachée à son compte.
- **FR-032**: Chaque étape DOIT être validée avant de passer à la suivante, avec des messages
  d'erreur clairs liés aux champs ; l'envoi final DOIT afficher une confirmation qui annonce
  un rappel.
- **FR-033**: Le questionnaire DOIT appliquer la protection anti-robots et les limites d'envoi
  des autres formulaires publics, et rester utilisable au clavier et au lecteur d'écran
  (étapes annoncées, focus placé sur le titre de l'étape).

**Demandes dans le back-office**

- **FR-034**: Chaque questionnaire envoyé DOIT créer une demande « Informatique médicale »
  dans le back-office, avec toutes les réponses, la date et, le cas échéant, le compte du
  médecin.
- **FR-035**: Une demande DOIT avoir un état (nouvelle, en cours, transmise à 2i, close) et
  des notes internes ; les changements d'état DOIVENT être journalisés avec leur auteur.
- **FR-036**: À chaque nouvelle demande, une notification DOIT être envoyée à l'adresse de
  l'équipe par le connecteur emailing ; tant que celui-ci est en mode démonstration, l'envoi
  est simulé et la demande reste consultable dans le back-office.
- **FR-037**: Les demandes DOIVENT suivre les règles RGPD du site : durée de conservation,
  droit d'accès et de suppression, inscription au registre des traitements.

**Lien suivi vers le partenaire**

- **FR-038**: Le back-office DOIT permettre de renseigner l'adresse du site de PCA et un code de
  suivi d'affiliation ; tous les liens sortants vers le partenaire DOIVENT porter ce code
  lorsqu'il est renseigné.

**Anciennes adresses**

- **FR-039**: L'adresse de la page « Hébergement des données de santé » DOIT rediriger
  définitivement vers la section correspondante de la page Informatique médicale.
- **FR-040**: Les adresses des familles et de « Accessoires & consommables » DOIVENT continuer
  de fonctionner ou rediriger définitivement vers leur nouvelle adresse, et les liens internes
  du site (accueil, pied de page, gammes phares, plan du site) DOIVENT être mis à jour.
- **FR-041**: Les personnes déjà inscrites sur la page Hébergement pour « Être informé de
  l'ouverture » DOIVENT rester consultables dans le back-office.

### Key Entities

- **Catégorie (Odoo)** : arborescence de rangement des produits (famille, sous-catégorie,
  sous-sous-catégorie), lue dans Odoo ; un produit n'a qu'une catégorie.
- **Type d'article « Consommable » (Odoo)** : valeur de la propriété produit « Type d'article »
  (équipement, consommable, accessoire, logiciel, service), déjà obligatoire pour le site. Elle
  décide de l'apparition dans « Consommables », indépendamment de la catégorie.
- **Demande Informatique médicale** : réponses du questionnaire (intérêts, cabinet, logiciels,
  prestataire actuel, délai, coordonnées, créneau de rappel, consentement), date, compte
  éventuel, état, notes internes, historique.
- **Paramètres partenaire** : adresse du site de PCA, code de suivi d'affiliation, adresse de
  notification de l'équipe (paramètres du back-office).
- **Textes de la page Informatique médicale** : titres et phrases modifiables, avec valeurs de
  départ.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Depuis l'accueil, n'importe quelle sous-sous-catégorie de produits est atteinte
  en 2 clics au plus (ouvrir « Produits », cliquer sur le lien), et n'importe quel produit en
  3 clics au plus.
- **SC-002**: La barre de menu tient sur une seule ligne dès 1 024 px de large, contre deux
  lignes serrées aujourd'hui pour sept entrées.
- **SC-003**: 100 % des produits marqués « Consommable » sont visibles à la fois dans
  « Consommables » et dans « Produits ».
- **SC-004**: Aucune catégorie technique ni catégorie vide n'apparaît dans le menu (0 sur
  l'ensemble des catégories de la copie de test d'Odoo).
- **SC-005**: Un visiteur remplit et envoie le questionnaire en moins de 2 minutes.
- **SC-006**: 100 % des questionnaires envoyés apparaissent dans le back-office, y compris
  quand le connecteur emailing est indisponible.
- **SC-007**: Aucune ancienne adresse du menu ne renvoie une page introuvable.
- **SC-008**: La page Informatique médicale et le menu respectent les contrôles existants
  d'accessibilité (WCAG 2.2 AA) et de performance de l'accueil (décalage de mise en page
  ≤ 0,1, affichage du contenu principal ≤ 2 s).

## Assumptions

- Régis range les catégories d'Odoo selon le document `docs/rangement-categories-odoo.docx`
  (sous-catégories Enregistreurs, Logiciels, Kits ; familles Épreuve d'effort et ECG de repos ;
  type d'article « Consommable » renseigné). En phase 1, la base de démonstration reprend cette arborescence
  rangée.
- Les familles affichées restent les quatre familles actuelles ; une nouvelle famille dans
  Odoo n'apparaît dans le menu qu'après une évolution du site.
- Le nom « PCA », la marque Patient Care Anywhere® et le nom d'Indoor Informatique (2i) sont
  utilisés avec l'accord de Nelson Dan (confirmé par Pauline le 2026-11-16).
- Le code de suivi d'affiliation n'est pas encore connu : les liens fonctionnent sans lui. Les
  modalités de commission sont convenues entre Nelson et Régis, hors du site.
- Le site ne transmet pas les demandes à 2i automatiquement : Régis qualifie le besoin puis
  transmet lui-même.
- L'offre « logiciels Cloud » de F12 (ouverture des accès PCA à l'achat) reste en préparation ;
  F27 ne change ni le connecteur PCA ni la rubrique « Mes logiciels Cloud ».
- Les e-mails de notification dépendent du branchement de Brevo (F25) ; l'adresse de l'équipe
  est celle déjà paramétrée pour les autres notifications.
- Le schéma de l'en-tête et les petits schémas des bénéfices suivent la charte : formes et
  pastels de la marque, sans cœur ni tracé ECG ni photo générique, animation légère désactivée
  en mouvement réduit.
- La refonte du menu ne change pas l'en-tête au-dessus (logo, recherche, panier, Mon compte),
  ni les bandeaux démonstration et promotionnel.
