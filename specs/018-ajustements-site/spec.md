# Feature Specification: F18 — Ajustements du site (lot A)

**Feature Branch**: `018-ajustements-site`

**Created**: 2026-11-02

**Status**: Draft

**Input**: User description: "F18 — Ajustements du site (retours de Pauline du 2026-11-02), lot A : 1) la commande en ligne n'est livrée automatiquement qu'en France métropolitaine continentale ; pour la Corse et l'outre-mer, le client nous contacte (comme pour l'étranger aujourd'hui) — mettre à jour les CGV en conséquence. 2) Dans le panier, les boutons de quantité (moins / plus) sont visibles en permanence, sans survol. 3) Retirer un article du panier demande une confirmation dans une fenêtre (« Retirer cet article du panier ? »). 4) La loupe de l'en-tête devient une barre de recherche avec loupe (toujours visible sur ordinateur ; sur téléphone, la loupe ouvre la barre). 5) Le libellé « Panier » s'affiche à côté de l'icône du panier, comme « Mon compte ». 6) Le lien « Connexion » disparaît de l'en-tête : seul « Mon compte » reste ; sans être connecté, il mène à la page de connexion (avec lien pour créer un compte). Lot B (cagnotte de points sur les services au trimestre, conversion en bons d'achat, parrainage « modèle Décathlon ») : hors de ce lot, en attente des réponses de Régis (docs/questions-cagnotte-parrainage.docx), à spécifier ensuite."

## Contexte et objectif

Après la page d'attente (F17), Pauline a relevé des ajustements sur le site de démonstration.
F18 les regroupe en deux lots :

- **lot A (cette spec)** : six ajustements de périmètre et d'ergonomie, dont les règles sont
  arrêtées ;
- **lot B (spec ultérieure)** : la cagnotte de points utilisables sur les services, le service
  au trimestre, la conversion en bons d'achat et le parrainage. Ses règles sont en attente des
  réponses de Régis (document `docs/questions-cagnotte-parrainage.docx`). Le lot B remplacera
  une partie de F06 (fidélité, bons d'achat, droits d'assistance) ; le lot A n'y touche pas.

Objectifs du lot A :

- **un périmètre de livraison réaliste** : la commande en ligne n'est livrée qu'en France
  métropolitaine continentale. La Corse rejoint l'outre-mer et l'étranger : le médecin est
  orienté vers l'équipe, qui lui adresse une offre ;
- **un panier plus sûr et plus évident** : quantités modifiables d'un coup d'œil, et pas de
  retrait d'article par erreur ;
- **un en-tête plus explicite** : une vraie barre de recherche, et des libellés « Panier » et
  « Mon compte » sans ambiguïté.

F18 modifie des parcours livrés par F01 (en-tête, recherche), F02 (adresses), F04 (panier,
commande), F05 (mise à disposition) et F16 (commandes hors métropole). Les règles de ces
modules restent valables pour tout ce que F18 ne change pas.

**Phases** : tout le lot A se vérifie en phase 1, avec les connecteurs de démonstration.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Commander pour la France continentale, être orienté ailleurs (Priority: P1)

Un médecin installé à Ajaccio veut commander. Quand il indique son adresse de livraison en Corse,
le site lui explique que la commande en ligne est livrée en France métropolitaine continentale,
et lui propose de contacter l'équipe, comme aujourd'hui pour l'outre-mer et l'étranger. L'équipe
lui adresse une offre avec des frais de port adaptés.

**Why this priority**: c'est une règle commerciale, qui engage ExploCardio.fr sur des délais et
des frais de livraison qu'il ne peut pas tenir en Corse. Elle doit être juste partout : sur le
site, dans les emails et dans les CGV.

**Independent Test**: avec une adresse de livraison en Corse (codes postaux 20…), tenter de
s'inscrire, d'enregistrer l'adresse dans « Mon compte », de commander, de louer et de demander
un devis : chaque parcours refuse l'adresse avec le message et le lien de contact. Avec une
adresse à Lyon, tout fonctionne comme avant.

**Acceptance Scenarios**:

1. **Given** un médecin qui saisit une adresse de livraison en Corse, à l'inscription, dans
   « Mon compte » ou dans le tunnel de commande, **When** il valide, **Then** l'adresse est
   refusée avec un message indiquant que la livraison en ligne est réservée à la France
   métropolitaine continentale, et un lien « Nous contacter » qui ouvre le formulaire de
   contact prérempli (motif « Commande hors métropole »).
