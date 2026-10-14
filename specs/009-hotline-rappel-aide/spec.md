# Feature Specification: F09 — Hotline téléphonique, demandes de rappel et centre d'aide

**Feature Branch**: `009-hotline-rappel-aide`

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "F09 — Hotline téléphonique, demandes de rappel et centre d'aide : numéro unique partagé par l'équipe, horaires paramétrables, formulaire « Être rappelé dans les 30 minutes » avec motif et degré d'urgence obligatoires, file de traitement triée par urgence avec compte à rebours et attribution, contexte du client, centre d'aide en libre-service, indicateurs. Objectif : offrir une assistance humaine simple et très réactive. Pas d'assistant IA ni de chat pour le moment."

## Contexte et objectif

ExploCardio.fr promet une assistance humaine, simple et très réactive, sans forfait annuel de
hotline. F09 tient cette promesse par deux moyens : le médecin **appelle un numéro unique**,
ou **demande à être rappelé dans les 30 minutes**. Un centre d'aide en libre-service
complète le dispositif pour les questions simples.

F09 livre l'affichage de la hotline et de ses horaires, le formulaire de rappel, la file de
traitement de l'équipe, le suivi des demandes par le client, le centre d'aide et les
indicateurs.

**Hors périmètre de F09** : tout assistant IA et toute discussion écrite en direct (non
retenus pour le moment) ; la solution de téléphonie elle-même (standard partagé, sonnerie
chez les membres de l'équipe, message d'attente), qui n'est pas reliée au site : le site se
contente d'afficher le numéro ; l'envoi de SMS ; les
droits d'assistance et l'assistance à l'acte (F06) ; les demandes de SAV (F07) ; la mise à
disposition (F05) ; les rendez-vous (F08) ; l'envoi des emails transactionnels (F10) ; le
back-office complet (F13).

**Lien avec les autres modules** : la fiche d'une demande affiche les appareils (F07), les
commandes (F04), les locations (F05) et les droits d'assistance (F06) du client. Depuis une
demande, l'équipe peut ouvrir une demande de SAV (F07), proposer une mise à disposition
Express (F05) ou un rendez-vous (F08). Les fiches produit (F03) et les fiches d'appareil
(F07) affichent le numéro et les contenus d'aide. Le pied de page (F01) affiche le numéro,
les horaires et l'accès au formulaire.

**Phases (constitution v2.1.0)** : en phase 1, F09 fonctionne avec le connecteur emailing de démonstration (notifications
de l'équipe et emails aux médecins simulés) et le connecteur Odoo de démonstration (contexte
du client). Les demandes de rappel, les contenus d'aide et les réglages de la hotline sont
réels dès la phase 1. La téléphonie n'est pas connectée au site.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Appeler la hotline (Priority: P1)

Un médecin a besoin d'aide. Où qu'il soit sur le site, il trouve le numéro unique
d'ExploCardio.fr et ses horaires. Sur mobile, il appelle d'un geste. Un membre de l'équipe
décroche. Le site affiche le numéro ; l'appel lui-même se déroule hors du site.

**Why this priority**: l'appel direct est le moyen le plus rapide d'obtenir une aide
humaine, et le cœur de la promesse de réactivité.

**Independent Test**: vérifier la présence du numéro et des horaires aux emplacements
prévus, appeler depuis un mobile en un geste, et vérifier l'affichage pendant puis en dehors
des horaires.

**Acceptance Scenarios**:

1. **Given** la page « Assistance », le pied de page, « Mon compte » ou une fiche produit,
   **When** la page s'affiche, **Then** le numéro de la hotline y figure, avec ses
   horaires d'ouverture.
2. **Given** un mobile, **When** le médecin touche le numéro, **Then** l'appel est lancé.
3. **Given** une consultation en dehors des horaires, **When** le numéro s'affiche,
   **Then** le site indique que la hotline est fermée, donne le jour et l'heure de
   réouverture, et invite à remplir le formulaire de rappel.
4. **Given** un jour férié ou une fermeture exceptionnelle, **When** le médecin consulte
   le numéro, **Then** la fermeture et la date de réouverture sont indiquées.
5. **Given** un email transactionnel, **When** le client le reçoit, **Then** il y trouve le
   numéro de la hotline et ses horaires.

---

### User Story 2 - Demander à être rappelé (Priority: P1)

