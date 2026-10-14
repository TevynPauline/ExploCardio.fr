# Feature Specification: F07 — Espace garanties (numéros de série)

**Feature Branch**: `007-espace-garanties`

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "F07 — Espace garanties (numéros de série) : rubrique « Mes appareils & garanties » dans Mon compte, ajout automatique des appareils achetés sur le site avec leur numéro de série, enregistrement manuel d'un appareil acheté ailleurs validé par l'administrateur, durée de garantie par produit, déclaration de panne et suivi des demandes SAV, proposition d'une MAD Express de remplacement, rappels avant expiration. Objectif : permettre au médecin d'enregistrer ses appareils pour activer et suivre ses garanties."

## Contexte et objectif

F07 donne au médecin un espace où il retrouve tous ses appareils, avec leur numéro de série et
leur garantie, à la manière des espaces clients des grands fabricants d'électroménager. Son
objectif : que le médecin sache à tout moment si un appareil est encore sous garantie, et
qu'il puisse déclarer une panne en partant de l'appareil concerné, sans rechercher une
facture ni un numéro de série.

F07 livre la rubrique « Mes appareils & garanties », l'enregistrement des appareils, le
calcul des garanties, la déclaration et le suivi des demandes de SAV.

**Hors périmètre de F07** : l'expédition des commandes (F04), dont F07 complète l'écran par
la saisie du numéro de série ; la mise à disposition et son parcours (F05) ; les droits
d'assistance et l'assistance à l'acte (F06) ; les notices et tutoriels (F09) ; l'envoi des
emails de rappel (F10) ; le back-office complet (F13) ; la gestion des numéros de série,
des garanties et de leurs durées, qui se fait dans Odoo (base fictive en phase 1).

**Lien avec les autres modules** : « Mon compte » (F02) accueille la rubrique. Les fiches
produit (F03) fournissent modèles, photos et consommables compatibles. F05 fournit la mise à
disposition de remplacement. F06 indique si le client dispose de droits d'assistance.

**Phases (constitution v2.1.0)** : en phase 1, F07 fonctionne avec le connecteur Odoo de démonstration : appareils,
numéros de série, garanties et parc de prêt viennent de sa base fictive. Les demandes de SAV
et les enregistrements manuels sont des demandes réelles, gérées par le site dès la phase 1.
Les emails sont simulés par le connecteur emailing.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Retrouver ses appareils sans rien saisir (Priority: P1)

Un médecin achète un équipement sur le site. À la livraison, l'appareil apparaît de lui-même
dans « Mes appareils & garanties », avec son numéro de série et sa garantie déjà calculée.

**Why this priority**: c'est la promesse du module et un critère d'acceptation : la
garantie est active sans démarche du client.

**Independent Test**: commander un équipement, saisir son numéro de série à l'expédition
dans le back-office, marquer la commande livrée, puis vérifier l'appareil et sa garantie
dans « Mon compte » sans aucune action du client.

**Acceptance Scenarios**:

1. **Given** une commande contenant un équipement, **When** l'équipe prépare l'expédition
   dans Odoo, **Then** elle y saisit ou scanne le numéro de série de chaque appareil, et le
   site le lit à la livraison.
2. **Given** une commande livrée, **When** la livraison est enregistrée, **Then** chaque
   appareil apparaît dans « Mes appareils & garanties » du client, avec son modèle, sa
   photo, son numéro de série, sa date d'achat et sa date de fin de garantie.
3. **Given** une commande de plusieurs exemplaires du même modèle, **When** elle est
   livrée, **Then** chaque exemplaire apparaît séparément, avec son propre numéro de série.
4. **Given** un équipement acquis par une commande « financée », **When** il est livré,
   **Then** il apparaît de la même façon.
5. **Given** un consommable ou un accessoire sans numéro de série, **When** la commande
   est livrée, **Then** il n'apparaît pas dans la rubrique.
6. **Given** une commande remboursée après retour de l'appareil, **When** le retour est
   enregistré, **Then** l'appareil est retiré de la rubrique du client.

