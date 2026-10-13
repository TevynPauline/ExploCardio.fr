# Feature Specification: F08 — Prise de rendez-vous en ligne

**Feature Branch**: `008-prise-rendez-vous`

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "F08 — Prise de rendez-vous en ligne : intégration d'un outil d'agenda existant affiché dans le site, types de rendez-vous (installation sur site, paramétrage Cloud à distance, formation à distance ou sur site, point SAV), points d'entrée multiples, coordonnées préremplies, confirmation, rappel la veille, lien de visio, modification et annulation en ligne, affichage dans Mon compte et pour l'équipe. Objectif : que le médecin réserve lui-même ses créneaux, sans échange d'emails."

## Contexte et objectif

Installer un équipement, paramétrer un accès au logiciel Cloud ou former un médecin suppose
de trouver une date. F08 supprime les échanges d'emails : le médecin choisit lui-même un
créneau libre, directement sur le site.

F08 livre la réservation, la modification et l'annulation des rendez-vous, leurs
confirmations et rappels, leur affichage dans « Mon compte » et leur suivi par l'équipe.
Les disponibilités sont tenues dans un outil d'agenda existant, affiché dans le site sans
renvoyer le médecin vers un autre site.

**Hors périmètre de F08** : le choix de l'outil d'agenda (fait lors de la planification) ; le
contenu des formations et des installations ; la vente des prestations d'installation et de
formation (F03, F04) ; la mise à disposition (F05) ; les demandes de SAV (F07) ; l'ouverture
des accès au logiciel Cloud (F12) ; le back-office complet (F13).

**Lien avec les autres modules** : F04 et F05 déclenchent la proposition d'un rendez-vous
après une commande ou une mise à disposition. F02 fournit les coordonnées du client et
accueille les rendez-vous dans « Mon compte ». F07 rattache un point SAV à une demande et à
un appareil. F03 propose la réservation depuis les fiches produit et les pages services.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Réserver un créneau sans rien ressaisir (Priority: P1)

Un client connecté ouvre la prise de rendez-vous depuis « Mon compte ». Il choisit le type
de rendez-vous, voit les créneaux libres, en choisit un et confirme. Ses coordonnées sont
déjà là.

**Why this priority**: c'est l'objectif du module : une réservation en quelques gestes, sans
email ni ressaisie.

**Independent Test**: avec un compte connecté, réserver une formation à distance et vérifier
que les coordonnées sont préremplies, que le rendez-vous est confirmé et que le créneau a
disparu des disponibilités.

**Acceptance Scenarios**:

1. **Given** un client connecté, **When** il ouvre la prise de rendez-vous, **Then** il
   voit uniquement les prestations comprises dans son offre, chacune avec sa durée, son
   mode (à distance ou sur site) et le nombre de séances restantes.
2. **Given** un type choisi, **When** les disponibilités s'affichent, **Then** seuls les
   créneaux réellement libres sont proposés, dans le site, sans redirection vers un autre
   site.
3. **Given** un créneau choisi, **When** le client arrive à la confirmation, **Then** son
   nom, son cabinet, son email et son téléphone sont préremplis et il n'a pas à les
   ressaisir.
4. **Given** un rendez-vous confirmé, **When** un autre client consulte les
   disponibilités, **Then** ce créneau n'y figure plus.
5. **Given** deux clients qui choisissent le même créneau au même instant, **When** ils
   confirment, **Then** un seul l'obtient ; l'autre est invité à en choisir un autre.
6. **Given** une commande ou un appareil concerné, **When** le client réserve, **Then** le
   rendez-vous y est rattaché et l'équipe le voit.
7. **Given** un client qui a besoin d'une prestation non comprise dans son offre,
   **When** il ouvre la prise de rendez-vous, **Then** il est invité à contacter le
   service client par téléphone ou par email.
8. **Given** une zone de commentaire libre, **When** elle s'affiche, **Then** elle
   rappelle de n'y saisir aucune donnée de patient.

---

### User Story 2 - Se voir proposer le bon rendez-vous au bon moment (Priority: P1)

Après une commande ou une mise à disposition, le client se voit proposer automatiquement le
rendez-vous utile : formation, installation ou paramétrage.

**Why this priority**: c'est un critère d'acceptation, et le moment où le médecin est le
plus disposé à réserver.

