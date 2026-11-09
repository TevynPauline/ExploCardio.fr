# Feature Specification: F20 — Animation « Les trois temps » et nouvel ordre de l'accueil

**Feature Branch**: `020-animation-accueil`

**Created**: 2026-11-06

**Status**: Draft

**Input**: User description: "Sous le menu, une animation « Les trois temps » remplace la
section « Pourquoi préférer ExploCardio.fr » : les trois points du logo arrivent en rebondissant,
s'écartent et grandissent jusqu'à un même diamètre, chacun s'ouvre sur un mot (Spécialiste,
Rapide, Complet), puis ils se regroupent en logo et la phrase d'accroche « Tout ce qu'il vous
faut, au même endroit. » apparaît, grande et visible. Une seule lecture, bouton pause.
L'accueil devient : animation, six cartes, carrousel, bloc contact. Les sections « Pourquoi
préférer », « Offre digitale » et « Service et fidélité » sont retirées."

## Contexte et objectif

L'accueil (F01, revu par F16) enchaîne aujourd'hui six sections : carrousel, accès rapides,
« Pourquoi préférer ExploCardio.fr », « Service et fidélité », « Offre digitale » et contact. Il
est long, répétitif (financement, Cloud et assistance apparaissent deux fois) et rien n'accroche
le regard en haut de page.

F20 ouvre l'accueil par une courte animation dans le langage de la marque : les trois points du
logo (« trois temps ») portent les trois promesses d'ExploCardio.fr face aux catalogues
généralistes — **spécialiste**, **rapide**, **complet** — et se referment sur la phrase
d'accroche « Une offre pensée pour la cardiologie libérale ». Le visiteur comprend en une dizaine
de secondes ce que le site lui apporte, puis fait défiler la page vers l'offre.

Décisions de Pauline (2026-11-06) : idée « Les trois temps » retenue ; trois mots seuls, sans
phrase d'appoint ; rebonds discrets pour plus de dynamisme ; trois disques de même diamètre pour
les mots ; phrase d'accroche grande, élément principal de l'image finale ; arrêt après deux
boucles ; nouvel ordre de l'accueil ; bloc contact conservé (l'email sera saisi au back-office).
Décisions du 2026-11-09 (but commercial : voir le catalogue dès l'arrivée) : bandeau compact
après la lecture ; arguments commerciaux et bouton « Voir l'offre » dans l'image finale ; une seule
lecture au lieu de deux ; scène moins haute ; surtitre « Accès rapide » remplacé par les trois
points du logo devant « Toute l'offre en un coup d'œil ».

F20 modifie l'accueil de F01 et F16 et la page « Contenus → Accueil » du back-office (F16,
FR-014). Il ne touche ni aux six cartes, ni au carrousel, ni au bloc contact, dont les règles
restent valables. Seule exception : F16 (US « carrousel », scénario 7) excluait le grand logo de
l'ancien bandeau ; le logo officiel revient, à taille modérée, dans l'image finale de
l'animation, et le carrousel reste sans logo ni signature.

**Phases** : tout se vérifie en phase 1 ; aucun service externe n'est concerné.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Comprendre d'un coup d'œil ce qu'apporte ExploCardio.fr (Priority: P1)

Une cardiologue ouvre l'accueil sur son ordinateur. Sous le menu, les trois points du logo
tombent l'un après l'autre et se posent avec un petit rebond, s'écartent et grandissent jusqu'à
la même taille. Chacun s'ouvre sur un mot : « Liberté », « Expertise », « Fidélité ». Les points
se resserrent, retrouvent leurs tailles et deviennent le logo ; sous lui apparaît, en grand,
« Une offre pensée pour la cardiologie libérale », avec une invitation à découvrir l'offre. Elle
fait défiler la page jusqu'aux six cartes.

**Why this priority**: c'est l'objet du module : attirer le regard et résumer la promesse.