---

### User Story 2 - Savoir où en sont ses garanties (Priority: P1)

Dans « Mon compte », le médecin consulte la liste de ses appareils et voit d'un coup d'œil
lesquels sont sous garantie, lesquels arrivent à échéance et lesquels ne sont plus couverts.

**Why this priority**: c'est l'usage quotidien de la rubrique et le point de départ de
toutes les autres actions.

**Independent Test**: avec trois appareils dont les garanties se terminent dans un an, dans
un mois et il y a un mois, vérifier les trois statuts affichés.

**Acceptance Scenarios**:

1. **Given** un client connecté, **When** il ouvre « Mes appareils & garanties », **Then**
   il voit pour chaque appareil la photo, le modèle, le numéro de série, la date d'achat,
   la date de fin de garantie et le statut.
2. **Given** une garantie dont la fin est éloignée, **When** la liste s'affiche, **Then**
   le statut est « sous garantie ».
3. **Given** une garantie qui se termine dans le délai fixé par l'administrateur,
   **When** la liste s'affiche, **Then** le statut est « bientôt expirée ».
4. **Given** une garantie dont la date de fin est passée, **When** la liste s'affiche,
   **Then** le statut est « expirée ».
5. **Given** un statut, **When** il s'affiche, **Then** il est exprimé par un texte, et
   pas seulement par une couleur.
6. **Given** un appareil, **When** le client ouvre sa fiche, **Then** il dispose des
   actions : déclarer une panne, consulter les notices et tutoriels du modèle, commander
   les consommables compatibles.
7. **Given** un client sans appareil enregistré, **When** il ouvre la rubrique, **Then**
   un message l'explique et lui propose d'enregistrer un appareil.

---

### User Story 3 - Déclarer une panne et suivre sa demande (Priority: P1)

Depuis la fiche d'un appareil, le médecin déclare une panne : il la décrit, joint des photos,
et envoie. Il suit ensuite l'avancement et échange avec l'équipe au même endroit.

**Why this priority**: une panne immobilise le cabinet. La déclarer en partant de l'appareil
évite les allers-retours et fait gagner du temps à l'équipe.

**Independent Test**: déclarer une panne sur un appareil sous garantie, faire évoluer la
demande dans le back-office par tous ses statuts, échanger un message dans chaque sens, et
vérifier l'affichage et les notifications côté client.

**Acceptance Scenarios**:

1. **Given** la fiche d'un appareil, **When** le client choisit « Déclarer une panne »,
   **Then** le formulaire reprend le modèle, le numéro de série et l'état de la garantie,
   et demande une description et, s'il le souhaite, des photos.
2. **Given** le formulaire, **When** il s'affiche, **Then** il rappelle de ne joindre
   aucune donnée de patient, notamment sur les photos d'écran.
3. **Given** une demande envoyée, **When** elle est enregistrée, **Then** elle prend le
   statut « reçue », le client reçoit une confirmation avec un numéro de demande, et
   l'équipe est alertée.
4. **Given** une demande, **When** l'équipe fait évoluer son statut (diagnostic, en
   réparation, appareil de prêt envoyé, résolue), **Then** le client le voit dans « Mon
   compte » et en est prévenu par email.
5. **Given** une demande en cours, **When** le client ou l'équipe écrit un message,
   **Then** il apparaît dans le fil de la demande et l'autre partie en est prévenue.
6. **Given** un appareil sous garantie, **When** la demande s'affiche, **Then** le client
   voit que la réparation est couverte ; pour un appareil hors garantie, il voit qu'elle
   fera l'objet d'un devis.
7. **Given** une demande résolue, **When** le client consulte son historique, **Then** il
   la retrouve avec tous ses échanges.
8. **Given** un client sans droits d'assistance actifs, **When** il déclare une panne,
   **Then** la demande est acceptée comme pour tout autre client.

---

### User Story 4 - Enregistrer un appareil acheté ailleurs (Priority: P2)