Le médecin préfère être rappelé. Il remplit le formulaire « Être rappelé dans les
30 minutes » : motif, degré d'urgence, appareil, description. Il reçoit un numéro de demande
et sait quand il sera rappelé.

**Why this priority**: le rappel évite l'attente au téléphone et donne à l'équipe ce qu'il
faut pour préparer l'appel. C'est l'engagement chiffré du module.

**Independent Test**: envoyer une demande complète pendant les horaires, puis une autre en
dehors ; tenter un envoi sans motif puis sans urgence ; vérifier dans chaque cas le message
affiché et l'email reçu.

**Acceptance Scenarios**:

1. **Given** la page « Assistance », « Mon compte », la fiche d'un appareil enregistré ou
   le pied de page, **When** le médecin choisit « Être rappelé », **Then** le formulaire
   s'ouvre.
2. **Given** un client connecté, **When** le formulaire s'affiche, **Then** son nom, son
   prénom, son cabinet, son téléphone et son email sont préremplis et modifiables, et la
   liste de ses appareils lui est proposée.
3. **Given** un médecin non connecté, **When** le formulaire s'affiche, **Then** il peut
   le remplir sans créer de compte, en saisissant l'appareil concerné en texte libre.
4. **Given** le formulaire ouvert depuis la fiche d'un appareil, **When** il s'affiche,
   **Then** cet appareil et son numéro de série sont déjà sélectionnés.
5. **Given** le choix du degré d'urgence, **When** il s'affiche, **Then** les quatre
   niveaux (faible, modéré, important, critique) sont proposés, chacun avec une phrase
   d'aide.
6. **Given** un formulaire sans motif ou sans degré d'urgence, **When** le médecin
   l'envoie, **Then** l'envoi est refusé, un message clair désigne le champ manquant et la
   saisie est conservée.
7. **Given** une demande envoyée pendant les horaires, **When** elle est enregistrée,
   **Then** le médecin voit un numéro de demande et le délai « sous 30 minutes », et
   reçoit un email récapitulatif.
8. **Given** une demande envoyée en dehors des horaires, **When** elle est enregistrée,
   **Then** le médecin voit un numéro de demande et la mention « dès la réouverture », avec
   le jour et l'heure exacts, et reçoit un email récapitulatif.
9. **Given** une urgence « critique » choisie pendant les horaires, **When** la demande
   est envoyée, **Then** le numéro de la hotline est aussi affiché en grand, pour appeler
   directement.
10. **Given** le formulaire, **When** il s'affiche, **Then** la mention « Ne transmettez
    aucune donnée patient » est visible près de la description et de la pièce jointe.

---

### User Story 3 - Prendre en charge une demande sans doublon (Priority: P1)

Une demande arrive. Toute l'équipe est prévenue. Dans la file, triée par urgence, un membre
clique sur « Je prends » : la demande lui est attribuée, les autres le voient, et il rappelle
le médecin avant la fin du compte à rebours.

**Why this priority**: l'engagement de rappel en 30 minutes ne tient que si l'équipe est
prévenue aussitôt, voit les urgences d'abord et ne s'emmêle pas.

**Independent Test**: envoyer trois demandes d'urgences différentes, vérifier les
notifications et l'ordre de la file, prendre une demande avec un compte et tenter de la
prendre avec un autre, puis laisser une demande sans prise en charge pendant 20 minutes.

**Acceptance Scenarios**:

1. **Given** une demande envoyée pendant les horaires, **When** elle est enregistrée,
   **Then** tous les membres de l'équipe sont prévenus par email en moins d'une minute, et
   la demande apparaît dans la file.
2. **Given** plusieurs demandes en attente, **When** l'équipe ouvre la file, **Then**
   elles sont triées par urgence décroissante ; à urgence égale, les clients ayant des
   droits d'assistance actifs passent en premier ; puis vient l'heure d'arrivée.
3. **Given** une demande « critique » plus récente que des demandes de niveau inférieur,
   **When** la file s'affiche, **Then** elle apparaît en tête.
4. **Given** une demande en attente, **When** elle s'affiche dans la file, **Then** un
   compte à rebours de 30 minutes indique le temps restant pour rappeler.
5. **Given** une demande nouvelle, **When** un membre clique sur « Je prends », **Then**
   elle lui est attribuée, passe à « prise en charge », et tous les autres membres le
   voient aussitôt.
6. **Given** une demande déjà prise en charge, **When** un autre membre tente de la
   prendre, **Then** l'action est refusée ; seule une réattribution explicite permet de la
   lui confier.