**Independent Test**: commander une mise à disposition et vérifier la proposition d'un
créneau de formation à l'écran et par email, avec la location déjà rattachée.

**Acceptance Scenarios**:

1. **Given** une mise à disposition commandée, **When** la commande est confirmée,
   **Then** le client se voit proposer de réserver un créneau de formation, à l'écran et
   dans l'email de confirmation.
2. **Given** une commande comprenant une installation sur site, **When** elle est
   confirmée, **Then** le client se voit proposer de réserver son installation.
3. **Given** un accès au logiciel Cloud ouvert, **When** il est créé, **Then** le client
   se voit proposer un rendez-vous de paramétrage à distance.
4. **Given** une proposition, **When** le client la suit, **Then** le type de rendez-vous
   et la commande ou la location sont déjà choisis.
5. **Given** une proposition restée sans suite, **When** le délai fixé par
   l'administrateur est écoulé, **Then** le client reçoit une relance, une seule fois.
6. **Given** une proposition, **When** le client ne veut pas de rendez-vous, **Then** il
   peut l'ignorer sans conséquence sur sa commande.

---

### User Story 3 - Recevoir confirmation, rappel et lien de visio (Priority: P1)

Le rendez-vous réservé, le client reçoit une confirmation, puis un rappel la veille. Pour un
rendez-vous à distance, il dispose d'un lien de visioconférence.

**Why this priority**: sans confirmation ni rappel, les rendez-vous manqués annulent le
bénéfice de la réservation en ligne.

**Independent Test**: réserver un rendez-vous à distance pour le surlendemain et vérifier
l'email de confirmation, le lien de visio et l'email de rappel la veille.

**Acceptance Scenarios**:

1. **Given** un rendez-vous confirmé, **When** la réservation aboutit, **Then** le client
   reçoit un email indiquant le type, la date, l'heure, la durée, le mode et la façon de
   modifier ou d'annuler.
2. **Given** un rendez-vous à distance, **When** il est confirmé, **Then** l'email et
   « Mon compte » comportent un lien de visioconférence.
3. **Given** un rendez-vous sur site, **When** il est confirmé, **Then** l'email et « Mon
   compte » rappellent l'adresse d'intervention.
4. **Given** un rendez-vous à venir, **When** la veille arrive, **Then** le client reçoit
   un rappel.
5. **Given** une confirmation, **When** le client le souhaite, **Then** il peut ajouter le
   rendez-vous à son propre agenda.

---

### User Story 4 - Modifier ou annuler en ligne (Priority: P1)

Un imprévu survient. Le client déplace ou annule son rendez-vous lui-même, depuis « Mon
compte » ou depuis l'email de confirmation.

**Why this priority**: la modification en ligne fait partie de la promesse « sans échange
d'emails » et libère les créneaux pour d'autres.

**Independent Test**: déplacer un rendez-vous puis l'annuler, et vérifier à chaque fois la
libération de l'ancien créneau et les notifications.

**Acceptance Scenarios**:

1. **Given** un rendez-vous à venir, **When** le client le déplace vers un autre créneau
   libre, **Then** l'ancien créneau redevient disponible, le nouveau ne l'est plus, et le
   client comme l'équipe en sont prévenus.
2. **Given** un rendez-vous à venir, **When** le client l'annule, **Then** le créneau
   redevient disponible et le client comme l'équipe en sont prévenus.
3. **Given** un rendez-vous trop proche, au-delà du délai fixé par l'administrateur,
   **When** le client veut le modifier ou l'annuler, **Then** il est invité à contacter
   l'équipe.
4. **Given** un rendez-vous annulé, **When** le client consulte « Mon compte », **Then**
   il le voit comme annulé et peut en réserver un nouveau.

---

### User Story 5 - Retrouver ses rendez-vous (Priority: P2)

Dans « Mon compte », le client voit ses rendez-vous à venir et passés.

**Why this priority**: utile au suivi, mais la confirmation par email suffit pour honorer un
rendez-vous.

**Independent Test**: après plusieurs réservations, une modification et une annulation,
vérifier la liste affichée.

**Acceptance Scenarios**:

1. **Given** un client connecté, **When** il ouvre la rubrique « Rendez-vous », **Then**
   il voit ses rendez-vous à venir avec le type, la date, l'heure, le mode, le lien de
   visio ou l'adresse, et la commande ou l'appareil concerné.