Le médecin possède déjà des appareils achetés avant, ou ailleurs. Il les enregistre lui-même
avec une preuve d'achat ; l'administrateur valide.

**Why this priority**: tous les appareils du cabinet sont ainsi réunis au même endroit, et
ExploCardio.fr connaît le parc de ses clients. Le module reste utile sans cela.

**Independent Test**: enregistrer un appareil avec une preuve d'achat, le valider dans le
back-office et vérifier son affichage ; tenter d'enregistrer un numéro de série déjà pris
par un autre client et constater le refus.

**Acceptance Scenarios**:

1. **Given** le formulaire d'enregistrement, **When** le client renseigne le modèle, le
   numéro de série, la date d'achat, joint une preuve d'achat (PDF ou photo) et valide,
   **Then** l'appareil apparaît dans sa liste avec la mention « en attente de validation ».
2. **Given** un enregistrement en attente, **When** l'administrateur le valide, **Then**
   l'appareil est confirmé, sa garantie est affichée et le client est prévenu.
3. **Given** un enregistrement en attente, **When** l'administrateur le refuse en indiquant
   le motif, **Then** le client est prévenu et peut corriger et renvoyer sa demande.
4. **Given** un numéro de série déjà enregistré par un autre client, **When** le client
   valide, **Then** l'enregistrement est refusé avec un message l'invitant à contacter
   l'équipe, sans rien révéler de l'autre client.
5. **Given** un numéro de série déjà présent sur son propre compte, **When** le client
   valide, **Then** il est informé que l'appareil est déjà enregistré.
6. **Given** un fichier trop lourd ou d'un format non accepté, **When** le client le
   joint, **Then** le formulaire l'explique et conserve le reste de la saisie.
7. **Given** un modèle absent de la liste proposée, **When** le client choisit « Autre »,
   **Then** il peut saisir la marque et le modèle.

---

### User Story 5 - Ne pas rester sans appareil pendant la panne (Priority: P2)

Quand il déclare une panne, le médecin se voit proposer une solution de remplacement pour
continuer à travailler pendant la réparation : un prêt gratuit si son appareil est sous
garantie, une mise à disposition Express payante sinon.

**Why this priority**: c'est ce qui rend le SAV « réactif » et donne sa valeur à la
garantie, mais la demande de SAV peut être traitée sans cette proposition.

**Independent Test**: déclarer une panne sur un appareil sous garantie, accepter le prêt,
enregistrer son envoi puis la résolution, et vérifier les instructions de retour ; déclarer
une panne sur un appareil hors garantie et vérifier la proposition de mise à disposition
payante.

**Acceptance Scenarios**:

1. **Given** une panne déclarée sur un appareil sous garantie et un appareil équivalent
   disponible, **When** la demande est envoyée, **Then** un prêt gratuit est proposé au
   client, avec ses conditions de retour, que le client ait ou non des droits d'assistance.
2. **Given** un prêt proposé, **When** le client l'accepte, **Then** l'équipe est alertée
   pour l'expédier ; s'il le refuse, la demande suit son cours sans prêt.
3. **Given** un appareil de prêt expédié, **When** l'équipe l'enregistre avec son numéro de
   série, **Then** la demande passe au statut « appareil de prêt envoyé », l'appareil
   devient indisponible dans le parc de location, et le client voit le suivi du colis.
4. **Given** une panne déclarée sur un appareil hors garantie, **When** la demande est
   envoyée, **Then** une mise à disposition Express payante est proposée, avec son prix HT
   et un lien vers le parcours de F05.
5. **Given** aucun appareil équivalent disponible, **When** la demande est envoyée,
   **Then** aucune proposition n'est affichée, le client est informé du délai et l'équipe
   est alertée.
6. **Given** une demande résolue avec un prêt en cours, **When** elle passe à « résolue »,
   **Then** le client reçoit les instructions, la date limite et l'étiquette de retour de
   l'appareil prêté.
7. **Given** un appareil de prêt non rendu à la date limite, **When** le retard est
   constaté, **Then** les rappels et la règle de valeur de remplacement de F05
   s'appliquent.