7. **Given** deux membres qui cliquent sur « Je prends » au même instant, **When** les
   clics sont traités, **Then** un seul obtient la demande, et l'autre en est informé.
8. **Given** une demande non prise en charge 20 minutes après son arrivée pendant les
   horaires, **When** ce délai est atteint, **Then** toute l'équipe reçoit une alerte par
   email, et la demande est mise en évidence dans la file.
9. **Given** une demande, **When** un membre fait évoluer son statut (prise en charge,
   rappelé, résolue, à relancer), **Then** il peut ajouter une note interne, invisible du
   client.
10. **Given** deux demandes de même urgence, l'une d'un client aux droits d'assistance
    actifs et l'autre, plus ancienne, d'un client sans droits, **When** la file s'affiche,
    **Then** la première précède la seconde.

---

### User Story 4 - Connaître le client avant de rappeler (Priority: P2)

Avant de rappeler, le membre de l'équipe ouvre la fiche de la demande : il y voit qui est le
client, ses appareils, ses commandes, ses locations et l'état de ses droits d'assistance.
Pendant ou après l'appel, il déclenche la suite utile.

**Why this priority**: le contexte évite de faire répéter le médecin et raccourcit l'appel,
mais l'équipe peut rappeler sans lui.

**Independent Test**: ouvrir la demande d'un client ayant un appareil, une commande récente
et une location, vérifier les informations affichées, puis créer depuis la demande une
demande de SAV, une proposition de mise à disposition et un rendez-vous.

**Acceptance Scenarios**:

1. **Given** la demande d'un client connu, **When** un membre l'ouvre, **Then** il voit
   ses appareils enregistrés, ses commandes récentes, ses locations en cours et le statut
   de ses droits d'assistance.
2. **Given** la demande d'un médecin non client, **When** un membre l'ouvre, **Then** il
   voit les coordonnées saisies et l'indication qu'aucun compte ne correspond.
3. **Given** une demande, **When** le membre le juge utile, **Then** il peut en créer une
   demande de SAV (F07), proposer une mise à disposition Express de remplacement (F05) ou
   proposer un rendez-vous (F08), la demande restant liée à ce qu'il a créé.
4. **Given** un client sans droits d'assistance actifs, **When** sa demande est
   enregistrée, **Then** elle est traitée comme les autres ; la fiche signale l'absence de
   droits, et le membre peut proposer l'assistance à l'acte de F06.
5. **Given** une pièce jointe contenant une donnée de patient, **When** un membre la
   constate, **Then** il peut la supprimer, et la suppression est tracée.

---

### User Story 5 - Suivre ses demandes (Priority: P2)

Le client retrouve ses demandes de rappel dans « Mon compte », avec leur statut.

**Why this priority**: le suivi rassure, mais l'essentiel se joue au téléphone.

**Independent Test**: envoyer une demande avec un compte connecté, la faire évoluer côté
équipe et vérifier son statut dans « Mon compte ».

**Acceptance Scenarios**:

1. **Given** un client connecté, **When** il ouvre ses demandes d'assistance, **Then** il
   voit pour chacune le numéro, la date, le motif, l'urgence, l'appareil et le statut.
2. **Given** une demande dont le statut change, **When** le client consulte « Mon
   compte », **Then** le nouveau statut est affiché ; les notes internes ne le sont jamais.
3. **Given** une demande « à relancer » parce que le client n'a pas répondu, **When** il
   la consulte, **Then** il voit que l'équipe a tenté de le joindre et comment la
   recontacter.

---

### User Story 6 - Trouver la réponse seul (Priority: P2)

Pour une question simple, le médecin ouvre le centre d'aide : tutoriels vidéo, modes d'emploi
pas à pas, notices et FAQ. S'il ne trouve pas, chaque page lui rappelle comment joindre
l'équipe.

**Why this priority**: le libre-service allège la hotline, mais l'assistance humaine reste
la promesse première du module.

**Independent Test**: retrouver un tutoriel par appareil puis par recherche, consulter une
question de la FAQ, et vérifier la présence du rappel « Besoin d'aide ? » en bas de page.

**Acceptance Scenarios**:

1. **Given** le centre d'aide, **When** il s'affiche, **Then** tutoriels vidéo, modes
   d'emploi pas à pas et notices PDF sont classés par appareil, par logiciel et par thème.