2. **Given** un médecin dont l'adresse de livraison enregistrée est en Corse, **When** il
   arrive à l'étape livraison du tunnel, à une mise à disposition ou à une demande de devis,
   **Then** la commande ne peut pas être passée en ligne, et il est invité à changer d'adresse
   ou à nous contacter.
3. **Given** une adresse en outre-mer ou à l'étranger, **When** elle est saisie, **Then** le
   comportement est inchangé (refus et lien de contact), avec le même message.
4. **Given** une adresse de **facturation** en Corse et une adresse de livraison en France
   continentale, **When** le médecin commande, **Then** la commande est acceptée : seule
   l'adresse de livraison compte.
5. **Given** toutes les mentions du périmètre de livraison (fiches produit, panier, tunnel,
   aide des champs d'adresse, devis, emails, centre d'aide, CGV), **When** on les lit,
   **Then** elles indiquent « France métropolitaine continentale (hors Corse) » et orientent la
   Corse, l'outre-mer et l'étranger vers l'équipe ; aucune ne mentionne plus « Corse comprise ».

---

### User Story 2 - Modifier les quantités du panier d'un coup d'œil (Priority: P1)

Dans son panier, le médecin voit, pour chaque article, un bouton « − » et un bouton « + » de
part et d'autre de la quantité, sans avoir à survoler le champ. Il peut aussi taper la quantité
directement.

**Why this priority**: aujourd'hui, les flèches n'apparaissent qu'au survol de la souris, et
jamais sur une tablette ou un téléphone : le médecin ne voit pas qu'il peut changer la quantité.

**Independent Test**: sur ordinateur, tablette et téléphone, ouvrir un panier : les boutons
« − » et « + » sont visibles sans aucune action ; les utiliser met à jour la quantité et les
prix comme aujourd'hui.

**Acceptance Scenarios**:

1. **Given** un panier, **When** il s'affiche, **Then** chaque article modifiable montre un
   bouton « − », la quantité et un bouton « + », visibles sans survol, sur tous les écrans.
2. **Given** une quantité de 3, **When** le médecin appuie sur « + », **Then** elle passe à 4 et
   les prix de la ligne et du panier se mettent à jour comme pour une saisie (dégressifs compris).
3. **Given** une quantité de 1, **When** le médecin regarde le bouton « − », **Then** il est
   inactif : on ne descend pas sous 1 (le retrait passe par « Retirer »).
4. **Given** la quantité maximale autorisée, **When** il regarde le bouton « + », **Then** il
   est inactif.
5. **Given** un lecteur d'écran ou le clavier seul, **When** le médecin utilise les boutons,
   **Then** ils sont annoncés (« Diminuer la quantité de … », « Augmenter la quantité de … ») et
   la nouvelle quantité est annoncée.

---

### User Story 3 - Confirmer le retrait d'un article du panier (Priority: P1)

Quand le médecin appuie sur « Retirer », une fenêtre lui demande « Retirer cet article du
panier ? », avec le nom de l'article, un bouton « Retirer » et un bouton « Annuler ». L'article
n'est retiré qu'après confirmation.

**Why this priority**: un retrait par erreur oblige à retrouver l'article et sa configuration
dans le catalogue ; la confirmation l'évite.

**Independent Test**: appuyer sur « Retirer », puis « Annuler » : l'article reste ; recommencer
et confirmer : l'article disparaît et les totaux se mettent à jour.

**Acceptance Scenarios**:

1. **Given** un article du panier, **When** le médecin appuie sur « Retirer », **Then** une
   fenêtre s'ouvre : « Retirer cet article du panier ? », le nom de l'article, les boutons
   « Retirer » et « Annuler ». Le reste de la page n'est plus utilisable tant qu'elle est
   ouverte.
2. **Given** la fenêtre ouverte, **When** il choisit « Annuler », appuie sur Échap ou clique en
   dehors, **Then** la fenêtre se ferme, l'article reste et le focus revient sur le bouton
   « Retirer » de cet article.
3. **Given** la fenêtre ouverte, **When** il confirme, **Then** l'article est retiré, les
   totaux et la pastille du panier se mettent à jour, et un message annonce le retrait.
4. **Given** un kit obligatoire, **When** le panier s'affiche, **Then** il n'a toujours pas de
   bouton « Retirer » (règle de F05 inchangée).

---

### User Story 4 - Rechercher depuis une vraie barre de recherche (Priority: P2)

Sur ordinateur, l'en-tête affiche une barre de recherche avec sa loupe, prête à la saisie. Sur
téléphone et tablette, la loupe reste seule, faute de place, et ouvre la barre au toucher.
Les suggestions et la page de résultats sont celles d'aujourd'hui.

