# Feature Specification: F09 — Contact WhatsApp et centre d'aide

**Feature Branch**: `009-contact-whatsapp-aide`

**Created**: 2026-10-14

**Status**: Draft

**Input**: User description: "F09 — Contact WhatsApp et centre d'aide : un numéro unique ExploCardio.fr sur WhatsApp Business, affiché avec un bouton « Appeler » et un bouton « Écrire sur WhatsApp » (message pré-rempli), sans lien technique entre le site et WhatsApp ; horaires de réponse ; centre d'aide en libre-service (tutoriels, modes d'emploi, notices, FAQ). Objectif : offrir un contact humain simple et immédiat, et un centre d'aide en libre-service. Le SAV et la prise de rendez-vous ne sont pas gérés par le site pour l'instant. Cette spec remplace la version « Hotline téléphonique, demandes de rappel et centre d'aide »."

## Contexte et objectif

ExploCardio.fr promet un contact humain simple et réactif, sans forfait annuel de hotline.
F09 le tient avec deux moyens :

- **une ligne WhatsApp Business** : un numéro unique, sur lequel le médecin appelle ou écrit
  comme dans une messagerie ;
- **un centre d'aide en libre-service** : tutoriels vidéo, modes d'emploi pas à pas,
  notices et FAQ.

Le site n'a **aucun lien technique** avec WhatsApp : il affiche le numéro, un bouton
« Appeler » et un bouton « Écrire sur WhatsApp ». Tout le reste se passe dans WhatsApp.

**Hors périmètre de F09** : formulaire de demande de rappel, déclaration de panne, suivi SAV,
espace garanties et prise de rendez-vous en ligne. Ces besoins seront couverts plus tard par
une application SAV externe. Sont aussi hors périmètre : la configuration de WhatsApp
Business elle-même ; les droits d'assistance et l'assistance à l'acte (F06) ; le back-office
complet (F13).

**Lien avec les autres modules** : le numéro et les boutons apparaissent dans le pied de page
(F01), dans « Mon compte » (F02), sur les fiches produit (F03) et dans les emails
transactionnels (F10). Les droits d'assistance du client (F06) sont visibles dans « Mon
compte » et dans le back-office.

**Phases (constitution v2.2.0)** : WhatsApp n'est pas un service connecté. En phase 1, le
numéro affiché est fictif et les boutons ouvrent un lien de démonstration qui ne contacte
personne. Les contenus du centre d'aide et les réglages du numéro et des horaires sont réels
dès la phase 1.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Joindre l'équipe d'un geste (Priority: P1)

Un médecin a besoin d'aide. Où qu'il soit sur le site, il trouve le numéro d'ExploCardio.fr
avec deux boutons : « Appeler » et « Écrire sur WhatsApp ». Sur son téléphone, un geste
suffit.

**Why this priority**: c'est le seul contact humain du site après la réduction de
périmètre. Il doit être visible partout et immédiat.

**Independent Test**: vérifier la présence du numéro et des deux boutons à chaque
emplacement prévu, puis, sur mobile, lancer un appel et ouvrir une conversation WhatsApp.

**Acceptance Scenarios**:

1. **Given** la page « Assistance », « Mon compte », le pied de page ou une fiche produit,
   **When** la page s'affiche, **Then** le numéro, les horaires de réponse et les boutons
   « Appeler » et « Écrire sur WhatsApp » y figurent.
2. **Given** un mobile, **When** le médecin touche « Appeler », **Then** l'appel vers le
   numéro est lancé.
3. **Given** un mobile, **When** le médecin touche « Écrire sur WhatsApp », **Then**
   l'application WhatsApp s'ouvre sur une conversation avec ExploCardio.fr, avec un
   message pré-rempli.
4. **Given** un ordinateur, **When** le médecin choisit « Écrire sur WhatsApp », **Then**
   la conversation s'ouvre dans WhatsApp sur ordinateur ou sur le web.
5. **Given** les boutons, **When** ils s'affichent, **Then** la mention « Ne transmettez
   aucune donnée patient » figure à proximité.
6. **Given** une consultation en dehors des horaires de réponse, **When** le numéro
   s'affiche, **Then** le site indique quand l'équipe répondra.
7. **Given** un email transactionnel, **When** le client le reçoit, **Then** il y trouve le
   numéro, les horaires et le lien « Écrire sur WhatsApp ».

---

### User Story 2 - Être reconnu dès le premier message (Priority: P1)

