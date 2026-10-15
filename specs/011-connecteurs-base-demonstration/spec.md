# Feature Specification: F11 — Connecteurs et base de démonstration (phase 1)

**Feature Branch**: `011-connecteurs-base-demonstration`

**Created**: 2026-10-14

**Status**: Draft

**Input**: User description: "F11 — Connecteurs et base de démonstration (phase 1) : un connecteur par service externe (Odoo, Stripe, plateforme PCA, agenda, emailing) avec un mode démonstration et un mode réel choisis par configuration ; mini base fictive reprenant les données et les paramètres commerciaux d'Odoo ; simulations des paiements, emails, accès Cloud, agenda, notifications et factures ; site de démonstration protégé. Objectif : construire et critiquer tout le site sans aucun service externe branché, et préparer le branchement des vrais services sans toucher aux pages. Cette spec remplace l'ancienne F11."

## Contexte et objectif

La constitution (v2.1.0, principe III) organise le projet en trois phases. F11 rend possible
la **phase 1** : tout le site est construit, montré et critiqué sans qu'aucun service externe
ne soit branché.

F11 poursuit deux objectifs :

- **construire et critiquer tout le site** avec des données fictives réalistes, comme s'il
  était en service : catalogue, comptes, commandes, locations, fidélité, demandes de
  financement et de devis ;
- **préparer la phase 2** : chaque service externe est utilisé à travers un connecteur qui,
  le moment venu, sera basculé du mode démonstration au mode réel par configuration, sans
  modifier aucune page.

F11 livre les quatre connecteurs et leur mode démonstration, la base de démonstration, ses
outils de remplissage, de réinitialisation et de réglage, les simulations, et le site de
démonstration protégé.

**Hors périmètre de F11** : le mode réel des connecteurs et leur branchement sur les vrais
services (F14) ; le banc de tests sur les services réels et la mise en ligne (F15) ; le
contenu fonctionnel des parcours, défini par F01 à F10 ; le back-office complet (F13) ; la
ligne WhatsApp Business, qui n'a pas de connecteur (son numéro est un paramètre du
back-office, F09) ; le SAV et la prise de rendez-vous, gérés hors du site.

**Lien avec les autres modules** : dans les specs F01 à F10, « Odoo », « Stripe », « la
plateforme PCA » et « l'emailing » désignent les connecteurs de F11. Chaque
module décrit son comportement en phase 1 ; F11 fournit ce qui le rend possible.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Parcourir tout le site comme s'il était en service (Priority: P1)

L'équipe d'ExploCardio.fr ouvre le site de démonstration. Elle s'inscrit, commande, paie,
loue un appareil, consulte ses bons d'achat et ses droits d'assistance, demande un
financement ou un devis. Tout fonctionne de bout en bout, avec des données fictives crédibles.

**Why this priority**: c'est la raison d'être de la phase 1 : critiquer le site réel, pas
des maquettes, avant d'engager le moindre branchement.

**Independent Test**: avec tous les connecteurs en mode démonstration, dérouler chacun des
parcours (inscription, achat, mise à disposition, fidélité, demande de financement ou de
devis)
du début à la fin et vérifier qu'aucun n'est bloqué.

**Acceptance Scenarios**:

1. **Given** tous les connecteurs en mode démonstration, **When** un testeur déroule les
   parcours d'inscription, d'achat, de mise à disposition, de fidélité et de demande de
   financement ou de devis, **Then** chacun aboutit de bout en bout.
2. **Given** la base de démonstration remplie, **When** un testeur parcourt le catalogue,
   **Then** il voit les marques et modèles de la brochure, avec leurs vraies références
   quand elles sont connues, et des prix HT plausibles.
3. **Given** la base remplie, **When** un testeur se connecte avec l'un des comptes
   fictifs fournis, **Then** il retrouve un historique cohérent : commandes, factures,
   locations, bons d'achat et droits d'assistance.
4. **Given** les cas utiles prévus dans la base (client sans droits d'assistance, location
   en retard, produit en rupture), **When** un testeur se connecte avec
   le compte correspondant ou ouvre le produit concerné, **Then** le site présente ce cas
   tel que les specs le décrivent.