2. **Given** des rendez-vous passés ou annulés, **When** il consulte l'historique,
   **Then** il les retrouve avec leur état.
3. **Given** aucun rendez-vous, **When** il ouvre la rubrique, **Then** il lui est proposé
   d'en réserver un.

---

### User Story 6 - Réserver depuis une fiche produit ou une page service (Priority: P2)

En consultant un produit ou un service, le médecin trouve un accès à la prise de
rendez-vous correspondante.

**Why this priority**: ces points d'entrée élargissent l'usage, mais les réservations
essentielles passent par « Mon compte » et par les propositions automatiques.

**Independent Test**: depuis une page service et depuis une fiche produit, ouvrir la prise
de rendez-vous et vérifier le type présélectionné.

**Acceptance Scenarios**:

1. **Given** une page service ou une fiche produit, **When** le médecin choisit de prendre
   rendez-vous, **Then** la prise de rendez-vous s'ouvre sur le type correspondant.
2. **Given** un médecin non connecté, **When** il veut prendre rendez-vous, **Then** il
   est invité à se connecter ou à créer son compte, puis revient au même point.
3. **Given** un client connecté dont l'offre ne comprend pas cette prestation, **When** il
   ouvre la prise de rendez-vous depuis la page, **Then** il lui est indiqué comment
   l'obtenir et comment contacter le service client.

---

### User Story 7 - Réserver une intervention sur site (Priority: P2)

Le médecin réserve une installation ou une formation dans son cabinet. Il choisit un
créneau, que l'équipe confirme après avoir vérifié le déplacement.

**Why this priority**: les interventions sur site supposent un déplacement, dont la
faisabilité ne dépend pas seulement d'un créneau libre.

**Independent Test**: réserver une installation sur site, vérifier que le créneau est bloqué
et « à confirmer », puis le confirmer côté équipe ; recommencer en proposant une autre date
et vérifier l'acceptation par le client.

**Acceptance Scenarios**:

1. **Given** un type de rendez-vous sur site, **When** le client choisit un créneau,
   **Then** le créneau disparaît des disponibilités, le rendez-vous porte l'état « à
   confirmer » et le client est informé qu'il recevra une confirmation.
2. **Given** une intervention sur site, **When** elle est réservée, **Then** l'adresse du
   cabinet est préremplie et modifiable.
3. **Given** un rendez-vous « à confirmer », **When** l'équipe le confirme, **Then** il
   passe à « confirmé » et le client en est prévenu.
4. **Given** un rendez-vous « à confirmer », **When** l'équipe propose une autre date,
   **Then** le client en est prévenu et peut l'accepter ou la refuser ; le premier créneau
   est libéré.
5. **Given** un rendez-vous « à confirmer » resté sans réponse de l'équipe, **When** le
   délai fixé est dépassé, **Then** l'équipe est relancée par une alerte.

---

### User Story 8 - Voir et organiser les rendez-vous (Priority: P2)

L'équipe ExploCardio.fr voit tous les rendez-vous, avec le client, la commande ou l'appareil
concerné. L'administrateur règle les types, leurs durées et leurs disponibilités.

**Why this priority**: l'équipe doit préparer chaque rendez-vous ; sans vue d'ensemble, elle
retombe dans les échanges d'emails.

**Independent Test**: créer un type de rendez-vous, fixer sa durée et ses disponibilités,
puis vérifier les créneaux proposés et l'affichage d'une réservation côté équipe.

**Acceptance Scenarios**:

1. **Given** un membre de l'équipe, **When** il consulte les rendez-vous, **Then** il voit
   pour chacun le client, ses coordonnées, le type, la date, le mode, et la commande, la
   location, l'appareil ou la demande de SAV concernés.
2. **Given** un administrateur, **When** il modifie la durée ou les disponibilités d'un
   type, **Then** les créneaux proposés changent en conséquence, sans toucher aux
   rendez-vous déjà pris.
3. **Given** un membre de l'équipe, **When** il réserve, déplace ou annule un rendez-vous
   pour un client, **Then** le client en est prévenu.
4. **Given** un rendez-vous passé, **When** l'équipe indique s'il a été honoré ou non,
   **Then** cette information est conservée.
5. **Given** l'absence d'un intervenant, **When** elle est enregistrée dans l'agenda,
   **Then** ses créneaux ne sont plus proposés.