---

### User Story 6 - Tout faire depuis la fiche de l'appareil (Priority: P2)

Depuis la fiche d'un appareil, le médecin accède aux notices et tutoriels de ce modèle et
commande ses consommables compatibles.

**Why this priority**: l'appareil devient le point d'entrée du réassort et de l'aide, ce
qui sert aussi le programme de fidélité. Le module fonctionne sans ces raccourcis.

**Independent Test**: depuis la fiche d'un appareil, ouvrir une notice puis ajouter un
consommable compatible au panier.

**Acceptance Scenarios**:

1. **Given** la fiche d'un appareil, **When** le client ouvre « Notices et tutoriels »,
   **Then** il voit les documents et tutoriels rattachés à ce modèle.
2. **Given** la fiche d'un appareil, **When** le client ouvre « Consommables compatibles »,
   **Then** il voit les consommables de ce modèle avec leur prix HT et un ajout rapide au
   panier.
3. **Given** un modèle « Autre » sans fiche au catalogue, **When** la fiche de l'appareil
   s'affiche, **Then** ces deux raccourcis n'apparaissent pas.

---

### User Story 7 - Être prévenu avant la fin de la garantie (Priority: P2)

Quelque temps avant l'expiration d'une garantie, le médecin reçoit un email qui le lui
rappelle.

**Why this priority**: le rappel évite une mauvaise surprise et ouvre une occasion de
contact, mais il n'est pas indispensable au suivi.

**Independent Test**: avec une garantie se terminant dans le délai de rappel, vérifier
l'envoi d'un seul rappel par échéance.

**Acceptance Scenarios**:

1. **Given** une garantie dont la fin approche, **When** le délai de rappel fixé par
   l'administrateur est atteint, **Then** le client reçoit un email indiquant l'appareil et
   la date de fin.
2. **Given** un rappel déjà envoyé pour une échéance, **When** le temps passe, **Then**
   il n'est pas renvoyé pour cette même échéance.
3. **Given** un client qui a refusé ces rappels dans ses préférences, **When** l'échéance
   approche, **Then** aucun email ne lui est envoyé.

---

### User Story 8 - Traiter le SAV et les enregistrements (Priority: P2)

Dans le back-office du site, l'administrateur valide les enregistrements manuels et traite
les demandes de SAV. L'équipe règle les durées de garantie, saisit les numéros de série et
corrige ou transfère les appareils dans Odoo.

**Why this priority**: sans ces opérations, ni l'ajout automatique ni le SAV ne
fonctionnent.

**Independent Test**: valider un enregistrement manuel et traiter une demande de SAV
jusqu'à sa résolution dans le back-office ; dans la base fictive du connecteur Odoo,
modifier une durée de garantie et transférer un appareil, et vérifier l'affichage côté
client.

**Acceptance Scenarios**:

1. **Given** une durée de garantie modifiée dans Odoo pour un produit, **When** un
   appareil est livré ensuite, **Then** la nouvelle durée s'applique, sans modifier les
   garanties déjà en cours.
2. **Given** les demandes de SAV, **When** l'administrateur ouvre la liste dans le
   back-office, **Then** il peut la filtrer par statut, par client, par modèle et par
   ancienneté.
3. **Given** une demande, **When** il l'ouvre, **Then** il voit l'appareil, sa garantie,
   les droits d'assistance du client, la description, les photos et le fil des échanges.
4. **Given** un numéro de série corrigé ou un appareil transféré dans Odoo, **When** le
   site le lit, **Then** la rubrique des clients concernés est mise à jour.
5. **Given** le back-office du site, **When** un administrateur cherche à modifier une
   durée de garantie ou un numéro de série, **Then** aucun écran ne le permet.
6. **Given** toute validation, tout refus et tout changement de statut d'une demande,
   **When** l'action est effectuée, **Then** elle est journalisée avec son auteur et sa
   date.

---

### Edge Cases

- Numéro de série saisi avec des espaces, des tirets ou une casse différente : il est
  reconnu comme le même numéro.
