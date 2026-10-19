# Feature Specification: F12 — Accès à la plateforme Cloud HDS (Nelson / Patient Care Anywhere)

**Feature Branch**: `012-acces-cloud-hds`

**Created**: 2026-10-14

**Status**: Draft

**Input**: User description: "F12 — Accès à la plateforme Cloud HDS (Nelson / Patient Care Anywhere) : création ou mise à jour du compte du médecin sur la plateforme à l'achat, à la location ou à l'abonnement d'un logiciel, retrait des droits à la fin avec un délai de grâce, rubrique « Mes logiciels Cloud » dans Mon compte, gestion manuelle par l'administrateur, automatisation selon ce que Nelson fournit, offre « en préparation » tant que le partenariat n'est pas finalisé. Objectif : ouvrir au médecin l'accès à ses logiciels en un clic dès l'achat ou la location, sans revente de licence classique."

## Contexte et objectif

ExploCardio.fr ne revend plus de licences logicielles : ses logiciels sont proposés en mode
SaaS, sur une plateforme dédiée fournie par son partenaire Nelson (Patient Care Anywhere,
« PCA »), hébergée dans un datacenter certifié HDS. ExploCardio.fr y crée les accès de
chaque médecin et gère leurs droits. **Les données des patients restent exclusivement sur
cette plateforme** (principe IV).

F12 a pour objectif **d'ouvrir au médecin l'accès à ses logiciels dès l'achat ou la
location**, et de le refermer proprement à la fin, sans intervention de sa part.

F12 livre l'ouverture, la mise à jour, la suspension et la fermeture des accès, la rubrique
« Mes logiciels Cloud » de « Mon compte », la gestion manuelle par l'équipe, et la
présentation de l'offre tant que le partenariat n'est pas finalisé.

**Hors périmètre de F12** : la plateforme PCA elle-même, ses logiciels et les données qu'elle
héberge ; la vente et la facturation des logiciels (F03, F04, Odoo) ; la mise à disposition
(F05) ; la conversation WhatsApp d'aide au paramétrage (F09) ; la prise de rendez-vous en
ligne, hors du site.

**Lien avec les autres modules** : F04 et F05 déclenchent l'ouverture et la fermeture des
accès ; F05 suspend l'accès en cas d'impayé ; F13 présente à l'équipe les accès à ouvrir ou
à fermer ; F10 envoie les emails ; F11 fournit le connecteur PCA et son mode
démonstration.

**Phases (constitution v2.2.0)** : la plateforme PCA est utilisée uniquement par son
connecteur (F11). En phase 1, le connecteur PCA de démonstration simule l'ouverture, la
suspension et la fermeture des accès, dont le statut est visible dans « Mon compte ». Aucun
compte réel n'est créé sur la plateforme.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Avoir accès à son logiciel dès qu'on en a besoin (Priority: P1)

Un médecin loue un Holter avec son logiciel Cloud. Au plus tard à la livraison, son accès est
ouvert : il le voit dans « Mon compte », avec le lien vers la plateforme et l'aide à la
première connexion.

**Why this priority**: c'est l'objectif du module et un critère d'acceptation. Un appareil
livré sans accès au logiciel est inutilisable.

**Independent Test**: commander une mise à disposition incluant le logiciel, marquer
l'appareil expédié puis livré, et vérifier que le logiciel est actif dans « Mon compte »
au plus tard à la livraison.

**Acceptance Scenarios**:

1. **Given** une mise à disposition incluant un logiciel Cloud, **When** l'appareil est
   expédié, **Then** l'ouverture de l'accès est déclenchée, et le logiciel apparaît actif
   dans « Mon compte » au plus tard à la livraison.
2. **Given** l'achat d'une configuration « appareil + logiciel Cloud », **When** le
   paiement est confirmé, **Then** l'accès est ouvert pour la période incluse (12 mois par
   défaut), dont la date de fin apparaît dans « Mon compte ».
3. **Given** un médecin qui n'a pas encore de compte sur la plateforme, **When** son
   premier accès est ouvert, **Then** son compte utilisateur est créé avec les droits du
   logiciel souscrit.