2. **Given** un tutoriel vidéo, **When** le visiteur l'ouvre, **Then** il dispose de
   sous-titres et d'une transcription.
3. **Given** la FAQ, **When** elle s'affiche, **Then** les questions les plus consultées
   apparaissent en tête, et une recherche permet d'en trouver d'autres.
4. **Given** une fiche produit ou la fiche d'un appareil enregistré, **When** elle
   s'affiche, **Then** elle propose les contenus d'aide de ce modèle.
5. **Given** n'importe quelle page d'aide, **When** le visiteur arrive en bas, **Then**
   il lit « Besoin d'aide ? Appelez le [numéro] ou demandez à être rappelé », avec le
   numéro cliquable et le lien vers le formulaire.
6. **Given** une recherche sans résultat, **When** elle s'affiche, **Then** le visiteur
   est invité à appeler ou à demander un rappel.

---

### User Story 7 - Régler la hotline et les contenus (Priority: P2)

L'administrateur modifie le numéro affiché, les horaires et les fermetures, et publie les
contenus du centre d'aide, sans développeur.

**Why this priority**: horaires et contenus changent souvent ; une information fausse sur
la disponibilité de la hotline ruinerait la promesse.

**Independent Test**: ajouter une fermeture exceptionnelle et vérifier son effet sur
l'affichage et sur le délai annoncé par le formulaire ; publier un tutoriel relié à un
produit et vérifier son affichage.

**Acceptance Scenarios**:

1. **Given** un administrateur, **When** il modifie le numéro, **Then** le nouveau numéro
   apparaît à tous les emplacements du site et dans les emails suivants.
2. **Given** un administrateur, **When** il modifie les jours, les heures, les jours
   fériés ou une fermeture exceptionnelle, **Then** l'affichage, le délai annoncé par le
   formulaire et les comptes à rebours en tiennent compte.
3. **Given** un administrateur, **When** il crée un contenu d'aide, **Then** il lui
   attribue un type, des appareils ou logiciels, un thème, et le relie aux fiches produit.
4. **Given** un contenu en préparation, **When** il n'est pas publié, **Then** il est
   invisible du public.
5. **Given** un administrateur, **When** il modifie les motifs proposés ou les phrases
   d'aide des niveaux d'urgence, **Then** le formulaire est mis à jour.

---

### User Story 8 - Mesurer la réactivité (Priority: P3)

L'administrateur consulte les indicateurs : volume des demandes par motif et par urgence,
délai moyen de rappel, part des demandes rappelées en moins de 30 minutes.

**Why this priority**: les indicateurs servent à tenir l'engagement dans la durée, pas à
traiter les demandes du jour.

**Independent Test**: après une série de demandes traitées avec des délais connus, vérifier
les valeurs affichées sur une période donnée.

**Acceptance Scenarios**:

1. **Given** une période choisie, **When** l'administrateur consulte les indicateurs,
   **Then** il voit le nombre de demandes par motif et par urgence, le délai moyen de
   rappel et la part des demandes rappelées en moins de 30 minutes.
2. **Given** une demande reçue en dehors des horaires, **When** son délai est calculé,
   **Then** il est compté à partir de la réouverture.

---

### Edge Cases

- Demande envoyée quelques minutes avant la fermeture : le rappel est dû avant la
  fermeture si le délai le permet ; sinon, le client est informé qu'il sera rappelé à la
  réouverture.
- Plusieurs demandes reçues pendant la fermeture : à la réouverture, leur compte à rebours
  démarre en même temps ; elles restent triées par urgence, puis par heure d'arrivée.
- Urgence « critique » en dehors des horaires : la demande est enregistrée, le client est
  clairement informé qu'il ne sera rappelé qu'à la réouverture, et aucun numéro n'est
  présenté comme joignable.
- Client injoignable au moment du rappel : la demande passe à « à relancer », et le client
  est prévenu par email de la tentative.
- Même médecin qui envoie plusieurs demandes à la suite : l'équipe voit qu'elles viennent
  de la même personne.
- Membre qui a pris une demande puis devient indisponible : la demande peut être
  réattribuée, et l'historique garde la trace des deux attributions.
- Envois répétés ou automatisés du formulaire : ils sont limités sans gêner un médecin
  légitime.
- Numéro de téléphone de rappel manifestement invalide : le formulaire le signale avant
  l'envoi.
- Email de notification non reçu par un membre : les autres le reçoivent tout de même, et la
  demande reste visible dans la file, qui fait foi.