- Deux clients enregistrent le même numéro de série au même instant : un seul
  enregistrement aboutit.
- Appareil acheté sur le site, déjà enregistré à la main par erreur par le même client :
  l'ajout automatique complète la fiche existante, sans doublon.
- Appareil acheté sur le site, dont le numéro figure déjà sur le compte d'un autre client :
  l'administrateur est alerté avant l'expédition.
- Date d'achat déclarée dans le futur, ou très ancienne : la première est refusée, la
  seconde est acceptée et la garantie apparaît « expirée ».
- Garantie dont la date de fin tombe aujourd'hui : l'appareil est encore sous garantie
  jusqu'à la fin de la journée.
- Appareil en mise à disposition (F05) : il n'apparaît pas dans les garanties, puisqu'il
  appartient à ExploCardio.fr, mais une panne peut être déclarée depuis la location.
- Deuxième déclaration de panne sur un appareil ayant déjà une demande en cours : le client
  est orienté vers la demande existante.
- Photo jointe montrant une donnée de patient : l'équipe peut la supprimer de la demande,
  et la suppression est tracée.
- Compte supprimé (RGPD) : les appareils et demandes sont détachés de la personne ; les
  numéros de série redeviennent enregistrables.
- Client qui veut retirer un appareil qu'il ne possède plus : il peut le retirer de sa
  liste ; l'historique des demandes de SAV est conservé.
- Garantie qui expire pendant qu'un prêt est en cours : le prêt reste gratuit jusqu'à la
  résolution de la demande.
- Appareil échangé contre un neuf dans le cadre du SAV : le nouvel appareil remplace
  l'ancien dans la rubrique, selon l'hypothèse « Échange standard ».

## Requirements *(mandatory)*

### Functional Requirements

**Rubrique « Mes appareils & garanties »**

- **FR-001** : « Mon compte » DOIT comporter une rubrique « Mes appareils & garanties »
  listant les appareils enregistrés du client.
- **FR-002** : Chaque appareil DOIT y afficher : photo, modèle, numéro de série, date
  d'achat, date de fin de garantie et statut.
- **FR-003** : Le statut DOIT être « sous garantie », « bientôt expirée » ou « expirée ». Le
  délai définissant « bientôt expirée » DOIT être réglable par l'administrateur.
- **FR-004** : Le statut DOIT être exprimé par un texte, jamais par la seule couleur.

**Ajout automatique**

- **FR-005** : Le numéro de série de chaque équipement DOIT être saisi ou scanné dans Odoo
  au moment de l'expédition, et lu par le site via le connecteur Odoo. L'exigence d'un
  numéro de série avant l'expédition relève du paramétrage d'Odoo.
- **FR-006** : Un appareil acheté sur le site DOIT apparaître dans la rubrique du client dès
  la livraison, sans aucune saisie de sa part.
- **FR-007** : Chaque exemplaire DOIT avoir sa propre fiche et son propre numéro de série.
- **FR-008** : Seuls les produits suivis par numéro de série dans Odoo DOIVENT entrer dans
  la rubrique.

**Enregistrement manuel**

- **FR-009** : Le client DOIT pouvoir enregistrer un appareil acheté ailleurs en indiquant
  le modèle, le numéro de série, la date d'achat, et en joignant une preuve d'achat (PDF ou
  photo).
- **FR-010** : Un enregistrement manuel est une demande : il DOIT être validé ou refusé par
  l'administrateur dans le back-office du site, le client étant prévenu de la décision et,
  en cas de refus, de son motif. Une fois validé, l'appareil et sa garantie DOIVENT être
  enregistrés dans Odoo par son connecteur.
- **FR-011** : Un numéro de série NE DOIT être rattaché qu'à un seul compte client. Un
  numéro déjà enregistré par un autre client DOIT être refusé, avec un message invitant à
  contacter l'équipe et sans aucune information sur l'autre client.

**Garantie**