4. **Given** un médecin qui a déjà un compte sur la plateforme, **When** il souscrit un
   autre logiciel, **Then** son compte est mis à jour avec ce droit supplémentaire, sans
   second compte.
5. **Given** un accès ouvert, **When** il l'est, **Then** le médecin reçoit un email
   l'en informant, avec le lien vers la plateforme et la marche à suivre pour sa première
   connexion.
6. **Given** un accès qui ne peut pas être ouvert (plateforme indisponible, refus),
   **When** l'échec est constaté, **Then** l'équipe est alertée, l'ouverture est reprise,
   et le médecin n'est pas laissé sans information.

---

### User Story 2 - Fermer l'accès à la date prévue (Priority: P1)

Un médecin résilie sa location. À la date de fin, ses droits sur le logiciel sont retirés,
après un délai de grâce qui lui laisse le temps de récupérer ses données.

**Why this priority**: c'est un critère d'acceptation. Un accès qui reste ouvert après la fin
est un service rendu sans paiement ; un accès fermé sans prévenir prive le médecin de ses
données.

**Independent Test**: résilier une location incluant le logiciel, vérifier les emails de
prévenance, le passage en délai de grâce à la date de fin, puis la fermeture au terme du
délai.

**Acceptance Scenarios**:

1. **Given** une location ou un abonnement résilié, **When** la date de fin arrive,
   **Then** l'accès passe en délai de grâce, durant lequel le médecin peut seulement
   consulter et récupérer ses données.
2. **Given** un accès en délai de grâce, **When** le délai fixé dans le back-office est
   écoulé, **Then** les droits sont retirés et l'accès est fermé.
3. **Given** une fin d'accès programmée, **When** elle approche, **Then** le médecin reçoit
   un email lui indiquant la date de fin, la durée du délai de grâce et la façon de
   récupérer ses données.
4. **Given** un médecin qui garde d'autres logiciels actifs, **When** l'un d'eux prend fin,
   **Then** seul ce droit est retiré ; son compte et ses autres droits sont conservés.
5. **Given** une résiliation annulée avant la date de fin (« Prolonger », F05), **When**
   elle est annulée, **Then** la fermeture programmée est annulée aussi.
6. **Given** une période d'accès incluse qui approche de sa fin, **When** le délai de
   prévenance est atteint, **Then** le médecin est invité à poursuivre par un abonnement
   mensuel ; s'il souscrit, son accès continue sans interruption ; sinon, il passe en délai
   de grâce à la date de fin.

---

### User Story 3 - Retrouver ses logiciels dans « Mon compte » (Priority: P1)

Le médecin ouvre « Mes logiciels Cloud » : il voit ses logiciels actifs et leurs dates, ouvre
la plateforme d'un clic, trouve l'aide à la première connexion et peut écrire à l'équipe sur
WhatsApp pour se faire aider au paramétrage.

**Why this priority**: c'est le point d'entrée quotidien du médecin vers ses logiciels.

**Independent Test**: avec un compte ayant un logiciel actif, un en délai de grâce et un
fermé, vérifier l'affichage de la rubrique et le lien vers la plateforme.

**Acceptance Scenarios**:

1. **Given** un client connecté, **When** il ouvre « Mes logiciels Cloud », **Then** il
   voit pour chaque logiciel son nom, son état (en cours d'ouverture, actif, en délai de
   grâce, suspendu, fermé) et ses dates (début, fin prévue).
2. **Given** un logiciel actif, **When** le médecin choisit « Accéder à la plateforme »,
   **Then** la plateforme s'ouvre dans un nouvel onglet.