**Independent Test**: ouvrir l'accueil à 1 280 px puis à 390 px : la séquence se déroule dans
l'ordre décrit, les trois mots ont le même poids visuel, l'image finale montre le logo et la
phrase d'accroche en grand, et le haut des cartes produits est visible sous l'animation sur
ordinateur.

**Acceptance Scenarios**:

1. **Given** l'accueil chargé sur un ordinateur, **When** l'animation démarre, **Then** les
   trois points apparaissent l'un après l'autre, du plus petit au plus grand, chacun avec un
   seul petit rebond amorti. [Phase 1]
2. **Given** les points posés, **When** ils s'écartent, **Then** ils grandissent jusqu'à un
   **même diamètre**, côte à côte sur ordinateur et l'un sous l'autre sur téléphone, et ne se
   distinguent plus que par leur couleur. [Phase 1]
3. **Given** les trois disques de même diamètre, **When** les mots apparaissent, **Then**
   « Liberté », « Expertise » et « Fidélité » s'affichent l'un après l'autre, dans la même
   taille, la même graisse et la même couleur (encre), et restent affichés tous les trois
   ensemble avant le regroupement. [Phase 1]
4. **Given** les trois mots affichés, **When** vient le regroupement, **Then** les mots
   s'effacent, les disques se resserrent en retrouvant les tailles croissantes du logo, et le
   logo officiel prend leur place sans saut visible. [Phase 1]
5. **Given** le logo affiché, **When** la séquence se termine, **Then** la phrase d'accroche
   « Une offre pensée pour la cardiologie libérale » apparaît sous le logo, à la taille des grands
   titres du site, nettement plus grande que le logo n'est haut, avec un lien « Découvrir
   l'offre » qui mène aux six cartes. [Phase 1]
6. **Given** un écran de 1 280 × 800 px, **When** l'accueil s'affiche, **Then** l'animation
   occupe au plus 65 % de la hauteur visible et le haut de la section des six cartes est
   visible sans défiler. [Phase 1]

---

### User Story 2 - Garder la main sur le mouvement (Priority: P1)

Un médecin sensible aux animations, ou simplement pressé, ne doit pas subir le mouvement. Un
bouton « Pause » arrête l'animation à tout moment ; elle ne se joue qu'une fois puis
se réduit en un bandeau compact (phrase d'accroche et « Revoir ») pour laisser la place au reste
de la page. Si son système demande de réduire les animations, il voit directement ce bandeau,
sans aucun mouvement, avec les trois mots visibles.

**Why this priority**: l'accessibilité (WCAG 2.2 AA, critère 2.2.2) est non négociable
(constitution, principe 8).

**Independent Test**: lancer l'accueil, appuyer sur « Pause » : tout s'arrête ; « Lecture »
reprend. Attendre la fin de la lecture : la scène se réduit en bandeau compact et les six cartes
remontent. Avec la réduction des animations activée : aucun mouvement, bandeau compact et trois
mots visibles dès l'arrivée.

**Acceptance Scenarios**:

1. **Given** l'animation en cours, **When** le visiteur active « Pause » (souris, clavier ou
   toucher), **Then** tout mouvement s'arrête et le bouton devient « Lecture » ; « Lecture »
   reprend là où elle s'était arrêtée. [Phase 1]
2. **Given** l'animation lancée, **When** la lecture est terminée, **Then**
   elle s'arrête sur l'image finale, qui se réduit en douceur en un bandeau compact : la phrase
   d'accroche, plus petite, et le bouton « Revoir », qui rejoue l'animation en grand. Le logo et
   le bouton « Voir l'offre » s'effacent ; les six cartes remontent. [Phase 1]
3. **Given** un visiteur dont le système demande de réduire les animations, **When** il ouvre
   l'accueil, **Then** il voit directement le bandeau compact et les trois mots, sans aucun
   mouvement ni bouton. [Phase 1]
6. **Given** un visiteur qui a déjà fait défiler la page, **When** l'animation se réduit en
   bandeau, **Then** ce qu'il lit ne bouge pas à l'écran. [Phase 1]
