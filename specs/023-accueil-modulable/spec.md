# Feature Specification: F23 — Accueil modulable

**Feature Branch**: `023-accueil-modulable`

**Created**: 2026-11-09

**Status**: Draft

**Input**: Demande de Pauline du 2026-11-09, construite par-dessus F20 (animation « Liberté,
Expertise, Fidélité », branche `020-animation-accueil`, en attente de la validation de Régis).
Nouvel ordre de l'accueil, lien du bandeau promotionnel vers le carrousel, trois gammes phares,
six cartes « Pourquoi choisir ExploCardio.fr ? » reprenant le verso du flyer avec des schémas,
offre digitale rétablie mais masquée, et organisation des blocs de l'accueil depuis le back-office.

## Contexte

L'accueil doit mettre en avant la stratégie commerciale d'ExploCardio.fr : les gammes
principales tout de suite, puis les raisons de choisir ExploCardio.fr, puis les offres du moment.
Régis doit pouvoir réorganiser l'accueil sans développeur, par exemple remonter le carrousel en
tête pendant une grosse promotion, ou masquer puis réafficher l'offre digitale.

Ordre de départ de l'accueil :

| # | Bloc | Statut |
|---|---|---|
| 1 | Bandeau « Version de démonstration » | Fixe (toutes les pages, phase 1) |
| 2 | Bandeau promotionnel, avec le lien « Nos offres du moment » | Fixe (toutes les pages) |
| 3 | Les deux bandeaux de menu | Fixes (toutes les pages) |
| 4 | Animation « Les trois temps » (F20) | Déplaçable, masquable, affichée |
| 5 | Nos gammes phares (trois cartes) | Déplaçable, masquable, affichée |
| 6 | Pourquoi choisir ExploCardio.fr ? (six cartes) | Déplaçable, masquable, affichée |
| 7 | Offre digitale | Déplaçable, masquable, **masquée** au départ |
| 8 | Nos offres du moment (carrousel) | Déplaçable, masquable, affiché |
| 9 | Bloc contact | Fixe, en bas de l'accueil |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Découvrir les gammes phares et les raisons de choisir ExploCardio.fr (Priority: P1)