3. **Given** la rubrique, **When** elle s'affiche, **Then** elle propose l'aide à la
   première connexion (contenus du centre d'aide, F09) et le bouton « Écrire sur
   WhatsApp » pour se faire aider au paramétrage.
4. **Given** la rubrique, **When** elle s'affiche, **Then** elle ne présente aucune donnée
   de patient, ni aucun mot de passe de la plateforme.
5. **Given** un client sans logiciel Cloud, **When** il ouvre la rubrique, **Then** il voit
   l'offre et comment y souscrire.

---

### User Story 4 - Gérer un accès à la main (Priority: P2)

L'administrateur ou un membre du support ouvre, suspend ou ferme un accès depuis le
back-office : pour rattraper un échec, faire un geste commercial ou réagir à un impayé.

**Why this priority**: indispensable pour les exceptions, mais l'essentiel des accès suit
les commandes et les locations.

**Independent Test**: depuis le back-office, ouvrir un accès, le suspendre puis le fermer,
et vérifier chaque état dans « Mon compte » et l'historique.

**Acceptance Scenarios**:

1. **Given** un administrateur ou un membre du support, **When** il ouvre, suspend ou
   ferme un accès depuis le back-office (F13), **Then** l'action passe par le connecteur
   PCA, le statut est mis à jour dans « Mon compte » et le client est prévenu.
2. **Given** un impayé non régularisé (F05), **When** le délai fixé est atteint, **Then**
   l'accès est suspendu ; il est rétabli dès la régularisation.
3. **Given** toute action manuelle, **When** elle est effectuée, **Then** elle est
   journalisée avec son auteur, sa date et son motif.
4. **Given** un commercial, **When** il cherche à ouvrir ou fermer un accès, **Then**
   l'action ne lui est pas proposée (F13).

---

### User Story 5 - Ouvrir les accès quand la plateforme n'est pas automatisée (Priority: P2)

Si la plateforme ne permet pas encore d'ouvrir les accès automatiquement, chaque ouverture ou
fermeture devient une tâche pour l'équipe, avec toutes les informations nécessaires.
L'équipe la réalise sur la plateforme, la confirme dans le back-office, et le médecin est
prévenu.

**Why this priority**: le mode d'automatisation dépend de ce que Nelson fournira ; le site
doit fonctionner dans les deux cas.

**Independent Test**: configurer le mode manuel, déclencher une ouverture par une mise à
disposition, réaliser la tâche et la confirmer dans le back-office, puis vérifier « Mon
compte » et l'email au médecin.

**Acceptance Scenarios**:

1. **Given** le mode manuel, **When** une ouverture ou une fermeture est déclenchée,
   **Then** une tâche est créée dans le back-office avec le médecin, ses coordonnées
   professionnelles, le logiciel, l'action et la date à respecter.
2. **Given** une tâche, **When** l'équipe confirme l'avoir réalisée, **Then** le statut
   est mis à jour dans « Mon compte » et le médecin est prévenu.
3. **Given** une tâche d'ouverture liée à une mise à disposition, **When** la date de
   livraison approche sans confirmation, **Then** l'équipe est alertée.
4. **Given** le mode automatique, **When** une ouverture ou une fermeture est déclenchée,
   **Then** elle est réalisée sans tâche, par le connecteur PCA.

---

### User Story 6 - Présenter l'offre en attendant le partenariat (Priority: P3)

Tant que le partenariat avec Nelson n'est pas finalisé, la page « Hébergement des données de
santé » présente l'offre comme « en préparation » et propose un formulaire d'intérêt.

**Why this priority**: elle prépare la commercialisation sans rien promettre de ce qui
n'existe pas encore.

**Independent Test**: vérifier la page avec l'offre marquée « en préparation », envoyer le
formulaire d'intérêt et retrouver la demande dans le back-office ; vérifier qu'aucune
souscription n'est possible.

**Acceptance Scenarios**:

1. **Given** le partenariat non finalisé, **When** la page « Hébergement des données de
   santé » s'affiche, **Then** l'offre porte le badge « En préparation » et aucune
   souscription n'est proposée.
2. **Given** le formulaire d'intérêt, **When** un médecin l'envoie, **Then** sa demande est
   enregistrée, visible par l'équipe dans le back-office, et une confirmation lui est
   affichée.
3. **Given** le partenariat finalisé, **When** l'administrateur retire le badge « En
   préparation », **Then** la page présente l'offre normalement.

---

### Edge Cases

- Deux logiciels souscrits par le même médecin à quelques minutes d'intervalle : un seul
  compte est créé, avec les deux droits.
- Email du médecin modifié sur le site : la plateforme en est informée par le connecteur ;
  l'identifiant de connexion du médecin n'en est pas cassé.
- Compte du site supprimé (RGPD) : les accès sont fermés selon le délai de grâce ; les
  données hébergées sur la plateforme relèvent du contrat entre le médecin, ExploCardio.fr
  et Nelson.
- Compte suspendu sur le site : les accès sont suspendus aussi.
- Appareil acheté puis remboursé intégralement **avant sa livraison** : l'accès ouvert est
  fermé sans délai de grâce ; après la livraison, le délai de grâce s'applique (le site ne
  sait pas si l'accès a servi — décision D2 du plan).
- Plateforme indisponible au moment d'une fermeture : la fermeture est reprise ; l'accès
  n'est jamais laissé ouvert au-delà de la date prévue sans alerte.
- Médecin qui écrit sur WhatsApp en mentionnant un patient : cela se passe hors du site ;
  la mention près des boutons le prévient (F09).

## Requirements *(mandatory)*

### Functional Requirements

**Ouverture et mise à jour**

- **FR-001** : À l'achat, à la location ou à l'abonnement d'un logiciel Cloud, le compte
  utilisateur du médecin sur la plateforme PCA DOIT être créé, ou mis à jour s'il existe,
  avec les droits correspondant aux logiciels souscrits.
- **FR-002** : Pour une mise à disposition incluant un logiciel, l'accès DOIT être ouvert au
  plus tard à la livraison de l'appareil.
- **FR-003** : Un médecin NE DOIT avoir qu'un seul compte sur la plateforme, quel que soit le
  nombre de logiciels souscrits.
- **FR-004** : Le médecin DOIT être informé par email de l'ouverture de son accès, avec le
  lien vers la plateforme et la marche à suivre pour sa première connexion.
- **FR-005** : Un échec d'ouverture DOIT alerter l'équipe et être repris, sans création de
  compte en double.
- **FR-006** : Un logiciel Cloud acheté avec un appareil DOIT donner une période d'accès
  incluse, dont la durée est fixée dans Odoo par produit (12 mois par défaut, principe VI).
- **FR-029** : Avant la fin de la période incluse, le médecin DOIT être prévenu par email et
  dans « Mon compte », et se voir proposer de poursuivre par un abonnement mensuel payant,
  au prix fixé dans Odoo, souscrit en ligne (F04).
- **Note (F04, décision D3 du 2026-10-17)** : la souscription en ligne de l'abonnement au
  logiciel Cloud (FR-049 de F04 : carte ou SEPA, prix fixé dans Odoo, prise d'effet à la fin de
  la période incluse) est livrée avec F12, depuis « Mes logiciels Cloud », en réutilisant le
  mécanisme d'abonnement de F04.
- **FR-030** : Un médecin qui souscrit l'abonnement avant la fin de la période incluse DOIT
  conserver son accès sans interruption. Sans souscription, l'accès suit les règles de fin
  des droits (délai de grâce, puis fermeture). Il DOIT pouvoir résilier son abonnement
  depuis « Mes logiciels Cloud » : fin au terme du mois payé, puis délai de grâce.

**Fin des droits**

- **FR-007** : À la fin d'une location ou d'un abonnement, les droits DOIVENT être retirés à
  la date de fin, après un délai de grâce réglable dans le back-office, pendant lequel le
  médecin peut seulement consulter et récupérer ses données.
- **FR-008** : Le médecin DOIT être prévenu par email avant la fin de ses droits, avec la
  date de fin, la durée du délai de grâce et la façon de récupérer ses données.
- **FR-009** : La fin d'un logiciel NE DOIT retirer que ce droit ; le compte du médecin et ses
  autres droits sont conservés.
- **FR-010** : Une résiliation annulée avant sa date de fin DOIT annuler la fermeture
  programmée.
- **FR-011** : Un accès NE DOIT JAMAIS rester ouvert au-delà de sa date de fin et de son
  délai de grâce sans qu'une alerte soit levée.

**Mon compte**

- **FR-012** : « Mon compte » DOIT comporter une rubrique « Mes logiciels Cloud » présentant,
  pour chaque logiciel, son nom, son état (en cours d'ouverture, actif, en délai de grâce,
  suspendu, fermé) et ses dates.
- **FR-013** : La rubrique DOIT proposer un lien d'accès à la plateforme, l'aide à la
  première connexion (centre d'aide, F09) et le bouton « Écrire sur WhatsApp » pour l'aide
  au paramétrage (F09).
- **FR-014** : Le site NE DOIT JAMAIS stocker les identifiants de connexion à la plateforme
  en clair, ni afficher de mot de passe, ni afficher la moindre donnée de patient.

**Gestion par l'équipe**

- **FR-015** : L'administrateur et le support DOIVENT pouvoir ouvrir, suspendre ou fermer un
  accès depuis le back-office (F13), avec un motif. Le client DOIT en être prévenu.
- **FR-016** : Un impayé non régularisé, d'une location (F05) comme d'un abonnement
  logiciel, DOIT suspendre l'accès ; la régularisation DOIT le rétablir.
- **FR-017** : Une suspension ou une fermeture de compte sur le site DOIT suspendre ou fermer
  les accès correspondants.
- **FR-018** : Toute ouverture, suspension, réouverture et fermeture DOIT être journalisée
  avec son auteur (ou son déclencheur automatique), sa date et son motif.

**Mode d'automatisation**

- **FR-019** : Le site DOIT fonctionner selon deux modes, choisis par configuration selon ce
  que la plateforme permet : un mode automatique, où le connecteur PCA crée et retire les
  droits sans intervention ; un mode manuel, où chaque ouverture ou fermeture crée une tâche
  pour l'équipe.
- **FR-020** : En mode manuel, la tâche DOIT présenter le médecin, ses coordonnées
  professionnelles, le logiciel, l'action et la date à respecter. L'équipe DOIT confirmer
  la tâche dans le back-office une fois réalisée ; le statut et le client sont alors mis à
  jour.
- **FR-021** : En mode manuel, une tâche d'ouverture non confirmée la veille de la date de
  livraison (location) ou un jour ouvré après le paiement (achat, abonnement), ou une tâche
  de fermeture non confirmée à sa date, DOIT alerter l'équipe.
- **FR-022** : Le choix du mode NE DOIT modifier ni les pages, ni le parcours du médecin, ni
  les emails qu'il reçoit (principe III).

**Offre en préparation**

- **FR-023** : Tant que le partenariat n'est pas finalisé, la page « Hébergement des données
  de santé » DOIT présenter l'offre avec le badge « En préparation », sans aucune
  souscription possible.
- **FR-024** : La page DOIT proposer un formulaire d'intérêt (coordonnées, besoin), dont les
  demandes sont visibles par l'équipe dans le back-office.
- **FR-025** : L'administrateur DOIT pouvoir retirer le badge « En préparation » quand le
  partenariat est finalisé : la page présente alors l'offre avec son tarif (fixé dans Odoo)
  et renvoie vers les logiciels Cloud souscriptibles ; aucun parcours de souscription
  distinct n'est prévu en V1.

**Données et conformité**

- **FR-026** : Seules les données nécessaires à l'accès (identité, email professionnel,
  numéro RPPS ou SIRET, cabinet, logiciels et dates) DOIVENT être transmises à la
  plateforme, par le connecteur PCA. Aucune donnée de patient NE DOIT transiter par le site
  (principe IV).
- **FR-027** : En phase 1, le connecteur PCA de démonstration DOIT simuler l'ouverture, la
  suspension et la fermeture des accès dans les deux modes, sans créer aucun compte réel.
- **FR-028** : Les écrans et emails de F12 DOIVENT respecter la charte, le niveau WCAG 2.2 AA,
  le vouvoiement et le ton sobre du site.

### Key Entities

- **Compte plateforme** : médecin concerné, identifiant sur la plateforme (jamais de mot de
  passe), état ; tenu par la plateforme et relu par le connecteur, il n'est pas copié sur le
  site.
- **Droit logiciel** : logiciel, origine (période incluse à l'achat, location, abonnement,
  geste manuel), date
  de début, date de fin prévue, délai de grâce, état (en cours d'ouverture, actif, en délai
  de grâce, suspendu, fermé).
- **Tâche d'accès** (mode manuel) : médecin, logiciel, action (ouvrir, suspendre, fermer),
  date à respecter, état (à faire, réalisée), auteur de la confirmation.
- **Demande d'intérêt** : coordonnées, besoin, date, état de traitement.
- **Journal des accès** : actions, auteurs ou déclencheurs, dates, motifs.

## Success Criteria *(mandatory)*

### Measurable Outcomes

Chaque critère est marqué [Phase 1] s'il se vérifie avec les connecteurs de démonstration,
ou [Phase 3] s'il nécessite les vrais services. Sauf mention contraire, les scénarios
d'acceptation des parcours se vérifient en phase 1.

- **SC-001** [Phase 1] : Après une mise à disposition incluant le logiciel, le client voit son
  logiciel actif dans « Mon compte » au plus tard à la livraison.
- **SC-002** [Phase 1] : À la résiliation, l'accès est fermé à la date prévue, au terme du
  délai de grâce.
- **SC-003** [Phase 1] : Aucun médecin n'a deux comptes sur la plateforme (0 cas, y compris
  en cas de souscriptions rapprochées).