4. **Given** un lecteur d'écran, **When** il parcourt l'animation, **Then** il entend une seule
   fois la phrase d'accroche (titre principal de la page) et les trois mots, sans répétition à
   chaque boucle ; les formes décoratives sont ignorées. [Phase 1]
5. **Given** un visiteur au clavier, **When** il parcourt l'animation, **Then** le bouton
   « Pause » et le bouton « Voir l'offre » reçoivent un focus visible et ont une cible d'au
   moins 44 × 44 px. [Phase 1]

---

### User Story 3 - Un accueil plus court, dans le bon ordre (Priority: P1)

L'accueil enchaîne désormais : l'animation, les six cartes « Toute l'offre en un coup d'œil »,
le carrousel, puis le bloc contact sombre. Les sections « Pourquoi préférer ExploCardio.fr »,
« Offre digitale » et « Service et fidélité » n'y figurent plus.

**Why this priority**: c'est la demande de Pauline ; les trois sections retirées répétaient les
cartes ou anticipaient des règles de fidélité qui vont changer (F18, lot B).

**Independent Test**: lire l'ordre des sections de l'accueil ; vérifier l'absence des trois
sections retirées ; vérifier que les pages qu'elles reliaient restent accessibles depuis le menu.

**Acceptance Scenarios**:

1. **Given** l'accueil, **When** on lit ses sections de haut en bas, **Then** l'ordre est :
   animation, six cartes, carrousel, contact. [Phase 1]
2. **Given** l'accueil, **When** on le parcourt, **Then** ni « Pourquoi préférer
   ExploCardio.fr », ni « Achetez, louez ou financez », ni « Service et fidélité » n'apparaissent.
   [Phase 1]
3. **Given** les pages autrefois reliées par « Offre digitale » (catalogue, financement, mise à
   disposition, dépannage express, hébergement, assistance), **When** on les cherche, **Then**
   elles restent accessibles depuis le menu ou les six cartes. [Phase 1]

---

### User Story 4 - Modifier les mots et la phrase au back-office (Priority: P2)

Pauline veut essayer une autre phrase d'accroche. Dans « Contenus → Accueil », elle modifie la
phrase ou l'un des trois mots, enregistre, et l'accueil affiche le nouveau texte.

**Why this priority**: les contenus de l'accueil sont réels et gérés au back-office
(constitution, principe 3) ; la page « Contenus → Accueil » gérait jusqu'ici les arguments
retirés.

**Independent Test**: modifier le deuxième mot au back-office, enregistrer, ouvrir l'accueil :
le nouveau mot apparaît ; remettre l'ancien.

**Acceptance Scenarios**:

1. **Given** la page « Contenus → Accueil », **When** un membre de l'équipe l'ouvre, **Then** il
   y trouve la phrase d'accroche (80 caractères au plus) et les trois mots (16 caractères au
   plus chacun), avec un aperçu de l'accueil. [Phase 1]
2. **Given** un mot ou la phrase modifié, **When** il enregistre, **Then** l'accueil affiche le
   nouveau texte et la modification est journalisée. [Phase 1]
3. **Given** un champ vide ou trop long, **When** il enregistre, **Then** l'enregistrement est
   refusé avec un message qui nomme le champ. [Phase 1]

---

### Edge Cases

- **Mot long** (16 caractères, par exemple « Clé en main ») : il tient dans son disque sur
  ordinateur et sur téléphone de 320 px, sans débordement ni défilement horizontal.
- **Phrase d'accroche longue** (80 caractères) : elle passe sur deux ou trois lignes, reste
  centrée et ne chevauche ni le logo ni le bouton « Pause ».
- **Onglet en arrière-plan** : l'animation ne compte pas les boucles tant que la page n'est pas
  visible ; elle ne « rattrape » pas le temps passé ailleurs.