5. **Given** une commande payée en démonstration, **When** le testeur ouvre « Mon compte »,
   **Then** il trouve la commande et sa facture PDF portant la mention « FICTIVE ».
6. **Given** une règle commerciale de la base (taux de bons d'achat, seuil des droits
   d'assistance, tarif de mise à disposition), **When** une commande de démonstration la
   met en jeu, **Then** le résultat est celui qu'Odoo produira avec les mêmes paramètres.

---

### User Story 2 - Ne toucher à aucun service réel (Priority: P1)

Pendant toute la phase 1, aucune donnée ne part vers Odoo, Stripe, la plateforme PCA ou
l'outil d'emailing. Aucun médecin réel ne reçoit d'email, aucun paiement
réel n'a lieu, aucun accès Cloud réel n'est ouvert.

**Why this priority**: c'est un critère d'acceptation et une règle de la constitution. Un
email réel envoyé à un médecin depuis la démonstration, ou une donnée fictive arrivée dans
Odoo, serait une faute grave.

**Independent Test**: avec tous les connecteurs en mode démonstration, dérouler tous les
parcours en observant les échanges du site avec l'extérieur, et vérifier qu'aucun n'atteint
un des quatre services.

**Acceptance Scenarios**:

1. **Given** tous les connecteurs en mode démonstration, **When** tous les parcours sont
   déroulés, **Then** aucun échange n'a lieu avec Odoo, Stripe, la plateforme PCA ou l'outil
   d'emailing.
2. **Given** un email ou une notification déclenché en démonstration, **When** il est
   produit, **Then** il n'est envoyé à personne et apparaît dans la boîte de
   démonstration.
3. **Given** un connecteur en mode démonstration, **When** la configuration ne fournit
   aucun identifiant du service réel, **Then** le connecteur fonctionne normalement.
4. **Given** un connecteur passé en mode réel, **When** il s'apprête à transmettre une
   donnée issue de la base de démonstration, **Then** la transmission est refusée et
   signalée.

---

### User Story 3 - Basculer un connecteur sans toucher aux pages (Priority: P1)

En phase 2, l'équipe technique passera un connecteur en mode réel par simple configuration.
Pour que ce soit possible, chaque connecteur se comporte exactement de la même façon dans
ses deux modes, et des tests de contrat le prouvent dès la phase 1.

**Why this priority**: c'est ce qui rend la phase 2 mécanique. Deux critères d'acceptation
en dépendent.

**Independent Test**: changer le mode d'un connecteur dans la configuration et vérifier
qu'aucune page ni aucun composant n'a été modifié ; exécuter les tests de contrat de chaque
connecteur en mode démonstration.

**Acceptance Scenarios**:

1. **Given** un connecteur, **When** son mode est changé dans la configuration, **Then**
   aucune page ni aucun composant n'a besoin d'être modifié.
2. **Given** plusieurs connecteurs, **When** l'un est placé en mode réel et les autres
   laissés en démonstration, **Then** le site fonctionne avec cette combinaison.
3. **Given** chaque connecteur, **When** ses tests de contrat sont exécutés en mode
   démonstration, **Then** ils passent tous.
4. **Given** les tests de contrat d'un connecteur, **When** ils seront rejoués en mode réel
   (F14), **Then** ils pourront l'être tels quels, sans réécriture.
5. **Given** une erreur prévue par le contrat (service indisponible, paiement refusé,
   rupture de stock), **When** elle se produit en démonstration, **Then** le connecteur la
   renvoie sous la même forme qu'en mode réel.
6. **Given** une page ou un composant, **When** on examine ce qu'il utilise, **Then** il
   n'appelle aucun service externe directement et ignore quel mode est actif.

---

### User Story 4 - Repartir d'un état propre (Priority: P1)

Après une séance de critique où l'on a passé des commandes, loué des appareils et modifié
des prix, l'administrateur réinitialise la base. En moins d'une minute, le site retrouve son
état de départ.

**Why this priority**: c'est un critère d'acceptation. Sans réinitialisation rapide, chaque
séance de démonstration hérite du désordre de la précédente.

**Independent Test**: après une série de commandes, de locations et de modifications de
prix, lancer la réinitialisation depuis le back-office puis par une action unique de
l'équipe technique, et vérifier le retour à l'état de départ et sa durée.

**Acceptance Scenarios**:

1. **Given** une base modifiée par une séance de démonstration, **When** l'administrateur
   lance la réinitialisation depuis le back-office et la confirme, **Then** le site
   retrouve son état de départ en moins d'une minute.
2. **Given** un environnement neuf, **When** l'équipe technique lance le remplissage par
   une action unique, **Then** la base de démonstration est créée complète.
3. **Given** une réinitialisation, **When** elle s'achève, **Then** la base de démonstration
   et l'activité de test (comptes créés, demandes, boîte de démonstration) sont remises à
   zéro, les contenus et paramètres du site sont intacts, et les cinq comptes de
   démonstration sont prêts à l'emploi.
4. **Given** une réinitialisation, **When** elle est demandée, **Then** elle exige une
   confirmation explicite et est journalisée avec son auteur et sa date.
5. **Given** un connecteur en mode réel, **When** quelqu'un tente une réinitialisation,
   **Then** elle est impossible.

---

### User Story 5 - Tester des variantes de prix et de règles (Priority: P2)

Pendant la critique, l'administrateur veut voir l'effet d'un autre prix, d'un stock épuisé
ou d'un autre taux de bons d'achat. Un écran simple du back-office, présent en mode
démonstration seulement, le lui permet.

**Why this priority**: la critique porte aussi sur l'offre ; pouvoir l'essayer sans
développeur accélère les décisions. Le site reste démontrable sans cet écran.

**Independent Test**: depuis cet écran, modifier un prix, un stock et un taux de bons
d'achat, et vérifier leur effet sur le site ; passer le connecteur Odoo en mode réel et
vérifier que l'écran a disparu.

**Acceptance Scenarios**:

1. **Given** le connecteur Odoo en mode démonstration, **When** l'administrateur ouvre
   l'écran de démonstration du back-office, **Then** il peut modifier les prix, les stocks
   et les paramètres commerciaux fictifs (tarifs de mise à disposition, remises,
   promotions, règles des bons d'achat et des droits d'assistance).
2. **Given** une valeur modifiée, **When** la page concernée est affichée, **Then** la
   nouvelle valeur s'applique aussitôt.
3. **Given** des paramètres incohérents (paliers qui se chevauchent, prix négatif), **When**
   l'administrateur les enregistre, **Then** l'enregistrement est refusé avec
   l'explication.
4. **Given** le connecteur Odoo en mode réel, **When** l'administrateur cherche cet écran,
   **Then** il n'existe plus : ces réglages se font dans Odoo.
5. **Given** un utilisateur qui n'est pas administrateur, **When** il cherche cet écran,
   **Then** l'accès lui est refusé.

---

### User Story 6 - Relire les emails et les notifications (Priority: P2)

Chaque email que le site enverrait à un médecin, et chaque notification destinée à l'équipe,
apparaît dans une boîte de démonstration du back-office, où l'on peut le relire tel qu'il
serait reçu.

**Why this priority**: les emails font partie de l'expérience à critiquer, mais aucun ne
doit partir réellement en phase 1.

**Independent Test**: déclencher une inscription, une commande et une demande de financement,
et
vérifier dans la boîte de démonstration les emails et les notifications correspondants.

**Acceptance Scenarios**:

1. **Given** un email déclenché par un parcours, **When** il est produit, **Then** il
   apparaît dans la boîte de démonstration avec son destinataire, son objet, sa date et
   son rendu à la charte.
2. **Given** une notification d'équipe (email ou SMS), **When** elle est produite,
   **Then** elle apparaît dans la boîte de démonstration, distinguée des emails aux
   clients.
3. **Given** la boîte de démonstration, **When** l'administrateur la filtre par
   destinataire, par type ou par date, **Then** il retrouve un message donné.
4. **Given** le numéro WhatsApp, **When** il s'affiche en démonstration, **Then** c'est un
   numéro fictif, et les boutons « Appeler » et « Écrire sur WhatsApp » ouvrent un lien de
   démonstration qui ne contacte personne.

---

### User Story 7 - Simuler les paiements et les imprévus (Priority: P2)

Lors d'une commande de démonstration, un écran de paiement de démonstration permet de choisir
l'issue : paiement accepté, refusé, ou avec authentification forte, y compris par carte
American Express. On peut aussi simuler l'indisponibilité d'un service.

**Why this priority**: les cas d'erreur des specs (paiement refusé, service indisponible,
confirmation tardive) doivent pouvoir être montrés et testés sans les vrais services.