Un client connecté choisit « Écrire sur WhatsApp ». Le message pré-rempli contient déjà son
nom et son cabinet ; il n'a plus qu'à décrire son besoin.

**Why this priority**: l'équipe sait aussitôt à qui elle parle et peut consulter le compte
du client sans lui poser de question.

**Independent Test**: ouvrir « Écrire sur WhatsApp » connecté puis déconnecté, et comparer
les messages pré-remplis.

**Acceptance Scenarios**:

1. **Given** un client connecté, **When** il choisit « Écrire sur WhatsApp », **Then** le
   message pré-rempli est « Bonjour, je suis le Dr [nom], cabinet [nom du cabinet]. »,
   complété avec ses informations.
2. **Given** un visiteur non connecté, **When** il choisit « Écrire sur WhatsApp »,
   **Then** le message pré-rempli contient « Bonjour, je suis le Dr …, cabinet … » à
   compléter.
3. **Given** le message pré-rempli, **When** il est ouvert dans WhatsApp, **Then** le
   médecin peut le modifier avant de l'envoyer.
4. **Given** le message pré-rempli, **When** il est composé, **Then** il ne contient que le
   nom et le cabinet, jamais de donnée de patient ni de numéro de compte.

---

### User Story 3 - Trouver la réponse seul (Priority: P1)

Pour une question simple, le médecin ouvre le centre d'aide : tutoriels vidéo, modes d'emploi
pas à pas, notices et FAQ. S'il ne trouve pas, chaque page lui rappelle comment joindre
l'équipe sur WhatsApp.

**Why this priority**: le libre-service allège la ligne WhatsApp et répond à toute heure.
C'est un critère d'acceptation.

**Independent Test**: retrouver un tutoriel par appareil puis par recherche, consulter une
question de la FAQ, et vérifier le rappel « Besoin d'aide ? » en bas de page.

**Acceptance Scenarios**:

1. **Given** le centre d'aide, **When** il s'affiche, **Then** tutoriels vidéo, modes
   d'emploi pas à pas et notices PDF sont classés par appareil, par logiciel et par thème.
2. **Given** un tutoriel vidéo, **When** le visiteur l'ouvre, **Then** il dispose de
   sous-titres et d'une transcription.
3. **Given** un mode d'emploi pas à pas, **When** le visiteur le suit, **Then** il avance
   étape par étape, chaque étape ayant son texte et son image.
4. **Given** la FAQ, **When** elle s'affiche, **Then** les questions les plus consultées
   apparaissent en tête, et une recherche permet d'en trouver d'autres.
5. **Given** une fiche produit, **When** elle s'affiche, **Then** elle propose les contenus
   d'aide de ce modèle.
6. **Given** n'importe quelle page d'aide, **When** le visiteur arrive en bas, **Then** il
   lit « Besoin d'aide ? Écrivez-nous ou appelez-nous sur WhatsApp », avec les deux
   boutons.
7. **Given** une recherche sans résultat, **When** elle s'affiche, **Then** le visiteur est
   invité à écrire ou appeler sur WhatsApp.

---

### User Story 4 - Régler le numéro, les horaires et les contenus (Priority: P2)

L'administrateur modifie le numéro WhatsApp et les horaires de réponse, et publie les
contenus du centre d'aide, sans développeur.

**Why this priority**: une information de contact fausse ruinerait la promesse de
réactivité ; mais le site s'ouvre avec des réglages initiaux.

**Independent Test**: modifier le numéro et les horaires dans le back-office et vérifier
leur mise à jour à tous les emplacements ; publier un tutoriel relié à un produit.

**Acceptance Scenarios**:

1. **Given** un administrateur, **When** il modifie le numéro dans le back-office, **Then**
   le nouveau numéro et les liens des deux boutons sont mis à jour partout, y compris dans
   les emails suivants.
2. **Given** un administrateur, **When** il modifie les horaires de réponse ou ajoute une
   fermeture exceptionnelle, **Then** l'affichage est mis à jour partout ; les jours fériés
   sont pris en compte automatiquement.
3. **Given** un administrateur, **When** il crée un contenu d'aide, **Then** il lui
   attribue un type, des appareils ou logiciels, un thème, et le relie aux fiches produit.
4. **Given** un contenu en préparation, **When** il n'est pas publié, **Then** il est
   invisible du public.

---

### User Story 5 - Connaître les droits du client qui écrit (Priority: P2)

Un client contacte l'équipe sur WhatsApp. Le membre de l'équipe ouvre le back-office,
retrouve le client et voit l'état de ses droits d'assistance.