- **Survol ou focus** : l'animation ne s'arrête pas au survol (elle est courte et finit seule) ;
  seul le bouton « Pause » l'arrête.
- **Script indisponible ou lent** : l'animation se joue quand même et s'arrête sur l'image
  finale, qui reste en grand ; le bouton « Pause » et la réduction en bandeau attendent le
  script.
- **Changement de préférence en cours de route** : si le visiteur active la réduction des
  animations pendant la lecture, l'animation passe directement au bandeau compact.
- **Contenus anciens** : les arguments de « Pourquoi préférer » enregistrés en base ne sont plus
  affichés nulle part ; ils ne gênent pas le nouvel écran.

## Requirements *(mandatory)*

### Functional Requirements

**Animation « Les trois temps »**

- **FR-001** : l'accueil DOIT s'ouvrir, sous le menu, par l'animation « Les trois temps », sur le
  fond ivoire de la page, avec les seules couleurs de la charte : les trois points (eucalyptus,
  sauge, bleu brume) et le texte en encre.
- **FR-002** : la séquence DOIT durer environ 10 secondes et enchaîner :
  1. l'arrivée des trois points, l'un après l'autre, du plus petit au plus grand, chacun avec un
     seul rebond amorti (dépassement d'environ 10 %, sans rebonds en série) ;
  2. leur écart et leur agrandissement jusqu'à un **même diamètre** ;
  3. l'apparition, l'un après l'autre, des mots « Liberté », « Expertise » et « Fidélité », chacun
     dans son disque, suivi des titres de ses arguments (FR-022) ; les trois restent affichés
     ensemble ;
  4. le regroupement : effacement des mots, retour aux tailles croissantes du logo, resserrement
     vers le centre, puis remplacement par le logo officiel sans saut visible ;
  5. l'apparition de la phrase d'accroche, des cinq arguments en cascade (FR-022) et du bouton « Voir l'offre ».
- **FR-003** : pendant la phase des mots, les trois disques DOIVENT avoir le même diamètre et
  les trois mots la même taille, la même graisse (Light) et la même couleur (encre). Aucun texte
  n'est écrit en couleur pastel.
- **FR-004** : la phrase d'accroche DOIT être l'élément principal de l'image finale : taille des
  grands titres du site (environ 56 px sur ordinateur, 36 px sur téléphone), Inter Light, encre,
  centrée. Le logo, au-dessus, est plus petit (environ 160 px de large sur ordinateur) et ne lui
  fait pas concurrence.
- **FR-005** : la phrase d'accroche DOIT être le titre principal (niveau 1) de la page d'accueil.
- **FR-006** : le logo de l'image finale DOIT être le fichier officiel de la charte, jamais
  recomposé ; les points animés DOIVENT reprendre ses couleurs et ses proportions pour que le
  passage de l'un à l'autre ne se voie pas.
- **FR-007** : le bouton d'action « Voir l'offre » (couleur d'action de la charte, flèche
  fixe) DOIT mener aux six cartes.
- **FR-008** : sur ordinateur (à partir de 768 px), les disques DOIVENT être côte à côte ; sur
  téléphone, l'un sous l'autre. L'animation DOIT occuper au plus 65 % de la hauteur visible sur
  ordinateur (le haut des six cartes reste visible) et environ 70 % sur téléphone. Aucun
  défilement horizontal de 320 à 1 920 px.

**Contrôle et accessibilité**

- **FR-009** : un bouton « Pause » / « Lecture » DOIT être affiché en permanence pendant et
  après l'animation ; il arrête et reprend tout mouvement, y compris celui de la flèche.
- **FR-010** : l'animation DOIT se jouer une seule fois et s'arrêter d'elle-même sur l'image
  finale, affichée environ 3 secondes avant la réduction en bandeau (FR-021). Décision du
  2026-11-09 (deux boucles auparavant).
- **FR-011** : si le visiteur a demandé à réduire les animations, l'accueil DOIT afficher
  directement le bandeau compact (FR-021) et les trois mots, sans aucun mouvement.
- **FR-012** : l'animation NE DOIT PAS dépendre d'un script : sans lui, elle se joue et s'arrête
  d'elle-même sur l'image finale. La phrase d'accroche et les trois mots sont présents dans la
  page dès son affichage (lecteurs d'écran, moteurs de recherche).
- **FR-013** : les lecteurs d'écran DOIVENT percevoir une seule fois la phrase d'accroche et les
  trois mots, sans annonce répétée à chaque étape ; les formes décoratives sont masquées.
- **FR-014** : le bouton et le lien DOIVENT avoir un focus visible et une cible d'au moins
  44 × 44 px ; les textes respectent un contraste d'au moins 4,5:1 sur leur fond.

- **FR-021** : après la lecture, l'animation DOIT se réduire en un bandeau compact (au moins
  100 px de moins que l'animation) : phrase d'accroche, toujours titre de la page, cinq arguments (FR-022) et
  bouton « Revoir ». Le logo,
  déjà présent dans l'en-tête, et le bouton « Voir l'offre » s'effacent. La réduction se fait
  en douceur (environ 0,75 s) en haut de page ; si le visiteur a déjà fait défiler la page, elle
  ne déplace pas ce qu'il lit. « Revoir » rend à l'animation sa taille et la rejoue.

- **FR-022** : cinq arguments commerciaux (1 à 30 caractères chacun), rangés sous les trois
  mots, DOIVENT apparaître pendant la phase des mots, sous le disque de leur mot (à sa droite sur
  téléphone), en texte droit, peu après le mot et l'un après l'autre ; ils restent lisibles au
  moins 1,5 s avant de s'effacer avec les mots. L'image finale les rappelle sous la phrase
  d'accroche, en une ou deux lignes, avec la pastille de couleur du point, suivis du bouton
  « Voir l'offre », qui mène aux six cartes ; le bandeau compact et le mouvement réduit les
  gardent. Pas de ligne d'explication dans l'animation (les explications ont leur place dans
  les pages Services, Financement et Fidélité) :
  - Liberté — « Achetez, louez ou financez » ; « Dépannage express » ;
  - Expertise — « Des interlocuteurs experts » ;
  - Fidélité — « L'assistance sans contrat » ; « Une fidélité récompensée ».

  Textes modifiables au back-office (FR-017). Décisions de Pauline du 2026-11-09 : option B ;
  « Une offre pour la cardiologie libérale » devenu la phrase d'accroche « Une offre pensée pour
  la cardiologie libérale » (à la place de « Tout ce qu'il vous faut, au même endroit. ») ; mots
  « Liberté », « Expertise », « Fidélité » (à la place de « Spécialiste », « Rapide »,
  « Complet ») ; assistance et fidélité regroupées sous « Fidélité » ; titres sous les bulles
  pour équilibrer la séquence (phase des mots moins vide, image finale moins chargée) ; texte
  courbé autour des bulles écarté (lisibilité, téléphone). Les anciens textes de départ sont
  remplacés au déploiement s'ils n'ont pas été modifiés. À confirmer avec Régis avant la mise en
  ligne : le système de points (F18, lot B), « sans contrat » et « express » au regard des CGV.

- **FR-023** : pour que le catalogue se voie dès l'arrivée, y compris sur un ordinateur portable
  de 13 pouces, la scène DOIT mesurer au plus 300 px de haut sur grand écran (1 200 px et plus),
  350 px sur tablette et 470 px sur téléphone ; à 1 280 × 800 px, le haut des six cartes est
  visible sans défiler. La section des six cartes
  n'a plus de surtitre « Accès rapide » : les trois points du logo précèdent directement le titre
  « Toute l'offre en un coup d'œil ».

**Ordre de l'accueil**

- **FR-015** : l'accueil DOIT présenter, dans cet ordre : l'animation, les six cartes « Toute
  l'offre en un coup d'œil », le carrousel, le bloc contact.
- **FR-016** : les sections « Pourquoi préférer ExploCardio.fr », « Offre digitale » (« Achetez,
  louez ou financez, à votre rythme ») et « Service et fidélité » DOIVENT être retirées de
  l'accueil.

**Back-office**

- **FR-017** : la page « Contenus → Accueil » DOIT permettre de modifier la phrase d'accroche
  (1 à 80 caractères) et les trois mots (1 à 16 caractères chacun), à la place de l'introduction
  et des quatre arguments ; avec aperçu de l'accueil, protection contre l'écrasement d'une
  modification concurrente et journalisation, comme aujourd'hui.
- **FR-018** : les textes de départ DOIVENT être « Une offre pensée pour la cardiologie libérale »,
  « Liberté », « Expertise » et « Fidélité ». Ils sont créés au déploiement s'ils manquent, sans
  écraser un texte déjà modifié.
- **FR-019** : le libellé de la page dans le menu des contenus DOIT devenir « Animation de
  l'accueil » (au lieu de « Pourquoi préférer ExploCardio.fr »).

**Charte**

- **FR-020** : la charte (`docs/brand/design-system.md`, § 7) DOIT mentionner l'exception :
  l'animation d'ouverture de l'accueil peut utiliser des rebonds amortis et des déplacements plus
  amples, sur environ 10 secondes, avec pause, arrêt automatique et respect de la réduction des
  animations ; les autres animations du site gardent la règle « fondu et translation de 8 px au
  plus, 200 ms ». Le § 8 (structure éditoriale) DOIT refléter le nouvel ordre de l'accueil.

### Key Entities

- **Textes de l'animation** : la phrase d'accroche et trois mots, contenus réels du site gérés au
  back-office ; ils remplacent l'introduction et les quatre arguments de « Pourquoi préférer ».

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** : sur un écran de 1 280 × 800 px, la phrase d'accroche est entièrement lisible et
  le haut des six cartes visible sans défiler.
- **SC-002** : la séquence complète (de l'arrivée des points à la phrase d'accroche) dure entre
  8 et 11 secondes ; l'animation se joue une seule fois.
- **SC-003** : pendant la phase des mots, une fois les disques posés, l'écart de diamètre entre
  eux est nul (au pixel près) et les trois mots ont la même taille de police ; seul le léger
  gonflement d'un disque à l'apparition de son mot (moins d'une demi-seconde) fait exception.
- **SC-004** : aucune violation d'accessibilité détectée sur l'accueil, en mouvement normal comme
  réduit ; aucun défilement horizontal de 320 à 1 920 px.
- **SC-005** : l'animation n'ajoute aucune image ni vidéo à télécharger (formes dessinées et
  texte) et ne retarde pas l'affichage du contenu de la page.
- **SC-006** : l'accueil compte quatre sections au lieu de six.

## Assumptions

- Les trois mots sont des adjectifs courts ; 16 caractères suffisent. La phrase d'accroche tient
  en 80 caractères.
- Le visiteur arrive en haut de page ; l'animation démarre au chargement, sans attendre qu'elle
  entre dans l'écran.
- Les pages qu'« Offre digitale » reliait restent accessibles par le menu (Services,
  Financement) et par les six cartes ; aucune nouvelle navigation n'est nécessaire.
- Le bloc contact reste tel quel ; Pauline saisit l'email dans le back-office
  (Paramètres → Contact).
- Les composants des sections retirées peuvent être supprimés du code ; leurs textes restent
  modifiables dans l'historique git si l'équipe veut les réutiliser ailleurs.
- L'exception à la charte (FR-020) est à confirmer avec Régis, qui a validé la charte.

## Dependencies

- F01 et F16 (accueil, carrousel, six cartes, page « Contenus → Accueil »).
- Charte : `docs/brand/design-system.md`, `docs/brand/tokens.css`, logo
  `docs/brand/assets/explocardio-fr-logo.svg`.