- **FR-012** : La durée de garantie DOIT être fixée dans Odoo pour chaque produit (base fictive
  en phase 1, principe VI).
  La garantie d'un appareil acheté sur le site DOIT courir à partir de sa date de
  livraison.
- **FR-013** : Aucune extension de garantie n'est vendue dans la première version. La fiche
  de garantie DOIT néanmoins pouvoir porter une extension (durée ajoutée, origine), afin
  qu'elle puisse être proposée plus tard sans reprise des garanties existantes.
- **FR-014** : Un changement de durée de garantie d'un produit NE DOIT PAS modifier les
  garanties déjà en cours.
- **FR-015** : L'équipe DOIT pouvoir corriger dans Odoo la date de fin de garantie d'un
  appareil, avec un motif obligatoire ; le site affiche la date corrigée.

**Actions depuis l'appareil**

- **FR-016** : Depuis chaque appareil, le client DOIT pouvoir déclarer une panne, consulter
  les notices et tutoriels du modèle, et commander les consommables compatibles.
- **FR-017** : Les notices, tutoriels et consommables affichés DOIVENT être ceux du modèle
  de l'appareil (F03, F09).

**Demandes de SAV**

- **FR-018** : La déclaration de panne DOIT recueillir une description et, au choix du
  client, des photos, et reprendre automatiquement l'appareil et l'état de sa garantie.
- **FR-019** : Le formulaire DOIT avertir de ne joindre aucune donnée de patient, et
  l'équipe DOIT pouvoir supprimer une pièce jointe qui en contiendrait.
- **FR-020** : Une demande de SAV DOIT porter l'un des statuts : reçue, diagnostic, en
  réparation, appareil de prêt envoyé, résolue, annulée.
- **FR-021** : Le client DOIT voir le statut de ses demandes dans « Mon compte » et être
  prévenu par email de chaque changement.
- **FR-022** : Le client et l'équipe DOIVENT pouvoir échanger des messages dans le fil de la
  demande, chaque partie étant prévenue d'un nouveau message.
- **FR-023** : La demande DOIT indiquer au client si la réparation est couverte par la
  garantie ou si elle fera l'objet d'un devis.
- **FR-024** : Tout client DOIT pouvoir déclarer une panne sur un appareil enregistré, qu'il
  ait ou non des droits d'assistance actifs. Sous garantie, la réparation est couverte ;
  hors garantie, elle fait l'objet d'un devis.
- **FR-037** : Les droits d'assistance (F06) NE DOIVENT PAS conditionner l'ouverture d'une
  demande de SAV. Ils conditionnent seulement la hotline, l'aide à l'utilisation et la
  priorité de traitement de la demande.
- **FR-025** : L'équipe d'assistance DOIT voir, sur chaque demande, l'appareil, sa garantie
  et l'état des droits d'assistance du client (F06).

**Remplacement pendant la panne**

- **FR-026** : À la déclaration d'une panne, une solution de remplacement DOIT être proposée
  automatiquement quand un appareil équivalent est disponible en mise à disposition.
- **FR-027** : Pour un appareil sous garantie, la solution proposée DOIT être le prêt gratuit
  d'un appareil équivalent, sans condition de droits d'assistance. Pour un appareil hors
  garantie, la solution proposée DOIT être une mise à disposition Express payante, au tarif
  normal (F05).
- **FR-038** : Le prêt gratuit DOIT être accepté par le client avant tout envoi. L'appareil
  prêté est affecté dans Odoo depuis le parc de location, où il devient indisponible avec
  le motif « prêt SAV ». Aucun kit d'accessoires n'est facturé pour un prêt.
- **FR-039** : À la résolution de la demande, le client DOIT recevoir les instructions, la
  date limite et l'étiquette préaffranchie pour rendre l'appareil prêté. Un prêt non rendu
  suit les règles de rappel et de valeur de remplacement de F05, annoncées au client
  lorsqu'il accepte le prêt.
- **FR-028** : L'envoi d'un appareil de prêt DOIT être rattaché à la demande de SAV, avec son
  numéro de série et son suivi, lus dans Odoo où l'équipe enregistre l'expédition.