- Demande d'un médecin sans compte : elle est classée, à urgence égale, après celles des
  clients ayant des droits actifs.
- Droits d'assistance qui expirent ou s'ouvrent après l'arrivée de la demande : le
  classement garde l'état constaté à l'arrivée.
- Numéro de la hotline non encore renseigné : aucun numéro vide n'est affiché ; seul le
  formulaire de rappel est proposé.
- Fichier joint trop lourd ou d'un format non accepté : le formulaire l'explique et
  conserve le reste de la saisie.
- Compte supprimé (RGPD) : les demandes sont détachées de la personne et leurs pièces
  jointes supprimées.
- Navigation au clavier ou avec un lecteur d'écran : le formulaire et le choix de l'urgence
  restent utilisables, et les erreurs sont annoncées.

## Requirements *(mandatory)*

### Functional Requirements

**Hotline téléphonique**

- **FR-001** : Le site DOIT afficher un numéro de téléphone unique pour l'assistance. Ce
  numéro est une simple information affichée : le site N'EST relié à aucune solution de
  téléphonie.
- **FR-002** : Le numéro DOIT être affiché sur la page « Assistance », dans le pied de page,
  dans « Mon compte », sur les fiches produit et dans les emails transactionnels.
- **FR-003** : Le numéro DOIT être cliquable sur mobile pour lancer l'appel.
- **FR-004** : Les horaires d'ouverture DOIVENT être affichés à côté du numéro.
- **FR-005** : En dehors des horaires, le site DOIT indiquer que la hotline est fermée,
  donner le jour et l'heure de réouverture, et inviter à remplir le formulaire de rappel.
- **FR-006** : Le numéro affiché, les jours et heures d'ouverture, les jours fériés et les
  fermetures exceptionnelles DOIVENT être modifiables sans développeur.

**Formulaire de rappel**

- **FR-007** : Un formulaire « Être rappelé dans les 30 minutes » DOIT être accessible depuis
  la page « Assistance », « Mon compte », chaque appareil de l'espace garanties (F07) et le
  pied de page.
- **FR-008** : Le formulaire DOIT être utilisable par un client connecté comme par un
  médecin sans compte.
- **FR-009** : Le formulaire DOIT recueillir : nom, prénom, cabinet, téléphone de rappel et
  email, préremplis pour un client connecté.
- **FR-010** : Le motif DOIT être choisi obligatoirement dans la liste : panne ou
  dysfonctionnement d'un appareil ; logiciel ou accès à la plateforme Cloud ; aide à
  l'utilisation ou à la pose d'un appareil ; commande, livraison ou retour ; location /
  mise à disposition ; garantie et réparation (SAV) ; facturation et paiement ; demande de
  renseignement ou de devis ; autre.
- **FR-011** : Le degré d'urgence DOIT être choisi obligatoirement parmi quatre niveaux,
  chacun accompagné de sa phrase d'aide :
  - faible : question sans impact sur l'activité, peut attendre ;
  - modéré : gêne l'activité mais une solution de contournement existe ;
  - important : un appareil ou un logiciel ne fonctionne plus, des examens sont reportés ;
  - critique : examens impossibles aujourd'hui ou patient en cours d'enregistrement.
- **FR-012** : Le formulaire DOIT recueillir l'appareil concerné (choisi dans la liste des
  appareils du client connecté, saisi librement sinon), son numéro de série (facultatif),
  une description courte, et une photo ou capture d'écran (facultative).
- **FR-013** : Le formulaire DOIT afficher la mention « Ne transmettez aucune donnée
  patient ».
- **FR-014** : Un formulaire envoyé sans motif ou sans degré d'urgence DOIT être refusé,
  avec un message clair désignant le champ manquant, sans perte de la saisie.
- **FR-015** : Après l'envoi, le médecin DOIT voir un message de confirmation comportant un
  numéro de demande et le délai de rappel, et recevoir un email récapitulatif.
- **FR-016** : Le délai annoncé DOIT être « sous 30 minutes » pendant les horaires, et « dès
  la réouverture, le [jour] à [heure] » en dehors, avec le jour et l'heure exacts.
- **FR-017** : Pour une urgence « critique » envoyée pendant les horaires, le numéro de la
  hotline DOIT aussi être affiché en grand, pour un appel direct.
- **FR-018** : Le formulaire DOIT être protégé contre les envois automatisés.

**Traitement par l'équipe**