**Why this priority**: une barre visible invite à chercher ; une loupe seule passe inaperçue.
Utile, mais le site fonctionne sans.

**Independent Test**: sur un écran de 1 280 px, la barre est visible dans l'en-tête et accepte
la saisie sans clic préalable sur la loupe ; sur un écran de 390 px, la loupe ouvre la barre.

**Acceptance Scenarios**:

1. **Given** un écran d'ordinateur (à partir de 1 024 px), **When** une page s'affiche, **Then**
   l'en-tête montre un champ de recherche avec une loupe et un texte d'exemple
   (« Rechercher un produit… »).
2. **Given** ce champ, **When** le médecin tape au moins 2 caractères, **Then** les suggestions
   apparaissent comme aujourd'hui ; Entrée ou la loupe mènent à la page de résultats.
3. **Given** un téléphone ou une tablette, **When** une page s'affiche, **Then** seule la loupe
   apparaît ; la toucher ouvre la barre, comme aujourd'hui.
4. **Given** un écran de 1 024 px ou un PC Windows à affichage agrandi (125 % et 150 %),
   **When** l'en-tête s'affiche, **Then** la barre, « Panier » et « Mon compte » tiennent sur
   la première ligne, et le menu principal reste complet sur la seconde (règle de F16).

---

### User Story 5 - Des libellés clairs : « Panier » et « Mon compte » (Priority: P2)

Sur ordinateur, l'icône du panier est accompagnée du mot « Panier », comme celle du compte est
accompagnée de « Mon compte ». Le libellé « Mon compte / Connexion » devient « Mon compte ».
Un visiteur non connecté qui clique sur « Mon compte » arrive sur la page de connexion, qui
propose aussi de créer un compte.

**Why this priority**: des libellés explicites rassurent ; « Mon compte / Connexion » était
lourd. Utile, mais rien n'est bloqué aujourd'hui.

**Independent Test**: sur ordinateur, lire « Panier » et « Mon compte » dans l'en-tête ;
déconnecté, cliquer sur « Mon compte » : la page de connexion s'ouvre, avec le lien de création
de compte ; connecté, le même lien ouvre « Mon compte ».

**Acceptance Scenarios**:

1. **Given** un écran d'ordinateur, **When** l'en-tête s'affiche, **Then** on lit « Panier » à
   côté de l'icône du panier, avec la pastille du nombre d'articles, et « Mon compte » à côté de
   l'icône du compte. Le mot « Connexion » n'apparaît plus dans l'en-tête.