**Rappels**

- **FR-029** : Le client DOIT recevoir un rappel par email avant l'expiration de chaque
  garantie, une seule fois par échéance, selon un délai fixé par l'administrateur (envoi
  par F10).
- **FR-030** : Le client DOIT pouvoir refuser ces rappels dans ses préférences de
  communication.

**Données, administration et traçabilité**

- **FR-031** : Les appareils, leurs numéros de série et leurs garanties DOIVENT être tenus
  par Odoo et lus par son connecteur (base fictive en phase 1, principe III). Les demandes
  de SAV et les enregistrements manuels en attente sont des demandes, gérées par le site
  dans son back-office.
- **FR-032** : Le back-office du site DOIT permettre de valider les enregistrements manuels
  et de traiter les demandes de SAV. Les durées de garantie, la saisie des numéros de
  série, la correction des garanties et le transfert d'un appareil se font dans Odoo
  (principes III et VI).
- **FR-033** : Les preuves d'achat et les photos DOIVENT n'être accessibles qu'au client
  concerné et à l'équipe, et être supprimées avec le compte.
- **FR-034** : Toute validation, tout refus, toute correction, tout transfert et tout
  changement de statut DOIVENT être journalisés avec leur auteur et leur date.

**Charte, accessibilité et langue**

- **FR-035** : Tous les écrans et emails de F07 DOIVENT respecter la charte, le niveau WCAG
  2.2 AA, le vouvoiement et le ton sobre du site.
- **FR-036** : Aucun champ de F07 NE DOIT inviter à saisir une donnée de patient.

### Key Entities

- **Appareil enregistré** : compte client, modèle (produit du catalogue ou « Autre »),
  numéro de série, date d'achat, origine (acheté sur le site, enregistré à la main), état
  (confirmé, en attente de validation, refusé, retiré).
- **Garantie** : appareil, date de début, durée, date de fin, extension éventuelle (non
  vendue en V1), statut calculé, corrections éventuelles avec leur motif.
- **Durée de garantie du produit** : durée standard fixée par l'administrateur, et sa
  période d'application.
- **Preuve d'achat** : fichier joint à un enregistrement manuel.
- **Demande de SAV** : appareil, client, numéro de demande, description, photos, statut,
  couverture (sous garantie ou sur devis), dates, appareil de prêt éventuel.
- **Prêt SAV** : demande concernée, appareil du parc prêté, acceptation du client, dates
  d'envoi, limite de retour et retour.
- **Message de SAV** : auteur (client ou équipe), texte, pièces jointes, date.
- **Rappel de garantie** : garantie concernée, date d'envoi.
- **Journal des garanties** : validations, refus, corrections, transferts, changements de
  statut.

## Success Criteria *(mandatory)*

### Measurable Outcomes

Chaque critère est marqué [Phase 1] s'il se vérifie avec les connecteurs de démonstration,
ou [Phase 3] s'il nécessite les vrais services. Sauf mention contraire, les scénarios
d'acceptation des parcours se vérifient en phase 1.

- **SC-001** [Phase 1] : 100 % des équipements achetés sur le site apparaissent dans la rubrique du
  client à la livraison, sans aucune saisie de sa part.
- **SC-002** [Phase 1] : Un numéro de série déjà enregistré par un autre client est refusé dans 100 %
  des cas, avec le message invitant à contacter l'équipe, y compris en cas d'enregistrements
  simultanés.
- **SC-003** [Phase 1] : Aucun numéro de série n'est rattaché à deux comptes clients en même temps.
- **SC-004** [Phase 1] : Un client déclare une panne en moins de 3 minutes en partant de la fiche de
  l'appareil, sans ressaisir le modèle ni le numéro de série.
- **SC-005** [Phase 1] : Un client enregistre un appareil acheté ailleurs en moins de 4 minutes.
- **SC-006** [Phase 1] : 95 % des enregistrements manuels sont validés ou refusés en moins de deux
  jours ouvrés.