- **SC-004** [Phase 1] : 100 % des ouvertures et des fermetures d'accès donnent lieu à un
  email au médecin et à une ligne de journal.
- **SC-005** [Phase 1] : Aucun mot de passe de la plateforme et aucune donnée de patient ne
  figure dans les données du site.
- **SC-006** [Phase 1] : Le passage du mode manuel au mode automatique ne change rien pour le
  médecin (mêmes écrans, mêmes emails).
- **SC-007** [Phase 1] : En mode manuel, 100 % des tâches non confirmées à temps déclenchent
  une alerte.
- **SC-008** [Phase 3] : En mode automatique, un accès est ouvert sur la plateforme réelle
  en moins de 5 minutes après son déclenchement.
- **SC-009** [Phase 3] : Un accès fermé sur le site n'est plus utilisable sur la plateforme
  réelle au terme du délai de grâce.
- **SC-010** [Phase 1] : Un audit de la rubrique « Mes logiciels Cloud » ne relève aucune
  non-conformité WCAG 2.2 AA.
- **SC-011** [Phase 1] : Un médecin qui souscrit l'abonnement avant la fin de sa période
  incluse ne subit aucune interruption d'accès.

## Assumptions

Les points marqués « confirmé » n'étaient pas tranchés dans la demande initiale ; ils ont été
validés par la responsable du projet le 2026-10-14.