2. **Given** un téléphone, **When** l'en-tête s'affiche, **Then** les icônes restent seules,
   faute de place, et leurs noms accessibles sont « Panier » (avec le nombre d'articles) et
   « Mon compte ».
3. **Given** un visiteur non connecté, **When** il clique sur « Mon compte », **Then** il arrive
   sur la page de connexion, qui propose « Créer un compte » ; après connexion, il est conduit
   à « Mon compte ».
4. **Given** un client connecté, **When** il clique sur « Mon compte », **Then** il arrive
   directement sur « Mon compte ».
5. **Given** un membre de l'équipe connecté, **When** il clique sur « Mon compte », **Then** le
   comportement d'aujourd'hui est conservé.

---

### Edge Cases

- **Client existant avec une adresse de livraison en Corse** : son compte reste valide et
  consultable. Il ne peut plus commander en ligne vers cette adresse ; à sa prochaine commande,
  le site lui demande une adresse en France continentale ou l'oriente vers l'équipe.
- **Panier constitué avant le changement** pour une adresse en Corse : il est conservé ; le
  refus intervient à l'étape livraison.
- **Devis valide émis vers la Corse avant le changement** : il n'est plus transformable en
  commande en ligne ; le médecin est orienté vers l'équipe, qui honore le devis hors du site.
- **Location en cours livrée en Corse** : elle se poursuit normalement (échéances, résiliation,
  retour). Seules les nouvelles commandes sont concernées.
- **Code postal corse** : tous les codes postaux commençant par 20 (Corse-du-Sud et
  Haute-Corse) sont concernés.
- **Saisie directe d'une quantité** hors limites (0, vide, 1 000) : règle actuelle inchangée
  (retour à la quantité enregistrée ou plafonnement).
- **Double appui rapide sur « + »** : chaque appui compte ; l'enregistrement suit la dernière
  quantité affichée, sans perte.
- **Retrait confirmé alors que la connexion est coupée** : l'article reste, et un message
  indique que le retrait n'a pas abouti (règle actuelle).
- **Recherche indisponible** : la barre reste affichée ; le message actuel (« La recherche est
  momentanément indisponible ») s'applique.
- **Page de connexion atteinte depuis « Mon compte » par un client déjà connecté** (ancien
  favori) : il est conduit à « Mon compte ».

## Requirements *(mandatory)*

### Functional Requirements

**Périmètre de livraison**

- **FR-001** : La commande en ligne (achat, mise à disposition, abonnement avec livraison,
  devis transformé en commande) NE DOIT être livrée qu'en France métropolitaine continentale.
  Une adresse de livraison en Corse (codes postaux commençant par 20), en outre-mer ou à
  l'étranger DOIT être refusée.
- **FR-002** : Le refus DOIT être expliqué par un message unique (« ExploCardio.fr livre en
  ligne en France métropolitaine continentale. Pour la Corse, l'outre-mer ou l'étranger,
  contactez-nous : nous vous adressons une offre. ») et un lien vers le formulaire de contact
  prérempli (motif « Commande hors métropole »), partout où une adresse de livraison est saisie
  ou utilisée : inscription, « Mon compte », tunnel de commande, mise à disposition, devis.
- **FR-003** : L'adresse de facturation NE DOIT PAS être soumise à cette règle.
- **FR-004** : Toutes les mentions du périmètre de livraison (fiches produit, panier, tunnel,
  aide des champs d'adresse, devis, emails, centre d'aide, page « Dépannage express », CGV)
  DOIVENT être mises à jour ; plus aucune NE DOIT indiquer « Corse comprise ».
- **FR-005** : Les commandes et locations déjà en cours vers la Corse NE DOIVENT PAS être
  modifiées. Un devis vers la Corse émis avant le changement NE DOIT PLUS pouvoir être commandé
  en ligne ; le médecin DOIT être orienté vers l'équipe.
- **FR-006** : La partie « Livraison » des CGV DOIT indiquer la France métropolitaine
  continentale et orienter la Corse, l'outre-mer et l'étranger vers l'équipe ; la mention de
  la Corse dans la clause « livraison express » DOIT être retirée.

**Quantités du panier**

- **FR-007** : Chaque article du panier dont la quantité est modifiable DOIT afficher un bouton
  « − » et un bouton « + » autour de la quantité, visibles en permanence sur tous les écrans,
  avec des cibles d'au moins 44 px.
- **FR-008** : Les boutons DOIVENT modifier la quantité d'une unité, dans les limites actuelles
  (1 au minimum, maximum inchangé) ; le bouton correspondant DOIT être inactif à la limite.
  Le champ DOIT rester saisissable au clavier.
- **FR-009** : Une quantité modifiée par les boutons DOIT être enregistrée et mettre à jour les
  prix comme une saisie aujourd'hui (prix en direct de F16, dégressifs, pastille du panier).
- **FR-010** : Les boutons DOIVENT avoir un nom accessible qui cite l'article, et la nouvelle
  quantité DOIT être annoncée aux lecteurs d'écran.
- **FR-011** : Le sélecteur de quantité des fiches produit DOIT adopter les mêmes boutons
  visibles, pour un usage cohérent sur tout le site.

**Retrait d'un article**

- **FR-012** : « Retirer » DOIT ouvrir une fenêtre de confirmation (« Retirer cet article du
  panier ? », nom de l'article, boutons « Retirer » et « Annuler ») ; l'article NE DOIT être
  retiré qu'après confirmation.
- **FR-013** : La fenêtre DOIT être modale et accessible : focus placé dans la fenêtre à
  l'ouverture, maintenu dedans, fermeture par « Annuler », Échap ou clic à l'extérieur, et
  retour du focus sur le bouton « Retirer » d'origine.
- **FR-014** : Après confirmation, les totaux et la pastille du panier DOIVENT se mettre à jour
  et un message DOIT annoncer le retrait. Le focus DOIT être placé sur un élément logique
  (article suivant, ou titre du panier s'il est vide).

**En-tête**

- **FR-015** : À partir de 1 024 px, l'en-tête DOIT afficher un champ de recherche visible avec
  une loupe et un texte d'exemple, utilisable sans clic préalable. En dessous, la loupe seule
  DOIT ouvrir la barre, comme aujourd'hui.
- **FR-016** : Le comportement de la recherche (suggestions dès 2 caractères, groupes, prix HT,
  page de résultats, accessibilité de la liste de suggestions) NE DOIT PAS changer.
- **FR-017** : À partir de 1 024 px, l'icône du panier DOIT être accompagnée du libellé
  « Panier » et de la pastille du nombre d'articles ; l'icône du compte, du libellé
  « Mon compte ». En dessous, les icônes restent seules, avec ces noms accessibles.
- **FR-018** : Le mot « Connexion » NE DOIT plus apparaître dans l'en-tête. « Mon compte » DOIT
  conduire un visiteur non connecté à la page de connexion (qui propose « Créer un compte »)
  puis, après connexion, à « Mon compte » ; un utilisateur connecté, directement à
  « Mon compte » (ou à sa destination actuelle pour l'équipe).
- **FR-019** : L'en-tête DOIT rester conforme à F16 : première ligne complète et menu principal
  complet sur la seconde, de 1 024 à 1 920 px et sur PC Windows à 125 % et 150 % ; aucun
  défilement horizontal de 320 à 1 920 px.

**Transverse**

- **FR-020** : Tous les écrans modifiés DOIVENT respecter la charte (docs/brand) et le WCAG 2.2 AA
  (contraste, focus visible, cibles de 44 px, clavier, réduction des animations).
- **FR-021** : Aucun écran modifié NE DOIT collecter de donnée de patient.

### Lot C — un seul mode de livraison (décision de Régis du 2026-11-06)

- **FR-022** : Les commandes d'achat NE DOIVENT proposer qu'un seul mode de livraison, la
  livraison standard (forfait, franco au-delà du seuil). La livraison express et sa règle
  d'heure limite disparaissent du tunnel de commande et des CGV.
- **FR-023** : Le « Dépannage express » (mise à disposition livrée le lendemain) DOIT rester
  inchangé, avec son heure limite (paramètre « Heure limite d'expédition »).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** [Phase 1] : 100 % des parcours testés (inscription, « Mon compte », tunnel, mise
  à disposition, devis) refusent une adresse de livraison en Corse avec le message et le lien
  de contact, et acceptent une adresse en France continentale.
- **SC-002** [Phase 1] : Aucune page, aucun email et aucun texte légal du site ne contient plus
  « Corse comprise ».
- **SC-003** [Phase 1] : Sur 320, 390, 768, 1 024 et 1 280 px, les boutons « − » et « + » de
  chaque article du panier sont visibles sans survol, et une quantité se change en un appui.
- **SC-004** [Phase 1] : Aucun article n'est retiré du panier sans confirmation ; « Annuler »
  laisse le panier inchangé dans 100 % des cas testés.
- **SC-005** [Phase 1] : Sur ordinateur, une recherche commence sans clic préalable : le
  médecin tape directement dans la barre.
- **SC-006** [Phase 1] : Sur 1 024, 1 280 et 1 920 px et sur PC Windows à 125 % et 150 %,
  l'en-tête affiche « Panier » et « Mon compte », jamais « Connexion », et le menu principal
  reste complet.
- **SC-007** [Phase 1] : Un audit des écrans modifiés ne relève aucune non-conformité
  WCAG 2.2 AA.

## Assumptions

- **Corse** : la décision vient de Pauline (2026-11-02) : seule la France métropolitaine
  continentale est livrée automatiquement. Elle annule la règle « Corse comprise » de F02, F04
  et F16. Les zones sans livraison au lendemain (paramètre de F05) restent réglables pour le
  continent.
- **Monaco et Andorre** : traités comme l'étranger (refus et lien de contact), comme
  aujourd'hui.
- **Fiches produit** : la quantité y est aussi modifiable ; les mêmes boutons visibles y sont
  appliqués par cohérence (FR-011), même si la demande portait sur le panier.
- **Barre de recherche** : toujours visible à partir de 1 024 px (seuil du menu horizontal de
  F16) ; en dessous, la loupe ouvre la barre, faute de place.
- **Libellés** : « Panier » et « Mon compte » ne s'affichent en toutes lettres qu'à partir de
  1 024 px, comme « Mon compte » aujourd'hui.
- **Page de connexion** : elle propose déjà « Créer un compte » (F02) ; elle n'est pas modifiée.
- **Lot B** : la cagnotte de points, le service au trimestre, la conversion en bons d'achat et
  le parrainage feront l'objet d'une spec séparée, après les réponses de Régis. D'ici là, la
  fidélité de F06 reste en place.

## Dependencies

- **F01** (en-tête, recherche), **F02** (adresses, connexion), **F04** (panier, tunnel),
  **F05** (mise à disposition, dépannage express), **F09** (centre d'aide), **F10** (emails),
  **F16** (en-tête sur tous les écrans, prix en direct, devis, commandes hors métropole).
- **CGV** : projet de texte du 2026-10-29 (`contenus/cgv.md`), partie « Livraison ».