**Why this priority**: c'est ce qui permet d'appliquer le modèle d'assistance de F06 au
quotidien, mais la conversation elle-même se passe hors du site.

**Independent Test**: rechercher un client dans le back-office par son nom, son cabinet ou
son téléphone, et lire l'état de ses droits ; vérifier le même état dans son « Mon compte ».

**Acceptance Scenarios**:

1. **Given** un membre de l'équipe, **When** il recherche un client dans le back-office par
   nom, cabinet, téléphone, email ou numéro RPPS ou SIRET, **Then** il voit le statut de
   ses droits d'assistance, leur date de fin et, le cas échéant, une intervention à l'acte
   déjà payée (F06).
2. **Given** un client connecté, **When** il ouvre « Mon compte », **Then** il voit l'état
   de ses droits d'assistance à côté du contact WhatsApp.
3. **Given** un client sans droits actifs, **When** l'équipe le constate, **Then** elle
   peut lui proposer l'assistance à l'acte de F06.

---

### Edge Cases

- WhatsApp absent du téléphone : le lien ouvre la page d'installation ou la version web de
  WhatsApp ; le numéro reste affiché pour un appel classique.
- « Appeler » sur un ordinateur sans téléphonie : le numéro reste lisible et copiable.
- Numéro non encore renseigné dans le back-office : aucun numéro vide ni bouton inactif
  n'est affiché ; le formulaire de contact de F01 est proposé à la place.
- Nom ou cabinet comportant des caractères spéciaux : le message pré-rempli reste lisible.
- Médecin qui écrit une donnée de patient dans WhatsApp : cela se passe hors du site ; la
  mention près des boutons le prévient, et la conduite à tenir par l'équipe relève de sa
  procédure interne.
- Vidéo illisible sur l'appareil du visiteur : la transcription reste consultable.
- Navigation au clavier ou avec un lecteur d'écran : les deux boutons ont un libellé
  explicite et indiquent qu'ils ouvrent une autre application.

## Requirements *(mandatory)*

### Functional Requirements

**Contact WhatsApp**

- **FR-001** : Le site DOIT afficher un numéro unique ExploCardio.fr, celui de la ligne
  WhatsApp Business, avec un bouton « Appeler » et un bouton « Écrire sur WhatsApp ».
- **FR-002** : Le site NE DOIT avoir aucun lien technique avec WhatsApp : il affiche le
  numéro et ouvre l'application ou la conversation, rien de plus.
- **FR-003** : Le numéro et les deux boutons DOIVENT figurer sur la page « Assistance », dans
  le pied de page, dans « Mon compte », sur chaque fiche produit et dans les emails
  transactionnels.
- **FR-004** : « Appeler » DOIT lancer l'appel sur mobile. « Écrire sur WhatsApp » DOIT ouvrir
  la conversation avec ExploCardio.fr, avec un message pré-rempli.
- **FR-005** : Le message pré-rempli DOIT être « Bonjour, je suis le Dr …, cabinet … »,
  complété automatiquement avec le nom et le cabinet si le client est connecté. Il NE DOIT
  contenir aucune autre information.
- **FR-006** : Les horaires de réponse DOIVENT être affichés à côté du numéro. En dehors des
  horaires, le site DOIT indiquer quand l'équipe répondra.
- **FR-007** : La mention « Ne transmettez aucune donnée patient » DOIT figurer près des
  boutons.
- **FR-008** : Le numéro, les horaires de réponse et les fermetures exceptionnelles DOIVENT
  se modifier dans le back-office (F13), sans développeur, et être mis à jour partout. Les
  jours fériés sont calculés automatiquement (calendrier français).

**Droits d'assistance**

- **FR-009** : Les droits d'assistance du client (F06) DOIVENT être visibles dans « Mon
  compte », à côté du contact WhatsApp.
- **FR-010** : L'équipe DOIT pouvoir rechercher un client dans le back-office et y consulter
  ses droits d'assistance, lus dans Odoo par son connecteur, en lecture seule.

**Centre d'aide**

- **FR-011** : Le site DOIT proposer un centre d'aide réunissant tutoriels vidéo, modes
  d'emploi pas à pas et notices PDF, classés par appareil, par logiciel et par thème, et
  consultable par tout visiteur. Les notices et fiches techniques déjà rattachées aux fiches
  produit (F03) y sont reprises automatiquement, sans second téléversement.
- **FR-012** : Le site DOIT proposer une FAQ avec une recherche, les questions les plus
  consultées apparaissant en tête.