---

### Edge Cases

- Aucun créneau libre dans la période affichée : le client le voit et peut regarder plus
  loin ou contacter l'équipe.
- Outil d'agenda momentanément indisponible : le site l'indique, invite à réessayer ou à
  contacter l'équipe, et les rendez-vous déjà pris restent visibles dans « Mon compte ».
- Rendez-vous modifié directement dans l'outil d'agenda par l'équipe : le changement
  apparaît dans « Mon compte » et le client est prévenu.
- Réservation la veille pour le lendemain : le rappel de la veille n'est pas renvoyé en
  double de la confirmation.
- Jours fériés et fermetures : aucun créneau n'est proposé.
- Commande annulée ou location résiliée avant le rendez-vous : l'équipe est alertée et le
  client est invité à annuler ou à garder son rendez-vous.
- Client qui réserve plusieurs fois le même type de rendez-vous pour la même commande : il
  est averti du rendez-vous existant.
- Lien de visio ouvert trop tôt ou après la fin : un message indique l'horaire du
  rendez-vous.
- Rendez-vous non honoré par le client : la prestation est décomptée ou non selon la
  décision de l'équipe, qui l'enregistre.
- Coordonnées du service client non renseignées (F01) : l'invitation à le contacter renvoie
  au formulaire de contact.
- Client qui refuse les cookies non essentiels : la prise de rendez-vous reste utilisable.
- Compte supprimé (RGPD) : les rendez-vous à venir sont annulés et les données personnelles
  sont retirées de l'outil d'agenda.
- Navigation au clavier ou avec un lecteur d'écran : le choix du créneau reste possible.

## Requirements *(mandatory)*

### Functional Requirements

**Types de rendez-vous**

- **FR-001** : Le site DOIT proposer les types de rendez-vous suivants : installation sur
  site, paramétrage de l'accès Cloud (à distance), formation à l'appareil ou au logiciel (à
  distance ou sur site), point SAV.
- **FR-002** : Chaque type DOIT avoir sa durée, son mode (à distance, sur site ou les deux)
  et ses disponibilités, réglables par l'administrateur sans développeur.
- **FR-003** : L'administrateur DOIT pouvoir ajouter, modifier, activer ou désactiver un
  type de rendez-vous.

**Réservation**

- **FR-004** : Les créneaux proposés DOIVENT provenir d'un outil d'agenda existant et être
  affichés dans le site, sans redirection vers un site tiers.
- **FR-005** : Un créneau réservé DOIT disparaître immédiatement des disponibilités. Deux
  clients NE DOIVENT JAMAIS obtenir le même créneau.
- **FR-006** : La prise de rendez-vous DOIT être réservée aux titulaires d'un compte, validé
  ou en attente de validation. Un visiteur non connecté DOIT être invité à se connecter ou
  à créer son compte, puis revenir au même point de la réservation.
- **FR-007** : Un client connecté NE DOIT PAS avoir à ressaisir ses coordonnées.
- **FR-008** : Un client NE DOIT pouvoir réserver que les prestations comprises dans son
  offre : installation si sa commande en comprend une, formation si sa mise à disposition
  ou son achat l'inclut, paramétrage s'il dispose d'un accès au logiciel Cloud, point SAV
  s'il a une demande de SAV ouverte. L'administrateur DOIT pouvoir définir, par produit et
  par offre, les prestations incluses et leur nombre.
- **FR-034** : Une prestation incluse DOIT être décomptée quand le rendez-vous est honoré,
  et redevenir disponible si le rendez-vous est annulé dans les délais.
- **FR-035** : Un client qui souhaite une prestation non comprise dans son offre, ou une
  séance supplémentaire, DOIT être orienté vers le service client, par téléphone ou par
  email. Aucune prestation supplémentaire n'est vendue en ligne par F08.
- **FR-036** : L'équipe DOIT pouvoir réserver pour un client un rendez-vous hors de son
  offre, avec un motif.
- **FR-009** : Un rendez-vous DOIT pouvoir être rattaché à une commande, une location, un
  appareil enregistré ou une demande de SAV.
- **FR-010** : La prise de rendez-vous DOIT être accessible depuis « Mon compte », depuis
  les fiches produit et depuis les pages services.