**Independent Test**: passer trois commandes en choisissant successivement un paiement
accepté, refusé et avec authentification forte ; souscrire puis résilier une location ;
rembourser une commande ; simuler l'indisponibilité d'un service.

**Acceptance Scenarios**:

1. **Given** l'écran de paiement de démonstration, **When** le testeur choisit l'issue
   « accepté », « refusé » ou « authentification forte », pour une carte Visa, Mastercard
   ou American Express, **Then** le site réagit exactement comme le décrit F04 pour cette
   issue.
2. **Given** une mise à disposition souscrite en démonstration, **When** une échéance
   mensuelle est simulée, puis la résiliation, **Then** le prélèvement, la facture
   « FICTIVE » et l'arrêt des échéances sont simulés comme le décrit F05.
3. **Given** un remboursement décidé en démonstration, **When** il est enregistré, **Then**
   le remboursement est simulé, l'avoir « FICTIF » produit, et « Mon compte » mis à jour.
4. **Given** l'ouverture ou la fermeture d'un accès au logiciel Cloud, **When** elle est
   déclenchée, **Then** elle est simulée et son statut est visible dans « Mon compte ».
5. **Given** un service mis en panne volontairement depuis l'écran de démonstration,
   **When** un parcours l'utilise, **Then** le connecteur renvoie l'erreur « service
   indisponible » et le site réagit comme le décrivent les specs.