- **FR-019** : Toute demande envoyée pendant les horaires DOIT prévenir tous les membres de
  l'équipe par email, via le connecteur emailing, en moins d'une minute (principe III). Ce
  connecteur permet aussi l'envoi de SMS, non activé en première version.
- **FR-020** : Les demandes DOIVENT apparaître dans une file triée selon trois critères
  successifs : l'urgence décroissante ; à urgence égale, les clients ayant des droits
  d'assistance actifs (F06) avant les autres ; puis l'heure d'arrivée. Une demande
  « critique » DOIT précéder toute demande de niveau inférieur, même plus ancienne.
- **FR-047** : Les droits d'assistance pris en compte pour le classement DOIVENT être ceux
  constatés à l'arrivée de la demande. Un médecin sans compte est classé comme sans droits.
- **FR-021** : Chaque demande en attente DOIT afficher un compte à rebours de 30 minutes,
  qui démarre à l'arrivée de la demande pendant les horaires, ou à la réouverture pour une
  demande reçue en dehors.
- **FR-022** : Un membre DOIT pouvoir s'attribuer une demande par l'action « Je prends ».
  L'attribution DOIT être visible aussitôt de tous les autres membres.
- **FR-023** : Une demande prise en charge NE DOIT PAS pouvoir être prise par un autre
  membre sans une réattribution explicite. Deux membres NE DOIVENT JAMAIS se voir attribuer
  la même demande.
- **FR-024** : Une demande DOIT porter l'un des statuts : nouvelle, prise en charge,
  rappelé, résolue, à relancer. Une note interne libre DOIT pouvoir être ajoutée à chaque
  étape.
- **FR-025** : Une demande non prise en charge après un délai d'alerte (20 minutes par
  défaut, réglable dans le back-office, principe VI) pendant les horaires DOIT déclencher
  une alerte par email à toute l'équipe et être mise en évidence dans la file.
- **FR-026** : La fiche d'une demande DOIT afficher le contexte du client : appareils,
  commandes récentes, locations en cours et statut de ses droits d'assistance (F06).
- **FR-027** : Depuis une demande, un membre DOIT pouvoir créer une demande de SAV (F07),
  proposer une mise à disposition Express de remplacement (F05) ou proposer un rendez-vous
  (F08), la demande restant liée à ce qui a été créé.
- **FR-028** : Un membre DOIT pouvoir supprimer une pièce jointe contenant une donnée de
  patient.

**Suivi par le client**

- **FR-029** : Le client connecté DOIT voir dans « Mon compte » ses demandes et leur statut.
  Les notes internes NE DOIVENT JAMAIS lui être montrées.
- **FR-030** : Un médecin sans compte DOIT être informé par email de l'enregistrement de sa
  demande et, le cas échéant, d'une tentative de rappel restée sans réponse.

**Droits d'assistance**

- **FR-031** : Le numéro et le formulaire DOIVENT être visibles et utilisables par tous,
  avec ou sans droits d'assistance.
- **FR-032** : La demande d'un client sans droits d'assistance actifs DOIT être enregistrée
  et traitée comme les autres. La fiche DOIT signaler l'absence de droits, et le membre
  DOIT pouvoir proposer l'assistance à l'acte définie par F06, dont le prix est fixé dans
  Odoo.

**Centre d'aide**

- **FR-033** : Le site DOIT proposer un centre d'aide réunissant tutoriels vidéo, modes
  d'emploi pas à pas et notices PDF, classés par appareil, par logiciel et par thème.
- **FR-034** : Le site DOIT proposer une FAQ avec une recherche, les questions les plus
  consultées apparaissant en tête.
- **FR-035** : Les contenus d'aide DOIVENT être gérés par l'administrateur, avec un état en
  préparation ou publié, et reliés aux fiches produit (F03) et aux appareils de l'espace
  garanties (F07).
- **FR-036** : Chaque page d'aide DOIT se terminer par « Besoin d'aide ? Appelez le [numéro]
  ou demandez à être rappelé », avec le numéro cliquable et le lien vers le formulaire.
- **FR-037** : Chaque tutoriel vidéo DOIT comporter des sous-titres et une transcription.
- **FR-038** : Aucun contenu d'aide NE DOIT comporter de donnée de patient réelle.

**Indicateurs**

- **FR-039** : L'administrateur DOIT pouvoir consulter, sur une période choisie : le nombre
  de demandes par motif et par urgence, le délai moyen de rappel, et la part des demandes
  rappelées en moins de 30 minutes.