- **Mode d'automatisation (confirmé)** : il dépend de ce que Nelson fournira. La spec
  prévoit les deux modes (FR-019) ; le choix se fera par configuration, au plus tard lors
  du branchement (F14). Aucune décision n'est attendue avant.
- **Identifiants (confirmé)** : le site ne reçoit ni ne connaît jamais le mot de passe du
  médecin sur la plateforme. La plateforme envoie elle-même l'invitation et la création du
  mot de passe. Si Nelson ne le permet pas, la solution sera arrêtée au plan, sans stockage
  en clair.
- **Connexion en un clic (confirmé)** : « en un clic » désigne le lien d'accès depuis
  « Mon compte ». Une connexion unique (sans ressaisir d'identifiants) pourra être ajoutée si
  Nelson la propose.
- **Délai de grâce (confirmé)** : 30 jours par défaut, réglable dans le back-office. Il n'a
  pas de valeur en euros, d'où son réglage au back-office (principe VI).
- **Plusieurs utilisateurs par cabinet (confirmé)** : un accès par compte client en V1,
  comme le prévoit F02 ; l'ajout d'utilisateurs d'un même cabinet sur la plateforme se fait
  avec l'équipe, sur WhatsApp.
- **Formulaire d'intérêt (confirmé)** : ses demandes sont traitées comme des demandes de
  devis dans le back-office (F13) et copiées dans Odoo en opportunités commerciales (F11).
- **Données hébergées** : la conservation, la restitution et la suppression des données
  des patients sur la plateforme relèvent de Nelson et du contrat avec le médecin, pas du
  site.
- **Abonnement logiciel** : son prix, la durée de la période incluse et sa facturation sont
  définis dans Odoo ; le paiement mensuel passe par Stripe, comme les abonnements de mise à
  disposition (F04). F12 n'en traite que l'accès. F04 ne prévoit aujourd'hui d'abonnement
  que pour la mise à disposition : il devra être étendu à l'abonnement logiciel.
- **Périmètre** : site en français, professionnels de santé de France métropolitaine, aucune
  donnée de patient sur le site.