---

### User Story 8 - Accéder au site de démonstration (Priority: P2)

Les personnes invitées à la critique ouvrent l'adresse de prévisualisation, saisissent le mot
de passe et voient en permanence qu'il s'agit d'une version de démonstration.

**Why this priority**: le site doit pouvoir être montré sans risque d'être pris pour le vrai
site ni d'être trouvé par un moteur de recherche.

**Independent Test**: ouvrir l'adresse sans mot de passe puis avec, vérifier le bandeau sur
plusieurs pages, et vérifier l'absence d'indexation.

**Acceptance Scenarios**:

1. **Given** l'adresse de prévisualisation, **When** un visiteur l'ouvre sans mot de
   passe, **Then** aucune page n'est accessible.
2. **Given** le bon mot de passe, **When** il est saisi, **Then** le site s'ouvre.
3. **Given** n'importe quelle page, **When** elle s'affiche, **Then** le bandeau permanent
   « Version de démonstration — données fictives » est visible et ne peut pas être masqué.
4. **Given** un moteur de recherche, **When** il visite l'adresse, **Then** le site lui
   demande de ne rien indexer, et aucune page n'est accessible sans mot de passe.

---

### Edge Cases

- Réinitialisation lancée pendant qu'un testeur passe une commande : la commande est
  interrompue, le testeur en est informé, et la réinitialisation aboutit.
- Deux administrateurs modifient le même prix fictif en même temps : la dernière
  modification l'emporte et les deux sont journalisées.
- Compte de test créé pendant une séance, rattaché à un client fictif : il est supprimé à la
  réinitialisation, et les cinq comptes de démonstration sont recréés (FR-020, FR-041).
- Configuration mixte (un connecteur réel, les autres en démonstration) : un parcours qui
  enchaîne les deux ne transmet jamais au service réel une donnée issue de la base de
  démonstration ; il s'arrête avec une erreur claire si c'est nécessaire.