- **FR-013** : Les contenus d'aide DOIVENT être gérés dans le back-office, avec un état en
  préparation ou publié, et reliés aux fiches produit (F03).
- **FR-014** : Chaque page d'aide DOIT se terminer par « Besoin d'aide ? Écrivez-nous ou
  appelez-nous sur WhatsApp », avec les deux boutons.
- **FR-015** : Chaque tutoriel vidéo DOIT comporter des sous-titres et une transcription.
- **FR-016** : Aucun contenu d'aide NE DOIT comporter de donnée de patient réelle.

**Phase 1**

- **FR-017** : En phase 1, le numéro affiché DOIT être fictif, et les deux boutons DOIVENT
  ouvrir un lien de démonstration qui ne contacte personne.

**Charte, accessibilité et langue**

- **FR-018** : Les écrans de F09 DOIVENT respecter la charte, le niveau WCAG 2.2 AA, le
  vouvoiement et le ton sobre du site. Les deux boutons DOIVENT avoir un libellé explicite
  et des cibles tactiles d'au moins 44 px.

### Key Entities

- **Réglages du contact** : numéro WhatsApp, horaires de réponse, fermetures
  exceptionnelles. Le message pré-rempli est fixe (FR-005) et ne se règle pas.
- **Contenu d'aide** : type (tutoriel vidéo, mode d'emploi pas à pas, notice), titre, thème,
  appareils et logiciels concernés, fiches produit liées, état, sous-titres et
  transcription pour une vidéo.
- **Question de FAQ** : question, réponse, thème, produits liés, nombre de consultations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

Chaque critère est marqué [Phase 1] s'il se vérifie avec les connecteurs de démonstration,
ou [Phase 3] s'il nécessite les vrais services. Sauf mention contraire, les scénarios
d'acceptation des parcours se vérifient en phase 1.

- **SC-001** [Phase 1] : Le numéro et les boutons « Appeler » et « Écrire sur WhatsApp » sont
  visibles sur la page Assistance, dans « Mon compte », dans le pied de page et sur chaque
  fiche produit.
- **SC-002** [Phase 1] : Sur mobile, « Appeler » lance l'appel et « Écrire sur WhatsApp »
  ouvre l'application avec le message pré-rempli (vers le lien de démonstration en
  phase 1).
- **SC-003** [Phase 1] : Modifier le numéro ou les horaires dans le back-office les met à
  jour partout, sans développeur, en moins de 5 minutes.
- **SC-004** [Phase 1] : La FAQ et les tutoriels sont consultables et recherchables.
- **SC-005** [Phase 1] : Pour un client connecté, 100 % des messages pré-remplis contiennent
  son nom et son cabinet, et rien d'autre.
- **SC-006** [Phase 1] : Depuis n'importe quelle page, un médecin trouve le moyen de joindre
  l'équipe en moins de 10 secondes.
- **SC-007** [Phase 1] : En phase 1, aucun bouton ne contacte un numéro réel.
- **SC-008** [Phase 3] : Avec le vrai numéro, les deux boutons ouvrent l'appel et la
  conversation WhatsApp d'ExploCardio.fr sur iPhone et sur Android.
- **SC-009** [Phase 1] : Un audit des écrans de F09 ne relève aucune non-conformité WCAG 2.2
  AA, et 100 % des vidéos ont des sous-titres.

## Assumptions

- **Remplacement** : cette spec remplace la précédente F09 (hotline téléphonique, formulaire
  de rappel, file de traitement, indicateurs), abandonnée le 2026-10-14 avec la réduction
  de périmètre.
- **WhatsApp et données personnelles** : en choisissant « Écrire sur WhatsApp », le médecin
  transmet lui-même son nom et son cabinet à WhatsApp. Cette information est à mentionner
  dans la politique de confidentialité, dont la formulation est à valider par le conseil
  juridique d'ExploCardio.fr.
- **Horaires par défaut** : du lundi au vendredi, de 9 h à 18 h, hors jours fériés, à
  confirmer et à saisir avant la mise en ligne.
- **Un seul numéro** : le même numéro sert aux appels et aux messages WhatsApp ; c'est aussi
  le téléphone affiché par le site (F01).
- **Assistance payante** : l'assistance à l'acte de F06 est proposée par l'équipe pendant la
  conversation ; le client l'achète depuis « Mon compte ».
- **Vote sur la FAQ** : non prévu dans cette version.
- **Périmètre** : site en français, professionnels de santé de France métropolitaine, aucune
  donnée de patient.