- **FR-011** : Aucun champ de la réservation NE DOIT inviter à saisir une donnée de
  patient, et la zone de commentaire DOIT le rappeler.

**Interventions sur site**

- **FR-012** : Pour une intervention sur site, le créneau choisi par le client DOIT être
  bloqué aussitôt et porter l'état « à confirmer ». L'équipe DOIT le confirmer, ou proposer
  une autre date, dans un délai fixé par l'administrateur. Le client DOIT être prévenu de
  la confirmation ou de la proposition, et pouvoir accepter ou refuser la nouvelle date.
- **FR-013** : Pour une intervention sur site, l'adresse du cabinet DOIT être préremplie et
  modifiable, et limitée à la France métropolitaine.

**Propositions automatiques**

- **FR-014** : Après une commande de mise à disposition, le client DOIT se voir proposer un
  créneau de formation, à l'écran et par email.
- **FR-015** : Après une commande comprenant une installation, et à l'ouverture d'un accès
  au logiciel Cloud, le client DOIT se voir proposer le rendez-vous correspondant.
- **FR-016** : Une proposition DOIT présélectionner le type de rendez-vous et l'objet
  concerné. Une proposition sans suite DOIT donner lieu à une seule relance, après un délai
  réglable.

**Confirmation, rappel et visio**

- **FR-017** : Toute réservation DOIT être confirmée au client à l'écran et par email, avec
  le type, la date, l'heure, la durée, le mode et la façon de modifier ou d'annuler.
- **FR-018** : Un rendez-vous à distance DOIT comporter un lien de visioconférence, présent
  dans l'email et dans « Mon compte ».
- **FR-019** : Le client DOIT recevoir un rappel la veille du rendez-vous.
- **FR-020** : Le client DOIT pouvoir ajouter le rendez-vous à son propre agenda.

**Modification et annulation**

- **FR-021** : Le client DOIT pouvoir modifier ou annuler son rendez-vous en ligne, depuis
  « Mon compte » ou depuis l'email, jusqu'à un délai avant le rendez-vous fixé par
  l'administrateur.
- **FR-022** : Une modification ou une annulation DOIT libérer immédiatement le créneau et
  prévenir le client et l'équipe.

**Suivi**

- **FR-023** : « Mon compte » DOIT présenter les rendez-vous à venir et l'historique des
  rendez-vous passés et annulés.
- **FR-024** : L'équipe DOIT voir tous les rendez-vous, avec le client, ses coordonnées et
  l'objet concerné, et pouvoir réserver, déplacer ou annuler pour un client.
- **FR-025** : L'équipe DOIT pouvoir indiquer si un rendez-vous passé a été honoré.
- **FR-026** : Un changement fait directement dans l'outil d'agenda DOIT se refléter dans
  « Mon compte » et prévenir le client.

**Données, sécurité et continuité**

- **FR-027** : Les rendez-vous DOIVENT être conservés par le site avec leur rattachement,
  afin de rester visibles dans « Mon compte » et pour l'équipe même si l'outil d'agenda est
  indisponible.