- Configuration d'un connecteur incomplète en mode réel : le connecteur refuse de démarrer
  et le signale ; il ne bascule jamais seul en démonstration.
- Mot de passe du site de démonstration partagé trop largement : l'administrateur peut le
  changer ; les sessions ouvertes sont fermées.
- Données de la base qui ressembleraient à de vraies personnes : les noms, numéros RPPS et
  SIRET fictifs sont choisis pour ne correspondre à aucun professionnel réel.
- Référence produit inconnue pour un modèle de la brochure : une référence fictive,
  signalée comme telle dans la base, est utilisée.
- Écran de paiement de démonstration ouvert alors que le connecteur Stripe est en mode
  réel : il n'existe plus.
- Lecture de la base pendant sa réinitialisation : le site affiche un message d'attente
  plutôt qu'un état partiel.

## Requirements *(mandatory)*

### Functional Requirements

**Connecteurs**

- **FR-001** : Le site DOIT disposer d'un connecteur pour chacun des quatre services
  externes : Odoo (catalogue, stocks, clients, commandes, factures, location, fidélité,
  opportunités commerciales), Stripe (paiements et abonnements), plateforme Cloud PCA
  (accès logiciels), emailing (emails transactionnels et marketing, SMS de notification de
  l'équipe).
- **FR-002** : La ligne WhatsApp Business NE DOIT PAS avoir de connecteur : son numéro est un
  paramètre du back-office. Il n'y a pas de connecteur d'agenda : la prise de rendez-vous
  en ligne est hors du site.
- **FR-003** : Aucune page ni aucun composant NE DOIT appeler un service externe autrement que
  par son connecteur, ni savoir quel mode est actif.
- **FR-004** : Chaque connecteur DOIT avoir deux modes, « démonstration » et « réel », choisis
  par configuration, connecteur par connecteur, sans modification de page ni de composant.
- **FR-005** : Dans ses deux modes, un connecteur DOIT renvoyer les mêmes données et les mêmes
  erreurs, notamment : service indisponible, paiement refusé, authentification forte
  demandée, rupture de stock, accès Cloud refusé.
- **FR-006** : Chaque connecteur DOIT avoir des tests de contrat, qui passent en mode
  démonstration et pourront être rejoués tels quels en mode réel.
- **FR-007** : Un connecteur en mode réel dont la configuration est incomplète DOIT refuser de
  fonctionner et le signaler ; il NE DOIT JAMAIS basculer seul en démonstration.
- **FR-008** : Le contrat de chaque connecteur DOIT couvrir toutes les opérations dont les
  modules F01 à F10 ont besoin.

**Base de démonstration**

- **FR-009** : Le connecteur Odoo de démonstration DOIT s'appuyer sur une base de
  démonstration distincte des données propres au site.
- **FR-010** : La base de démonstration DOIT contenir uniquement ce qu'Odoo gérera : produits
  et variantes, prix, stocks, parc de location avec numéros de série, clients, commandes,
  factures, bons d'achat, droits d'assistance, et les copies des demandes de
  financement et de devis sous forme d'opportunités commerciales (FR-021). Elle NE DOIT
  contenir ni garanties ni demandes de SAV : le SAV est géré hors du site.
- **FR-011** : La base DOIT contenir les paramètres commerciaux d'Odoo (tarifs de mise à
  disposition, remises, promotions, règles des bons d'achat et des droits d'assistance), que
  le connecteur de démonstration applique comme le fera Odoo (principe III).
- **FR-012** : Le vocabulaire et les champs de la base DOIVENT reprendre ceux d'Odoo
  (client / partenaire, article, variante, commande de vente, facture, numéro de série).
- **FR-013** : La base DOIT contenir les marques et modèles de la brochure, avec leurs vraies
  références quand elles sont connues, et des prix inventés plausibles, affichés HT.
- **FR-014** : La base DOIT contenir une quinzaine de médecins et cabinets fictifs, avec un
  historique de commandes, de locations et de bons d'achat.