- **FR-040** : Les délais DOIVENT être mesurés en temps d'ouverture : pour une demande reçue
  en dehors des horaires, à partir de la réouverture.

**Données, administration et traçabilité**

- **FR-041** : Les demandes de rappel DOIVENT être enregistrées par le site, avec leur
  historique d'attribution et de statut.
- **FR-042** : F09 DOIT livrer dans le back-office les écrans nécessaires à l'équipe : file
  de traitement, fiche de demande, réglage du numéro, des horaires et du délai d'alerte,
  gestion des contenus d'aide, indicateurs. Le contexte du client (appareils, commandes,
  locations, droits) y est lu dans Odoo par son connecteur, en lecture seule. Le
  back-office complet (F13) étendra ces écrans.
- **FR-043** : Toute prise en charge, réattribution, évolution de statut et suppression de
  pièce jointe DOIT être journalisée avec son auteur et sa date.
- **FR-044** : Les pièces jointes NE DOIVENT être accessibles qu'à l'équipe et au client
  concerné.

**Charte, accessibilité et langue**

- **FR-045** : Tous les écrans et emails de F09 DOIVENT respecter la charte, le niveau WCAG
  2.2 AA, le vouvoiement et le ton sobre du site. L'urgence DOIT être exprimée par un
  texte, jamais par la seule couleur.
- **FR-046** : Aucun champ de F09 NE DOIT inviter à saisir une donnée de patient.

### Key Entities

- **Réglages de la hotline** : numéro affiché, jours et heures d'ouverture, jours fériés,
  fermetures exceptionnelles.
- **Demande de rappel** : numéro de demande, coordonnées, compte client éventuel, motif,
  degré d'urgence, appareil et numéro de série, description, pièce jointe, date d'arrivée,
  échéance de rappel, statut, membre attributaire, droits d'assistance constatés à
  l'arrivée.
- **Note interne** : demande concernée, auteur, texte, date.
- **Attribution** : demande, membre, date, réattributions successives.
- **Lien de suite** : demande de SAV, proposition de mise à disposition ou rendez-vous créés
  depuis une demande.
- **Motif** et **niveau d'urgence** : libellé, ordre, phrase d'aide.
- **Contenu d'aide** : type (tutoriel vidéo, mode d'emploi pas à pas, notice), titre, thème,
  appareils et logiciels concernés, fiches produit liées, état, sous-titres et
  transcription pour une vidéo.
- **Question de FAQ** : question, réponse, thème, produits liés, nombre de consultations.
- **Indicateurs d'assistance** : volumes par motif et par urgence, délais de rappel.

## Success Criteria *(mandatory)*

### Measurable Outcomes

Chaque critère est marqué [Phase 1] s'il se vérifie avec les connecteurs de démonstration,
ou [Phase 3] s'il nécessite les vrais services. Sauf mention contraire, les scénarios
d'acceptation des parcours se vérifient en phase 1.

- **SC-001** [Phase 1] : Un formulaire envoyé sans motif ou sans degré d'urgence est refusé avec un
  message clair dans 100 % des cas.
- **SC-002** [Phase 3] : Une demande envoyée pendant les horaires prévient toute l'équipe en moins
  d'une minute.
- **SC-003** [Phase 1] : Une demande « critique » apparaît en tête de file, devant toute demande plus
  ancienne de niveau inférieur, dans 100 % des cas testés ; à urgence égale, un client aux
  droits d'assistance actifs précède toujours un client sans droits.
- **SC-004** [Phase 1] : Une demande prise en charge par un membre ne peut jamais être prise par un
  autre sans réattribution (0 cas, y compris en cas de clics simultanés).
- **SC-005** [Phase 1] : Une demande envoyée en dehors des horaires indique au client le jour et
  l'heure exacts de réouverture dans 100 % des cas, y compris la veille d'un jour férié ou
  d'une fermeture exceptionnelle.
- **SC-006** [Phase 1] : Toute demande non prise en charge après 20 minutes pendant les horaires
  déclenche une alerte.
- **SC-007** [Phase 3] : Au moins 90 % des demandes reçues pendant les horaires sont rappelées en
  moins de 30 minutes.
- **SC-008** [Phase 1] : Un médecin envoie une demande de rappel en moins de 2 minutes.
- **SC-009** [Phase 1] : Depuis n'importe quelle page du site, le numéro de la hotline est trouvé en
  moins de 10 secondes.