- **FR-028** : Seules les données nécessaires au rendez-vous (identité, cabinet, email,
  téléphone, adresse d'intervention) DOIVENT être transmises à l'outil d'agenda, et aucune
  donnée de patient.
- **FR-029** : La prise de rendez-vous DOIT respecter le choix de cookies du visiteur (F01)
  et rester utilisable s'il a refusé les cookies non essentiels.
- **FR-030** : Les réservations, modifications et annulations faites par l'équipe DOIVENT
  être journalisées avec leur auteur et leur date.
- **FR-031** : En cas d'indisponibilité de l'outil d'agenda, le site DOIT l'indiquer
  clairement et proposer de contacter l'équipe.

**Charte, accessibilité et langue**

- **FR-032** : La prise de rendez-vous DOIT respecter la charte du site (couleurs, police,
  composants) bien qu'elle s'appuie sur un outil externe, ainsi que le niveau WCAG 2.2 AA,
  le vouvoiement et le ton sobre du site.
- **FR-033** : Tous les écrans et emails DOIVENT être en français, avec des dates et heures
  au format français et à l'heure de Paris.

### Key Entities

- **Type de rendez-vous** : libellé, durée, mode (à distance, sur site), disponibilités,
  état actif ou inactif.
- **Prestation incluse** : pour un produit ou une offre, type de rendez-vous compris et
  nombre de séances.
- **Droit à prestation** : pour un client, prestation acquise par une commande, une
  location, un accès Cloud ou une demande de SAV, avec le nombre de séances restantes.
- **Rendez-vous** : client, type, date et heure, durée, mode, lien de visio ou adresse,
  état (à confirmer, confirmé, modifié, annulé, honoré, non honoré), commentaire.
- **Rattachement** : commande, location, appareil enregistré ou demande de SAV concernés.
- **Proposition de rendez-vous** : événement déclencheur, type proposé, objet concerné,
  état (proposée, relancée, réservée, ignorée).
- **Intervenant** : membre de l'équipe dont l'agenda fournit les disponibilités.
- **Règles de rendez-vous** : délai de modification et d'annulation, délai de relance, délai
  de confirmation d'une intervention sur site.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** : Après une commande de mise à disposition, 100 % des clients se voient
  proposer un créneau de formation.
- **SC-002** : Un créneau réservé cesse d'être proposé aux autres clients en moins de
  5 secondes, et aucun créneau n'est attribué deux fois.
- **SC-003** : Un client connecté réserve un rendez-vous en moins de 2 minutes, sans
  ressaisir ses coordonnées.
- **SC-004** : 100 % des réservations donnent lieu à un email de confirmation en moins de
  2 minutes, et à un rappel la veille.
- **SC-005** : 100 % des rendez-vous à distance comportent un lien de visioconférence.
- **SC-006** : Au moins 80 % des rendez-vous sont pris sans aucun échange d'email ni appel
  avec l'équipe.
- **SC-007** : Un client modifie ou annule un rendez-vous en moins d'une minute.
- **SC-008** : Au moins 90 % des rendez-vous confirmés sont honorés.
- **SC-009** : Le médecin ne quitte jamais le site pendant la réservation.
- **SC-010** : Un audit de la prise de rendez-vous ne relève aucune non-conformité WCAG 2.2
  AA, et la réservation est réalisable au clavier seul.

## Assumptions

Les points marqués « confirmé » n'étaient pas tranchés dans la demande initiale ; ils ont été
validés par la responsable du projet le 2026-10-13.

- **Outil d'agenda et constitution** : la constitution a été amendée le 2026-10-13
  (version 1.1.0) pour autoriser l'outil d'agenda et l'outil d'emailing comme systèmes
  externes.
- **Gratuité (confirmé)** : la réservation est gratuite. Le prix d'une installation ou
  d'une formation est réglé à la commande (F03, F04, F05), jamais au moment du rendez-vous.
- **Délai de modification et d'annulation (confirmé)** : jusqu'à 24 heures avant le
  rendez-vous, réglable. Au-delà, le client contacte l'équipe.
- **Délai de réservation (confirmé)** : au plus tôt le lendemain, au plus tard 60 jours à
  l'avance. Valeurs réglables.
- **Rappel (confirmé)** : par email uniquement, la veille. Pas de SMS dans cette version.
- **Relance d'une proposition (confirmé)** : une seule, 3 jours après la proposition,
  réglable.
- **Point SAV (confirmé)** : rendez-vous à distance, rattaché à une demande de SAV de
  F07.
- **Paramétrage Cloud (confirmé)** : proposé quand F12 est livré ; d'ici là, le type
  existe mais reste désactivé.
- **Délai de confirmation sur site** : 2 jours ouvrés par défaut, réglable.
- **Prestations incluses** : le détail de ce que chaque produit et chaque offre comprend
  (types et nombre de séances) est une donnée à saisir avant la mise en ligne. Par défaut,
  une mise à disposition comprend une formation à distance.
- **Source des disponibilités** : l'outil d'agenda fait foi pour les créneaux libres ; le
  site conserve les rendez-vous pris et leur rattachement.
- **Visioconférence** : le lien est fourni par l'outil d'agenda ou l'outil de visio de
  l'équipe ; le choix relève de la planification.
- **Hébergement des données** : l'outil d'agenda retenu doit traiter les données dans le
  respect du RGPD ; c'est un critère de choix lors de la planification.
- **Emails** : envoyés à la charte du site, par le site ou par l'outil d'agenda, selon le
  choix fait lors de la planification.
- **Périmètre** : site en français, professionnels de santé de France métropolitaine, aucune
  donnée de patient.