- **FR-015** : La base DOIT couvrir au moins les cas suivants : client sans droits
  d'assistance, client aux droits actifs, location en cours, location en retard de
  retour, produit en rupture,
  produit en « délai X jours », client bénéficiaire de l'offre de bienvenue, compte en
  attente de validation.
- **FR-016** : Les noms, numéros RPPS et SIRET de la base NE DOIVENT correspondre à aucun
  professionnel réel.
- **FR-017** : Aucune donnée de la base de démonstration NE DOIT JAMAIS être envoyée vers
  Odoo ni vers un autre service réel.
- **FR-018** : Chaque compte fictif utilisable pour se connecter DOIT être documenté pour les
  testeurs (identifiant, cas qu'il illustre).
- **FR-041** : Le remplissage et chaque réinitialisation DOIVENT recréer des comptes de
  démonstration prêts à l'emploi : un client avec droits d'assistance actifs, un client sans
  droits d'assistance, un compte en attente de validation, un administrateur et un membre du
  support.

**Remplissage et réinitialisation**

- **FR-019** : La base DOIT pouvoir être remplie et réinitialisée par une action unique de
  l'équipe technique, et depuis le back-office par un administrateur uniquement, avec
  confirmation.
- **FR-020** : La réinitialisation DOIT remettre à leur état de départ la base de
  démonstration et toute l'activité de test enregistrée par le site : comptes clients créés pendant les
  séances, demandes, boîte de démonstration. Les comptes de l'équipe créés dans le
  back-office (administrateur, commercial, support) DOIVENT toujours être conservés. Les contenus (textes, photos, FAQ, tutoriels, bandeau)
  et les paramètres du back-office DOIVENT toujours être conservés.
- **FR-021** : Les demandes de financement et de devis DOIVENT être gérées par le site, dans
  son back-office. La base de démonstration (puis Odoo en phase 2) n'en reçoit qu'une
  copie, sous forme d'opportunité commerciale. Le site ne gère plus de demandes de SAV ni de
  demandes de rappel.
- **FR-022** : La réinitialisation DOIT remettre le site dans son état de départ en moins
  d'une minute.
- **FR-023** : La réinitialisation et le remplissage DOIVENT être impossibles dès qu'un
  connecteur concerné est en mode réel, et DOIVENT être journalisés avec leur auteur et
  leur date.

**Écran de démonstration**

- **FR-024** : En mode démonstration uniquement, un écran simple du back-office, réservé à
  l'administrateur, DOIT permettre de modifier les prix, les stocks et les paramètres
  commerciaux fictifs, et de lancer la réinitialisation.
- **FR-025** : Cet écran DOIT permettre de simuler l'indisponibilité de chaque connecteur,
  pour montrer et tester les cas d'erreur.
- **FR-026** : Une modification faite dans cet écran DOIT s'appliquer aussitôt sur le site.
  Des paramètres incohérents DOIVENT être refusés avec l'explication.
- **FR-027** : Cet écran DOIT disparaître dès que le connecteur Odoo est en mode réel : ces
  réglages se font alors dans Odoo.

**Simulations**

- **FR-028** : Le connecteur Stripe de démonstration DOIT proposer un écran de paiement de
  démonstration permettant de choisir l'issue (accepté, refusé, authentification forte),
  pour les cartes Visa, Mastercard et American Express, et simuler les prélèvements SEPA,
  les abonnements mensuels, les remboursements, ainsi que les confirmations tardives ou
  répétées.
- **FR-029** : Le connecteur emailing de démonstration NE DOIT envoyer aucun email ni SMS
  réel. Tous les messages, emails aux clients comme notifications d'équipe, DOIVENT
  apparaître dans une boîte de démonstration du back-office, avec leur rendu.
- **FR-030** : Le connecteur PCA de démonstration DOIT simuler l'ouverture, la suspension et
  la fermeture des accès au logiciel Cloud, dont le statut est visible dans « Mon compte ».
- **FR-032** : Le connecteur Odoo de démonstration DOIT produire les factures et avoirs en PDF
  portant la mention « FICTIVE » (principe V).
- **FR-033** : Le numéro WhatsApp affiché en démonstration DOIT être un numéro fictif, et les
  boutons « Appeler » et « Écrire sur WhatsApp » DOIVENT ouvrir un lien de démonstration qui
  ne contacte personne.

**Site de démonstration**

- **FR-034** : Le site de démonstration DOIT être publié sur une adresse de prévisualisation
  protégée par mot de passe.
- **FR-035** : Le site de démonstration NE DOIT PAS être indexé par les moteurs de recherche.
- **FR-036** : Un bandeau permanent « Version de démonstration — données fictives » DOIT être
  affiché sur toutes les pages, sans possibilité de le masquer.
- **FR-037** : L'administrateur DOIT pouvoir changer le mot de passe du site de
  démonstration ; les sessions ouvertes sont alors fermées.

**Conformité**

- **FR-042** : La police Inter DOIT être hébergée par le site lui-même. Aucune ressource NE
  DOIT être chargée depuis Google Fonts, afin de ne transmettre aucune adresse IP de
  visiteur à Google (RGPD).

- **FR-038** : Les identifiants des services réels NE DOIVENT JAMAIS figurer dans le code ;
  ils ne sont pas nécessaires en mode démonstration (principe V).
- **FR-039** : La base de démonstration NE DOIT contenir aucune donnée de patient.
- **FR-040** : Les écrans de F11 DOIVENT respecter la charte, le niveau WCAG 2.2 AA et le ton
  du site.

### Key Entities

- **Connecteur** : service concerné, mode actif (démonstration ou réel), contrat
  (opérations, données échangées, erreurs possibles), tests de contrat.
- **Base de démonstration** : données fictives reprenant les objets d'Odoo — articles,
  variantes, prix, stocks, parc et numéros de série, clients, commandes, factures, bons
  d'achat, droits d'assistance — et paramètres commerciaux.
- **Jeu de données de départ** : contenu de la base après remplissage ou réinitialisation,
  avec les cas utiles et les comptes fictifs documentés.
- **Compte fictif** : identifiant de connexion, client fictif rattaché, rôle (client,
  administrateur, support), cas illustré.
- **Opportunité commerciale** : copie, dans la base de démonstration, d'une demande de
  financement ou de devis gérée par le site.
- **Message de démonstration** : email ou notification qui aurait été envoyé, avec son
  destinataire, son type, sa date et son rendu.
- **Paiement simulé** : commande ou échéance, carte ou prélèvement, issue choisie.
- **Panne simulée** : connecteur concerné, état actif ou inactif.
- **Journal des actions** : remplissages, réinitialisations, modifications de
  paramètres, pannes simulées, avec auteur et date.

## Success Criteria *(mandatory)*

### Measurable Outcomes

Chaque critère est marqué [Phase 1] s'il se vérifie avec les connecteurs de démonstration,
ou [Phase 3] s'il nécessite les vrais services.

- **SC-001** [Phase 1] : Tous les parcours (inscription, achat, mise à disposition,
  fidélité, demande de financement ou de devis) fonctionnent de bout en bout en mode
  démonstration. Ce critère est vérifié au fur et à mesure de la livraison de F01 à F10 :
  F11 fournit les connecteurs, les données et le cadre de test, et chaque module y ajoute
  son parcours.
- **SC-002** [Phase 1] : Réinitialiser la base remet le site dans son état de départ en
  moins d'une minute.
- **SC-003** [Phase 1] : Aucune requête ne sort vers un service réel quand tous les
  connecteurs sont en mode démonstration (0 échange observé sur l'ensemble des parcours).
- **SC-004** [Phase 1] : Chaque connecteur a des tests de contrat qui passent en mode
  démonstration et pourront être rejoués tels quels en mode réel.
- **SC-005** [Phase 1] : Changer le mode d'un connecteur ne nécessite aucune modification de
  page ni de composant.
- **SC-006** [Phase 1] : 100 % des cas utiles listés par FR-015 sont présents dans la base et
  accessibles par un compte fictif documenté.
- **SC-007** [Phase 1] : 100 % des emails et notifications déclenchés en démonstration
  apparaissent dans la boîte de démonstration, et aucun n'est réellement envoyé.
- **SC-008** [Phase 1] : 100 % des factures et avoirs produits en démonstration portent la
  mention « FICTIVE ».
- **SC-009** [Phase 1] : Une modification de prix ou de paramètre faite dans l'écran de
  démonstration est visible sur le site en moins de 5 secondes.
- **SC-010** [Phase 1] : Aucune page du site de démonstration n'est accessible sans mot de
  passe, et toutes affichent le bandeau de démonstration.
- **SC-011** [Phase 3] : Les tests de contrat écrits en phase 1 passent, sans modification,
  avec chaque connecteur en mode réel sur les services de test.
- **SC-013** [Phase 1] : Après chaque réinitialisation, les cinq comptes de démonstration
  (client avec droits, client sans droits, compte en attente, administrateur, support)
  permettent de se connecter immédiatement.
- **SC-014** [Phase 1] : Aucune ressource n'est chargée depuis Google Fonts ni depuis un
  autre service tiers de polices.
- **SC-012** [Phase 3] : Avec un connecteur en mode réel, aucune donnée de la base de
  démonstration n'atteint le service réel (0 cas).

## Assumptions

Les points marqués « confirmé » ou « décidé » n'étaient pas tranchés dans la demande
initiale ; ils ont été validés par la responsable du projet le 2026-10-14.

- **Contenus et paramètres du site (confirmé)** : les contenus (textes, photos, FAQ,
  tutoriels, bandeau) et les paramètres du back-office sont réels dès la phase 1 et ne sont
  jamais effacés par une réinitialisation.
- **Accès des testeurs (confirmé)** : un mot de passe unique et partagé protège le site de
  démonstration ; chaque testeur utilise ensuite les comptes de démonstration ou crée le
  sien.
- **Pannes simulées (confirmé)** : l'écran de démonstration permet de rendre chaque
  connecteur indisponible, pour montrer les cas d'erreur des specs. Ce point n'était pas
  dans la demande.
- **Temps simulé (confirmé)** : les situations dépendant du temps (location en retard,
  bons d'achat ou droits proches de leur fin) sont présentes dans le jeu de données de départ ; il n'est pas
  prévu de faire avancer le temps.
- **Références réelles (confirmé)** : les références fabricant des modèles de la brochure
  sont fournies par ExploCardio.fr ; à défaut, une référence fictive signalée comme telle
  est utilisée.
- **Ressources du site (décidé)** : l'interdiction de sortie (SC-003) porte sur les quatre
  services connectés. La police Inter est en outre hébergée par le site (FR-042) :
  l'`@import` vers Google Fonts de `docs/brand/tokens.css` devra être remplacé lors de la
  planification.
- **Rôle « support »** : membre de l'équipe qui assiste les clients ; ses droits dans le
  back-office seront précisés par F13.
- **Réduction de périmètre (2026-10-14)** : le SAV (pannes, garanties, réparations,
  numéros de série) et la prise de rendez-vous sortent du site ; F07 et F08 sont mises de
  côté ; la hotline devient une ligne WhatsApp Business non connectée (F09) ; le connecteur
  agenda disparaît.
- **Commande unique** : « en une commande » est compris comme une action unique de l'équipe
  technique, sans manipulation manuelle des données.
- **Phase 2 et phase 3** : le mode réel des connecteurs et leur branchement relèvent de F14 ;
  le banc de tests sur les services réels et la mise en ligne, de F15.
- **SMS** : le connecteur emailing prévoit les SMS de notification de l'équipe ; ils ne sont
  pas activés en première version.
- **Faisabilité dans Odoo** : les règles appliquées par le connecteur de démonstration (F06
  notamment) devront être reproductibles dans Odoo ; c'est à vérifier avec l'intégrateur
  avant la phase 2.
- **Périmètre** : site en français, aucune donnée de patient, ni dans le site ni dans la
  base de démonstration.