- **SC-007** [Phase 1] : Le client est prévenu de chaque changement de statut d'une demande de SAV en
  moins de 5 minutes.
- **SC-008** [Phase 1] : Le statut de garantie affiché est exact pour 100 % des appareils testés, y
  compris le jour même de l'échéance.
- **SC-009** [Phase 1] : Chaque garantie arrivant à échéance donne lieu à un rappel et un seul, sauf
  refus du client.
- **SC-010** [Phase 3] : Aucune expédition d'équipement n'est validée dans Odoo sans numéro de série.
- **SC-011** [Phase 1] : Un audit des écrans de F07 ne relève aucune non-conformité WCAG 2.2 AA.

## Assumptions

Les points marqués « confirmé » n'étaient pas tranchés dans la demande initiale ; ils ont été
validés par la responsable du projet le 2026-10-13.

- **Durée de garantie par défaut (confirmé)** : 24 mois si rien n'est fixé dans Odoo pour
  un produit. Les durées réelles sont des données à saisir avant la mise en
  ligne.
- **Délai « bientôt expirée » (confirmé)** : 60 jours avant la date de fin, réglable. Le
  rappel par email part au même moment.
- **Garantie d'un appareil acheté ailleurs (confirmé)** : ExploCardio.fr ne garantit pas
  un appareil qu'il n'a pas vendu. La garantie affichée est celle du vendeur ou du
  fabricant, calculée à partir de la date d'achat déclarée et vérifiée par
  l'administrateur ; la fiche le précise. La formulation est à valider par le conseil
  juridique d'ExploCardio.fr.
- **Modèles acceptés à la main (confirmé)** : tout appareil du périmètre du site, choisi
  dans la liste des modèles du catalogue ou saisi en « Autre ».
- **Réparation hors garantie (confirmé)** : elle fait l'objet d'un devis communiqué par
  l'équipe dans le fil de la demande. Son acceptation et son paiement ne sont pas gérés par
  F07.
- **Appareils en mise à disposition (confirmé)** : ils sont suivis dans les locations
  (F05), pas dans les garanties. Une panne se déclare depuis la location et suit le même
  circuit de SAV.
- **Échange standard (confirmé)** : si l'équipe remplace l'appareil par un autre,
  le nouveau numéro de série est rattaché à la fiche dans Odoo ; la garantie d'origine
  continue de courir.
- **Revente et cession (confirmé)** : le transfert d'un appareil d'un compte à un autre
  est fait dans Odoo par l'équipe, à la demande des clients.
- **Pièces jointes (confirmé)** : PDF, JPEG ou PNG, 10 Mo au plus par fichier, 5 photos
  au plus par demande.
- **Extension de garantie** : non proposée en V1 ; elle pourra l'être plus tard, à l'achat
  ou après.
- **Parc de prêt** : les appareils prêtés proviennent du parc de location de F05. Chaque
  prêt réduit donc la disponibilité de la mise à disposition Express ; le dimensionnement
  du parc est à la charge d'ExploCardio.fr.
- **Appareils garantis concernés par le prêt** : ceux qu'ExploCardio.fr a vendus. Un
  appareil acheté ailleurs n'ouvre pas droit au prêt gratuit ; la mise à disposition
  Express payante lui est proposée.
- **Numéros de série à l'expédition** : saisis dans Odoo, où se font les expéditions. Le
  « scan » désigne la lecture du code-barres de l'appareil.
- **Emails** : les emails de F07, dont les rappels, passent par le connecteur emailing
  (F10) ; ils sont simulés en phase 1.
- **Notices et tutoriels** : fournis par F09 ; tant que F09 n'est pas livré, seuls les
  documents rattachés aux fiches produit (F03) sont proposés.
- **Données de gestion** : appareils, numéros de série et garanties sont tenus par Odoo
  (base fictive en phase 1, principe III) ; les demandes de SAV et les enregistrements
  manuels en attente sont gérés par le site.
- **Périmètre** : site en français, professionnels de santé de France métropolitaine, aucune
  donnée de patient.