Un cardiologue arrive sur l'accueil. Sous l'animation, il voit les trois gammes principales
(Holter ECG, Holter tensionnel, Épreuve d'effort) et y accède en un clic. Plus bas, six cartes
illustrées lui expliquent en quelques secondes pourquoi choisir ExploCardio.fr.

**Why this priority**: c'est le cœur de la demande : un accueil plus commercial, qui mène vite au
catalogue et défend l'offre.

**Independent Test**: ouvrir l'accueil sur ordinateur et téléphone ; vérifier l'ordre des blocs,
les trois cartes et leurs liens, les six cartes et leurs schémas, en mouvement normal et réduit.

**Acceptance Scenarios**:

1. **Given** l'accueil avec l'ordre de départ, **When** un visiteur l'ouvre, **Then** il voit,
   sous les menus, l'animation, puis « Nos gammes phares », puis « Pourquoi choisir
   ExploCardio.fr ? », puis le carrousel, puis le bloc contact ; l'offre digitale n'apparaît pas.
2. **Given** la section « Nos gammes phares », **When** le visiteur clique sur une carte, **Then**
   il arrive sur la page de la gamme correspondante (Holter ECG, Holter tensionnel ou Épreuve
   d'effort).
3. **Given** la section « Pourquoi choisir ExploCardio.fr ? », **When** elle entre à l'écran,
   **Then** les six cartes apparaissent, chacune avec son schéma qui s'anime brièvement une fois,
   son titre et sa phrase.
4. **Given** un visiteur qui a demandé à réduire les animations, **When** il fait défiler
   l'accueil, **Then** les schémas s'affichent directement dans leur état final, sans mouvement.

---

### User Story 2 - Aller aux offres du moment depuis le bandeau promotionnel (Priority: P1)

Un visiteur voit passer une promotion dans le bandeau du haut. Il clique sur « Nos offres du
moment » et arrive sur le carrousel des offres, où qu'il soit placé sur l'accueil.

**Why this priority**: le bandeau promotionnel est visible sur toutes les pages ; le relier aux
offres transforme un message en visite.

**Independent Test**: depuis l'accueil et depuis une fiche produit, cliquer sur le lien du
bandeau ; vérifier l'arrivée sur le carrousel ; masquer le carrousel et vérifier que le lien
disparaît.

**Acceptance Scenarios**:

1. **Given** un bandeau promotionnel affiché et un carrousel affiché avec au moins une offre,
   **When** le visiteur clique sur « Nos offres du moment » depuis l'accueil, **Then** la page
   défile jusqu'au carrousel, qui reçoit le focus de lecture.
2. **Given** le même état, **When** le visiteur clique sur le lien depuis une autre page, **Then**
   il arrive sur l'accueil, au niveau du carrousel.
3. **Given** un carrousel masqué ou sans aucune offre, **When** le bandeau s'affiche, **Then** le
   lien « Nos offres du moment » n'apparaît pas ; le bandeau garde ses messages.
4. **Given** le carrousel déplacé en tête de l'accueil, **When** le visiteur clique sur le lien,
   **Then** il arrive toujours sur le carrousel.

---

### User Story 3 - Réorganiser l'accueil depuis le back-office (Priority: P2)

Régis ouvre « Contenus → Organisation de l'accueil ». Il voit la liste des blocs déplaçables dans
leur ordre actuel. Il remonte le carrousel en tête, masque l'animation, enregistre, et l'accueil
public reflète ce choix. Plus tard, il réaffiche l'offre digitale.

**Why this priority**: permet d'adapter l'accueil aux temps forts commerciaux sans développeur ;
l'accueil fonctionne déjà sans (ordre de départ).

**Independent Test**: dans le back-office, changer l'ordre et l'affichage de deux blocs,
enregistrer, puis vérifier l'accueil public et le journal.

**Acceptance Scenarios**:

1. **Given** l'écran « Organisation de l'accueil », **When** Régis clique sur « Monter » pour le
   carrousel jusqu'à la première place et enregistre, **Then** le carrousel est le premier bloc
   sous les menus sur l'accueil public, en moins d'une minute.
2. **Given** l'offre digitale masquée, **When** Régis coche « Affiché sur l'accueil » et
   enregistre, **Then** l'offre digitale apparaît à sa place dans l'ordre choisi.
3. **Given** un seul bloc encore affiché, **When** Régis tente de le masquer, **Then**
   l'enregistrement est refusé avec le message « Gardez au moins un bloc affiché sur l'accueil. »
4. **Given** un enregistrement réussi, **When** l'administrateur consulte le journal, **Then** il
   y trouve l'auteur, la date, l'ancien et le nouvel ordre avec l'affichage de chaque bloc.
5. **Given** deux personnes qui modifient l'organisation en même temps, **When** la seconde
   enregistre, **Then** elle est prévenue que l'organisation a changé entre-temps et voit l'état
   à jour, sans écraser silencieusement la première.

---

### User Story 4 - Modifier les textes des cartes « Pourquoi choisir » (Priority: P3)

L'équipe met à jour le titre ou la phrase d'une carte (par exemple quand Régis aura confirmé le
fonctionnement des points de fidélité) sans toucher au schéma.

**Why this priority**: les textes 3 et 4 sont provisoires ; ils doivent pouvoir évoluer sans
développement.

**Independent Test**: modifier la phrase de la carte 4 dans le back-office, enregistrer, vérifier
l'accueil.

**Acceptance Scenarios**:

1. **Given** l'écran des cartes « Pourquoi choisir », **When** l'équipe modifie un titre (1 à 50
   caractères) ou une phrase (1 à 160 caractères) et enregistre, **Then** l'accueil affiche le
   nouveau texte en moins d'une minute.
2. **Given** un titre vide ou trop long, **When** l'équipe enregistre, **Then** l'enregistrement
   est refusé avec un message clair sous le champ concerné.

---

### Edge Cases

- **Animation masquée ou pas en tête** : la phrase d'accroche de l'animation n'est plus le titre
  principal de la page ; un titre principal de remplacement, lisible par les lecteurs d'écran et
  les moteurs de recherche, est alors fourni (FR-012). Il n'y a jamais zéro ni deux titres
  principaux.
- **Animation déplacée plus bas** : elle se joue quand elle entre à l'écran, pas au chargement
  de la page, pour ne pas se terminer hors de la vue du visiteur.
- **Carrousel sans offre** : le bloc n'est pas affiché, même s'il est coché ; le lien du bandeau
  n'apparaît pas.
- **Page d'accueil appelée avec l'ancre de l'ancienne section** (`#acces-rapide`, utilisée par le
  bouton « Voir l'offre » de l'animation) : l'ancre mène à « Nos gammes phares ».
- **Une gamme phare masquée ou retirée du catalogue** : sa carte n'est pas affichée ; la section
  reste équilibrée avec les cartes restantes.
- **Nouveau bloc ajouté plus tard par un développeur** : il apparaît en fin de liste, masqué,
  jusqu'à ce que l'équipe le place.
- **Organisation en base illisible ou incomplète** : l'accueil retombe sur l'ordre de départ ;
  aucune page vide.

## Requirements *(mandatory)*

### Functional Requirements

**Ordre et blocs**

- **FR-001** : L'accueil DOIT afficher, dans cet ordre fixe en haut : le bandeau « Version de
  démonstration » (phase 1), le bandeau promotionnel, les deux bandeaux de menu ; puis les blocs
  déplaçables dans l'ordre enregistré ; puis le bloc contact, toujours en dernier.
- **FR-002** : Les blocs déplaçables DOIVENT être : animation « Les trois temps », « Nos gammes
  phares », « Pourquoi choisir ExploCardio.fr ? », « Offre digitale », « Nos offres du moment »
  (carrousel). Ordre et affichage de départ : voir le tableau du contexte.

**Lien du bandeau promotionnel**

- **FR-003** : Le bandeau promotionnel DOIT proposer un petit lien « Nos offres du moment », sur
  toutes les pages où il s'affiche, menant au carrousel de l'accueil, quelle que soit sa place.
- **FR-004** : Le lien NE DOIT PAS apparaître si le carrousel est masqué ou n'a aucune offre à
  montrer.
- **FR-005** : Le lien DOIT rester lisible et utilisable au clavier, avec une cible d'au moins
  44 px, sans interrompre la rotation des messages du bandeau ni être masqué par elle.

**Nos gammes phares**

- **FR-006** : La section « Toute l'offre en un coup d'œil » DOIT devenir « Nos gammes phares »,
  toujours précédée des trois points du logo, avec trois cartes : Holter ECG, Holter tensionnel,
  Épreuve d'effort, chacune menant à sa gamme. Les trois autres cartes actuelles sont supprimées.
- **FR-007** : Les cartes gardent leur présentation actuelle (couleur de fond, image facultative,
  phrase, « Découvrir ») et restent modifiables au back-office ; leur nombre est limité à trois.
  Mise en page : trois par ligne sur ordinateur, une par ligne sur téléphone.

**Pourquoi choisir ExploCardio.fr ?**

- **FR-008** : Une section « Pourquoi choisir ExploCardio.fr ? » DOIT présenter six cartes, trois
  par ligne sur ordinateur, deux sur tablette, une sur téléphone. Chaque carte comporte un schéma,
  un titre et une phrase. Textes de départ (verso du flyer, points 3 et 4 en version prudente) :

  | # | Titre | Phrase de départ | Schéma |
  |---|---|---|---|
  | 1 | Une offre de produits et de services | Pensée pour l'exercice de la cardiologie libérale. | Trois cercles qui se chevauchent : Matériel, Consommables, Services |
  | 2 | Achetez, louez, financez | En quelques clics et en toute liberté. | Sélecteur à trois pilules dont la sélection glisse d'une option à l'autre |
  | 3 | L'assistance sans contrat | Vos achats de consommables vous ouvrent l'accès à une assistance dédiée. | Chaîne en trois étapes : Consommables achetés → Droits ouverts → Assistance dédiée |
  | 4 | Une fidélité récompensée | Vos achats vous rapportent des points, à convertir en services ou en bons d'achat. | Jauge de points qui se remplit puis bascule en « Bon d'achat » |
  | 5 | Dépannage express | Mise à disposition rapide de matériel ou de licence, sans engagement. | Frise courte : Demande → Mise à disposition (matériel, licence) |
  | 6 | Des interlocuteurs experts | Des spécialistes réactifs, qui connaissent votre matériel et les contraintes de votre exercice. | Deux cercles qui se rejoignent : « Vous », « Nos spécialistes » |

- **FR-009** : Les schémas DOIVENT être dessinés avec les formes et les couleurs de la charte
  (cercles, pilules, traits fins, couleurs des trois points du logo) ; aucun cœur, tracé ECG ni
  pictogramme médical. Les mots portés par les schémas sont du vrai texte, au contraste AA ; les
  pastels ne servent qu'aux formes. Aucun délai chiffré n'est affiché.
- **FR-010** : Chaque schéma DOIT s'animer une seule fois, brièvement (2 secondes au plus), quand
  sa carte entre à l'écran ; en mouvement réduit ou sans script, il s'affiche directement dans son
  état final. Les schémas sont décoratifs pour les lecteurs d'écran : le titre et la phrase
  portent le sens.
- **FR-011** : Titres (1 à 50 caractères) et phrases (1 à 160 caractères) des six cartes DOIVENT
  être modifiables au back-office ; l'enregistrement est journalisé. Les schémas et leurs mots ne
  sont pas modifiables (ils changent avec le code).

**Titre de la page**

- **FR-012** : L'accueil DOIT avoir exactement un titre principal. Si l'animation est affichée en
  premier bloc, c'est sa phrase d'accroche (comportement F20) ; sinon, un titre principal de
  remplacement, réservé aux lecteurs d'écran et aux moteurs de recherche, reprend la même phrase
  d'accroche, et la phrase visible de l'animation (si elle est affichée plus bas) n'est plus un
  titre principal.

**Offre digitale**

- **FR-013** : La section « Offre digitale » (supprimée par F20) DOIT être rétablie à l'identique
  de la version précédente, masquée au départ. Le champ « Badge Logiciel Cloud » revient dans
  « Contenus → Coordonnées et textes ».

**Organisation de l'accueil (back-office)**

- **FR-014** : Un écran « Contenus → Organisation de l'accueil », accessible aux rôles qui gèrent
  les contenus (administrateur, commercial), DOIT lister les blocs déplaçables dans leur ordre
  actuel, chacun avec : son nom, des boutons « Monter » et « Descendre » (désactivés aux
  extrémités), une case « Affiché sur l'accueil », et pour le carrousel une mention s'il n'a
  aucune offre. Un bouton « Enregistrer » applique le tout.
- **FR-015** : L'enregistrement DOIT refuser une organisation sans aucun bloc affiché.
- **FR-016** : Les changements DOIVENT être visibles sur l'accueil public en moins d'une minute,
  journalisés (auteur, date, ancien et nouvel état) et protégés contre l'écrasement d'une
  modification concurrente.
- **FR-017** : L'écran DOIT être utilisable entièrement au clavier ; après un déplacement, le
  focus reste sur le bouton du bloc déplacé et la nouvelle position est annoncée aux lecteurs
  d'écran.

**Comportements liés à la position**

- **FR-018** : Le bouton « Voir l'offre » de l'animation DOIT mener à « Nos gammes phares » si
  elle est affichée, sinon au premier bloc affiché qui suit l'animation.
- **FR-019** : Si l'animation n'est pas le premier bloc, elle NE DOIT démarrer que lorsqu'elle
  entre à l'écran.

**Charte**

- **FR-020** : La charte (`docs/brand/design-system.md`, § 8 structure de l'accueil) DOIT décrire
  le nouvel ordre de départ, les blocs déplaçables et les schémas des six cartes.

### Key Entities

- **Bloc de l'accueil** : un des cinq blocs déplaçables ; attributs : identifiant stable, nom
  affiché au back-office, position, affiché ou non. Donnée réelle du site dès la phase 1.
- **Carte « Pourquoi choisir »** : une des six cartes ; attributs : numéro (1 à 6, lié à son
  schéma), titre, phrase.
- **Carte gamme phare** : carte existante de l'accueil (titre, phrase, lien, fond, image,
  badge), limitée à trois.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** [Phase 1] : Depuis l'accueil, chaque gamme phare s'atteint en un clic, et le
  carrousel en un clic depuis le bandeau promotionnel de n'importe quelle page.
- **SC-002** [Phase 1] : Sur un ordinateur portable de 13 pouces (1 440 × 760) avec l'ordre de
  départ, le haut des cartes « Nos gammes phares » est visible sans défiler.
- **SC-003** [Phase 1] : Un membre de l'équipe réorganise l'accueil (déplacer un bloc et en
  masquer un autre) en moins d'une minute, et le résultat est visible en public en moins d'une
  minute après l'enregistrement.
- **SC-004** [Phase 1] : Pour chacune des organisations testées (ordre de départ, carrousel en
  tête, animation masquée), l'accueil a exactement un titre principal, aucun défaut automatique
  d'accessibilité (WCAG 2.2 AA) et aucun débordement horizontal de 320 à 1 920 px.
- **SC-005** [Phase 1] : En mouvement réduit, aucun élément des six cartes ne bouge.
- **SC-006** [Phase 1] : Aucune organisation enregistrable ne produit un accueil sans bloc
  entre les menus et le bloc contact.

## Assumptions

- F20 (animation) est la base de ce travail ; F23 sera enregistré après F20, sur sa branche ou
  dans `main` selon la décision de Régis sur l'animation.
- Les trois gammes phares sont les trois premières cartes actuelles (Holter ECG, Holter
  tensionnel, Épreuve d'effort, déjà en base) ; les trois autres sont supprimées au déploiement.
- Les textes des cartes 3 et 4 sont provisoires, en attente de la confirmation de Régis sur le
  système de points et sur « sans contrat » et « express » au regard des CGV ; ils se modifient au
  back-office sans développement.
- Le bandeau « Version de démonstration », le bandeau promotionnel, les menus et le bloc contact
  restent fixes : ils sont communs à tout le site ou servent de pied de l'accueil.
- Les blocs se déplacent avec des boutons « Monter » / « Descendre » plutôt qu'au glisser-déposer
  (plus fiable au clavier et sur tablette, suffisant pour cinq blocs).
- Les titres des sections (« Nos gammes phares », « Pourquoi choisir ExploCardio.fr ? »,
  « Nos offres du moment ») ne sont pas modifiables dans ce lot.
- Le lien « Nos offres du moment » s'ajoute aux messages existants du bandeau, il n'est pas
  propre à chaque message.

## Out of Scope

- Glisser-déposer, blocs personnalisés créés par l'équipe, programmation de l'organisation à des
  dates données.
- Modification des schémas depuis le back-office.
- Photos des cartes gammes phares et du carrousel (sujet séparé).