- **SC-010** [Phase 1] : Un changement d'horaires ou de numéro fait par l'administrateur est visible
  partout sur le site en moins de 5 minutes.
- **SC-011** [Phase 1] : Les indicateurs affichés correspondent aux demandes réelles de la période, à
  l'unité et à la minute près.
- **SC-012** [Phase 1] : Un audit des écrans de F09 ne relève aucune non-conformité WCAG 2.2 AA, et
  100 % des vidéos ont des sous-titres.

## Assumptions

Les points marqués « confirmé » ou « décidé » n'étaient pas tranchés dans la demande
initiale ; ils ont été validés par la responsable du projet le 2026-10-13.

- **Assistance payante (confirmé)** : la question posée dans la demande a été tranchée
  dans F06 : en première version, une seule formule, à l'acte, à prix réglable, payée en
  ligne par carte. Le membre de l'équipe l'indique au téléphone ; le client l'achète depuis
  « Mon compte ». Son prix reste une donnée à saisir dans Odoo avant la mise en ligne.
- **Motifs concernés par l'assistance payante (confirmé)** : seule l'aide à
  l'utilisation relève des droits d'assistance. Les pannes, le SAV, les commandes, la
  facturation et les renseignements sont traités pour tous (aligné sur F07). L'appréciation
  est laissée au membre de l'équipe ; le site ne bloque rien.
- **Ordre de la file (décidé)** : l'urgence, puis, à urgence égale, la priorité aux clients
  ayant des droits d'assistance actifs, puis l'heure d'arrivée.
- **Engagement de 30 minutes (confirmé)** : il vaut pour toutes les demandes, quel que
  soit leur degré d'urgence. L'urgence détermine l'ordre de traitement, pas le délai promis.
- **Pas d'astreinte (décidé)** : aucune astreinte en dehors des horaires. Une demande
  critique reçue hors horaires est rappelée à la réouverture, et le client en est clairement
  informé.
- **Client injoignable (confirmé)** : la demande passe à « à relancer » ; le client est
  prévenu par email. Le nombre de tentatives est laissé à l'appréciation de l'équipe.
- **Réattribution (confirmé)** : tout membre de l'équipe peut réattribuer une demande, à
  lui-même ou à un collègue ; l'action est tracée et l'ancien attributaire prévenu.
- **Numéro de la hotline et coordonnées du site (confirmé)** : le numéro de la hotline
  est le numéro de téléphone du site prévu par F01 ; il est géré à un seul endroit.
- **Numéro « vitrine » (décidé)** : la solution de téléphonie n'est pas reliée au site, qui
  affiche seulement le numéro. Le partage des appels entre les membres de l'équipe, le
  message d'attente et les statistiques d'appels se règlent dans cette solution, hors du
  site. Les appels directs ne créent pas de demande sur le site ; les indicateurs de F09
  portent sur les demandes de rappel.
- **Horaires par défaut (confirmé)** : du lundi au vendredi, de 9 h à 18 h, hors jours
  fériés, à confirmer et à saisir avant la mise en ligne.
- **Constitution** : conforme à la v2.1.0. La téléphonie n'est pas un service connecté : le
  numéro de la hotline est un paramètre du back-office, et l'outil de téléphonie se règle
  à part. Les notifications d'équipe passent par le connecteur emailing.
- **Notifications à l'équipe** : par email en V1 ; les SMS, prévus par le connecteur
  emailing, pourront être activés plus tard. Le délai d'une minute suppose que
  chaque membre consulte sa messagerie ou garde la file ouverte ; la file fait foi.
- **Pièces jointes** : JPEG, PNG ou PDF, 10 Mo au plus, une par demande.
- **Membres de l'équipe** : ils disposent chacun d'un accès au back-office ; leur gestion
  complète relève de F13.
- **Demande de rappel et demande de SAV** : ce sont deux objets distincts. Une demande de
  rappel peut donner lieu à une demande de SAV (F07), qui suit alors son propre circuit.
- **Vote sur la FAQ** : non prévu dans cette version.
- **Emails** : les emails de F09 sont envoyés à la charte du site, par le connecteur
  emailing (F10) ; ils sont simulés en phase 1.
- **Assistant IA et discussion écrite** : non retenus pour le moment ; ils pourront faire
  l'objet d'un module ultérieur.
- **Périmètre** : site en français, professionnels de santé de France métropolitaine, aucune
  donnée de patient.
