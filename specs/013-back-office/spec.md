# Feature Specification: F13 — Back-office du site (contenus et paramètres)

**Feature Branch**: `013-back-office`

**Created**: 2026-10-14

**Status**: Draft

**Input**: User description: "F13 — Back-office du site (contenus et paramètres) : validation des comptes professionnels, contenus du site et des produits, paramètres de fonctionnement, suivi des demandes de financement et de devis et des accès Cloud, consultation des clients et de leurs droits d'assistance, journal des connecteurs, outils de démonstration en phase 1, rôles administrateur, commercial et support, historique des paramètres. Objectif : que l'équipe ExploCardio.fr pilote le site sans développeur. Les produits, prix, stocks, clients, commandes et factures se gèrent dans Odoo, pas ici."

## Contexte et objectif

Le back-office est l'outil de travail quotidien de l'équipe ExploCardio.fr. Son objectif :
**piloter le site sans développeur**.

Il ne fait pas double emploi avec Odoo. Conformément aux principes III et VI de la
constitution (v2.2.0) :

- **dans Odoo** (base fictive en phase 1) : produits, prix, stocks, parc de location,
  clients, commandes, factures, et tout ce qui a une valeur en euros ou un effet comptable
  (tarifs de mise à disposition, remises, promotions, règles des bons d'achat et des droits
  d'assistance) ;
- **dans le back-office** : les contenus, les paramètres de fonctionnement du site, la
  validation des comptes et les demandes de financement et de devis. Ces données sont
  réelles dès la phase 1.

F13 rassemble en un seul outil les écrans d'administration que chaque module avait prévus
pour lui-même (F01, F02, F03, F04, F06, F09, F10, F11), avec une navigation commune, des
rôles et un historique.

**Hors périmètre de F13** : la gestion des produits, prix, stocks, clients, commandes et
factures, qui se fait dans Odoo ; le SAV, les garanties, les demandes de rappel et la prise
de rendez-vous, gérés hors du site ; la conversation WhatsApp elle-même ; le contenu
fonctionnel des parcours clients, défini par F01 à F11.

**Phases (constitution v2.2.0)** : en phase 1, le back-office fonctionne avec les
connecteurs de démonstration. Il donne en plus accès, pour l'administrateur et en mode
démonstration seulement, à la boîte de démonstration (emails et notifications simulés) et
aux outils de la base fictive (consultation, modification, réinitialisation) définis par
F11. Ces outils disparaissent en mode réel.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Valider les comptes professionnels (Priority: P1)

Un commercial ouvre la liste des comptes en attente, vérifie le numéro RPPS ou SIRET de
chacun, puis valide ou refuse avec un motif. La validation crée la fiche client dans Odoo.

**Why this priority**: sans validation, aucun professionnel ne peut commander. C'est l'action
la plus fréquente et la plus attendue par les clients.

**Independent Test**: avec un compte commercial, valider un compte en attente et en refuser
un autre ; vérifier la fiche client créée dans la base fictive, les emails dans la boîte de
démonstration et l'historique.

**Acceptance Scenarios**:

1. **Given** des comptes à l'email confirmé et en attente, **When** un administrateur ou
   un commercial ouvre la liste, **Then** il voit pour chacun l'identité, le numéro RPPS
   ou SIRET, le cabinet et la date d'inscription, les plus anciens en premier.
2. **Given** un compte en attente, **When** il le valide, **Then** le compte passe à
   « validé », la fiche client est créée dans Odoo par son connecteur, et le professionnel
   est prévenu par email.
3. **Given** un compte en attente, **When** il le refuse, **Then** un motif est exigé, le
   compte passe à « refusé » et le professionnel est prévenu.
4. **Given** une mise à disposition express commandée par un compte en attente (F05),
   **When** la liste s'affiche, **Then** ce compte apparaît en tête, signalé comme
   prioritaire.
5. **Given** un compte validé, **When** un administrateur le suspend, **Then** son
   titulaire ne peut plus commander et en est informé.
6. **Given** la création de la fiche dans Odoo qui échoue, **When** le compte est validé,
   **Then** l'équipe en est avertie et la création est reprise, sans doublon.

---

### User Story 2 - Mettre à jour les contenus du site (Priority: P1)

L'équipe change le message du bandeau, les tuiles d'accueil, une actualité, un texte de page,
les coordonnées du bloc Contact, une question de FAQ ou un tutoriel. Le site est à jour
aussitôt, sans développeur.

**Why this priority**: c'est la promesse du module et un critère d'acceptation. Le site doit
vivre au rythme des offres et des nouveautés.

**Independent Test**: modifier le message du bandeau, une tuile et une question de FAQ, puis
vérifier leur affichage sur le site et le délai.

**Acceptance Scenarios**:

1. **Given** un message du bandeau modifié et publié, **When** une minute s'est écoulée,
   **Then** le nouveau message est visible sur le site.
2. **Given** un contenu (bandeau, tuile, actualité, texte de page, FAQ, tutoriel, notice),
   **When** il est enregistré en préparation, **Then** il n'est pas visible du public ;
   **When** il est publié, **Then** il l'est.
3. **Given** un contenu en préparation, **When** l'auteur le prévisualise, **Then** il le
   voit tel qu'il apparaîtra sur le site, sur ordinateur et sur mobile.
4. **Given** les coordonnées du bloc Contact, **When** un administrateur ou un commercial
   renseigne ou vide l'email, le téléphone ou l'adresse, **Then** la ligne apparaît ou
   disparaît sur le site (F01).
5. **Given** une image ajoutée, **When** elle est enregistrée, **Then** un texte de
   remplacement est exigé.
6. **Given** un contenu publié, **When** il est retiré, **Then** il disparaît du site et
   reste dans le back-office.

---

### User Story 3 - Habiller les produits d'Odoo (Priority: P1)

Un produit existe dans Odoo. Depuis le back-office, l'équipe lui ajoute ses textes, ses
photos, ses documents et ses consommables compatibles, rattachés par sa référence. Une liste
montre les produits d'Odoo qui n'ont pas encore de contenu.

**Why this priority**: sans contenu, un produit d'Odoo n'est pas présentable sur le site.
C'est un critère d'acceptation.

**Independent Test**: ajouter une photo et un texte à un produit de la base fictive et
vérifier leur affichage sur la fiche ; vérifier que ce produit sort de la liste des produits
sans contenu.

**Acceptance Scenarios**:

1. **Given** un produit présent dans Odoo, **When** l'équipe lui ajoute une photo depuis
   le back-office, **Then** la photo s'affiche sur sa fiche, sans développeur.
2. **Given** la fiche d'un produit dans le back-office, **When** elle s'affiche, **Then**
   les données d'Odoo (nom, référence, prix, stock) y sont visibles en lecture seule, à
   côté des contenus modifiables.
3. **Given** la liste des produits d'Odoo sans contenu, **When** elle s'affiche, **Then**
   elle indique pour chacun ce qui manque (texte, photo, catégorie, publication).
4. **Given** un produit, **When** l'équipe lui associe des consommables compatibles et des
   documents, **Then** ils apparaissent dans les onglets de sa fiche (F03).
5. **Given** un produit retiré d'Odoo, **When** le back-office le constate, **Then** ses
   contenus sont conservés mais signalés comme orphelins, et le produit n'est plus affiché
   sur le site.

---

### User Story 4 - Régler le fonctionnement du site (Priority: P1)

L'équipe règle l'offre de bienvenue, l'heure limite de commande pour une livraison le
lendemain, le numéro WhatsApp et ses horaires. Chaque changement est historisé.

**Why this priority**: ces réglages pilotent des promesses faites aux clients (livraison le
lendemain, contact, cadeau de bienvenue).

**Independent Test**: modifier l'heure limite et le numéro WhatsApp, vérifier leur effet sur
le site et l'historique (auteur, date, ancienne et nouvelle valeur).

**Acceptance Scenarios**:

1. **Given** un administrateur ou un commercial, **When** il active ou désactive l'offre de
   bienvenue ou modifie ses conditions d'affichage, **Then** le site en tient compte.
2. **Given** l'heure limite modifiée, **When** un médecin commande une mise à disposition,
   **Then** la date de livraison proposée suit la nouvelle heure limite.
3. **Given** le numéro WhatsApp ou les horaires modifiés, **When** une page affiche le
   contact, **Then** les nouvelles valeurs apparaissent partout (F09).
4. **Given** toute modification de paramètre, **When** elle est enregistrée, **Then**
   l'historique conserve l'auteur, la date, l'ancienne et la nouvelle valeur.
5. **Given** l'écran des paramètres, **When** il s'affiche, **Then** il rappelle que les
   prix, tarifs, remises, promotions, règles des bons d'achat et des droits d'assistance se
   règlent dans Odoo.
6. **Given** une valeur incohérente (heure invalide, numéro mal formé), **When** elle est
   enregistrée, **Then** elle est refusée avec l'explication.
7. **Given** un commercial, **When** il tente de modifier l'heure limite, le numéro
   WhatsApp ou les horaires, **Then** l'action lui est refusée ; seul l'administrateur le
   peut.

---

### User Story 5 - Aider un client qui écrit sur WhatsApp (Priority: P2)

Un médecin écrit sur WhatsApp. Le membre du support le retrouve dans le back-office et voit
aussitôt ses droits d'assistance et sa situation.

**Why this priority**: c'est ce qui permet d'appliquer le modèle d'assistance au quotidien,
mais la conversation se passe hors du site.

**Independent Test**: avec un compte support, rechercher un client fictif par son nom, son
cabinet ou son téléphone, et vérifier les informations affichées et l'impossibilité de les
modifier.

**Acceptance Scenarios**:

1. **Given** un membre du support, **When** il recherche un client par nom, cabinet,
   téléphone, email ou numéro RPPS ou SIRET, **Then** il le retrouve en quelques secondes.
2. **Given** la fiche d'un client, **When** elle s'affiche, **Then** elle présente, en
   lecture seule, son identité, ses coordonnées, le statut de son compte, ses droits
   d'assistance, ses locations en cours, ses accès Cloud, ses commandes récentes avec leur
   suivi et ses factures.
3. **Given** un client sans droits d'assistance actifs, **When** sa fiche s'affiche,
   **Then** cette absence est signalée clairement, avec le rappel de l'assistance à l'acte
   (F06).

---

### User Story 6 - Suivre les demandes et les accès Cloud (Priority: P2)

L'équipe traite les demandes de financement et de devis, et ouvre ou ferme les accès au
logiciel Cloud qui l'attendent.

**Why this priority**: ces demandes génèrent du chiffre d'affaires, et un accès Cloud non
ouvert bloque un médecin ; mais leur volume reste modeste.

**Independent Test**: faire passer une demande de financement par ses statuts, traiter une
demande de devis, puis ouvrir et fermer un accès Cloud en attente.

**Acceptance Scenarios**:

1. **Given** les demandes de financement, **When** l'équipe ouvre la liste, **Then** elle
   peut la filtrer par statut et faire évoluer chaque demande (reçue, en étude, accordée,
   refusée) avec une note interne ; le client est prévenu (F04).
2. **Given** les demandes de devis d'ECG de repos et les messages du formulaire de contact,
   **When** l'équipe les ouvre, **Then** elle peut les marquer en cours ou traités, avec une
   note interne.
3. **Given** un accès Cloud à ouvrir (après une mise à disposition) ou à fermer (après une
   résiliation), **When** la liste s'affiche, **Then** chaque accès indique le client,
   l'appareil et la date prévue.
4. **Given** un accès en attente, **When** un administrateur ou un membre du support
   l'ouvre ou le ferme, **Then** l'action passe par le connecteur PCA, et le statut est mis
   à jour dans « Mon compte » du client.
5. **Given** une demande de financement ou de devis, **When** elle est enregistrée,
   **Then** sa copie est transmise à Odoo comme opportunité commerciale (F11).

---

### User Story 7 - Surveiller les connecteurs (Priority: P2)

L'administrateur consulte le journal des échanges de tous les connecteurs et repère les
erreurs.

**Why this priority**: une erreur de connecteur silencieuse (commande non transmise, accès
non ouvert) peut durer des jours ; le journal la rend visible.

**Independent Test**: provoquer une panne simulée d'un connecteur (F11) et retrouver
l'erreur dans le journal, avec son objet et son motif.

**Acceptance Scenarios**:

1. **Given** le journal, **When** l'administrateur l'ouvre, **Then** il voit chaque échange
   avec sa date, le connecteur, l'opération, l'objet concerné et le résultat.
2. **Given** le journal, **When** il le filtre par connecteur, par résultat ou par période,
   **Then** il retrouve les erreurs.
3. **Given** une série d'erreurs sur un même connecteur, **When** le seuil fixé est atteint,
   **Then** l'administrateur est alerté.

---

### User Story 8 - Préparer et critiquer la démonstration (Priority: P2)

En phase 1, l'administrateur relit dans la boîte de démonstration les emails et les
notifications qu'aurait envoyés le site, modifie les prix et stocks fictifs pour tester des
variantes, et réinitialise la base entre deux séances.

**Why this priority**: indispensable à la critique de la phase 1, mais sans objet en mode
réel.

**Independent Test**: en mode démonstration, consulter la boîte, modifier un prix fictif et
réinitialiser la base ; en mode réel, vérifier que ces outils ont disparu.

**Acceptance Scenarios**:

1. **Given** le mode démonstration, **When** l'administrateur ouvre la boîte de
   démonstration, **Then** il voit les emails aux clients et les notifications d'équipe
   simulés, séparés et filtrables.
2. **Given** le mode démonstration, **When** il ouvre les outils de la base fictive,
   **Then** il peut consulter et modifier les prix, stocks et paramètres commerciaux
   fictifs, simuler une panne et réinitialiser la base (F11).
3. **Given** le mode réel, **When** quiconque cherche ces outils, **Then** ils n'existent
   plus.
4. **Given** un commercial ou un membre du support, **When** il cherche ces outils,
   **Then** l'accès lui est refusé.

---

### User Story 9 - Gérer les utilisateurs du back-office et leurs rôles (Priority: P2)

L'administrateur crée les comptes de l'équipe, attribue à chacun un rôle (administrateur,
commercial, support) et retire un accès quand une personne quitte l'équipe.

**Why this priority**: les rôles protègent les réglages sensibles ; c'est un critère
d'acceptation.

**Independent Test**: créer un compte de chaque rôle et vérifier ce que chacun voit et peut
faire ; vérifier en particulier qu'un compte support ne peut modifier aucun paramètre.

**Acceptance Scenarios**:

1. **Given** un administrateur, **When** il crée un compte d'équipe et lui attribue un
   rôle, **Then** la personne reçoit une invitation et n'accède qu'à ce que son rôle
   permet.
2. **Given** un compte support, **When** il tente de modifier un paramètre du site, un
   contenu ou une demande, **Then** l'action lui est refusée et n'apparaît pas dans son
   interface.
3. **Given** un compte commercial, **When** il ouvre le back-office, **Then** il accède aux
   comptes, aux demandes, aux contenus et au réglage de l'offre de bienvenue, mais pas aux
   autres paramètres du site.
4. **Given** une personne qui quitte l'équipe, **When** l'administrateur désactive son
   compte, **Then** elle ne peut plus se connecter, et ses actions passées restent dans
   l'historique.
5. **Given** un compte d'équipe, **When** il se connecte, **Then** une double
   authentification est exigée.

---

### Edge Cases

- Deux personnes modifient le même contenu en même temps : la seconde est prévenue avant
  d'écraser la modification de la première.
- Image trop lourde ou d'un format non accepté : elle est refusée avec l'explication, et le
  reste de la saisie est conservé.
- Odoo indisponible : les contenus restent modifiables ; les données d'Odoo sont affichées
  comme indisponibles, et la validation d'un compte est mise en attente puis reprise.
- Compte validé par erreur : un administrateur peut le suspendre ; la fiche client
  d'Odoo n'est pas supprimée par le site.
- Dernier administrateur qui tente de retirer son propre rôle : l'action est refusée.
- Contenu contenant une donnée de patient (par exemple une capture d'écran de logiciel) :
  l'avertissement rappelle la règle ; un administrateur peut le retirer, et le retrait est
  tracé.
- Paramètre modifié par erreur : l'historique permet de retrouver et de remettre l'ancienne
  valeur.
- Session d'équipe inactive : elle est fermée après un délai.
- Back-office ouvert sur une tablette : il reste utilisable, mais il est conçu d'abord pour
  un ordinateur.

## Requirements *(mandatory)*

### Functional Requirements

**Comptes professionnels**

- **FR-001** : Le back-office DOIT présenter la liste des comptes en attente de validation,
  avec l'identité, le numéro RPPS ou SIRET, le cabinet et la date d'inscription, les
  comptes prioritaires (mise à disposition express, F05) en tête.
- **FR-002** : Un administrateur ou un commercial DOIT pouvoir valider un compte, ou le
  refuser avec un motif obligatoire. Un administrateur DOIT pouvoir suspendre un compte
  validé.
- **FR-003** : La validation DOIT créer la fiche client dans Odoo, par son connecteur (F11),
  sans doublon même en cas de nouvel essai.
- **FR-004** : Le mode de validation (manuel ou automatique après contrôle de format, F02)
  et la liste des spécialités proposées à l'inscription DOIVENT être réglables dans le
  back-office.

**Contenus du site**

- **FR-005** : Le back-office DOIT permettre de gérer : messages du bandeau promotionnel (avec
  dates de début et de fin), tuiles d'accueil, actualités et nouveautés, textes et visuels
  des pages, coordonnées du bloc Contact, FAQ, tutoriels et notices.
- **FR-006** : Chaque contenu DOIT avoir un état en préparation ou publié, et pouvoir être
  prévisualisé sur ordinateur et sur mobile avant publication.
- **FR-007** : Un contenu publié DOIT être visible sur le site en moins d'une minute.
- **FR-008** : Chaque image DOIT être accompagnée d'un texte de remplacement obligatoire.
- **FR-009** : Les modèles d'emails et les réglages des scénarios d'emails (F10) DOIVENT être
  modifiables dans le back-office, ou dans l'outil d'emailing si le plan le décide (F10).

**Contenus des produits**

- **FR-010** : Le back-office DOIT permettre d'associer à chaque produit d'Odoo, par sa
  référence : textes marketing, photos, documents, consommables compatibles, produits
  associés, catégorie d'affichage, ordre et publication (F03).
- **FR-011** : La fiche d'un produit dans le back-office DOIT afficher les données d'Odoo
  (nom, référence, prix, stock, formules) en lecture seule.
- **FR-012** : Le back-office DOIT présenter la liste des produits d'Odoo sans contenu ou au
  contenu incomplet, avec ce qui manque.
- **FR-013** : Les contenus d'un produit retiré d'Odoo DOIVENT être conservés et signalés
  comme orphelins.
- **FR-014** : Le back-office NE DOIT permettre de modifier ni produit, ni prix, ni stock,
  ni client, ni commande, ni facture : ces données se gèrent dans Odoo (principe III).

**Paramètres du site**

- **FR-015** : Le back-office DOIT permettre de régler : l'offre de bienvenue (active ou non,
  conditions d'affichage), l'heure limite de commande pour une livraison le lendemain et
  les jours non livrés, le numéro WhatsApp, les horaires de réponse, les jours fériés et
  les fermetures exceptionnelles.
- **FR-016** : Tout autre réglage sans valeur en euros ni effet comptable prévu par les
  modules (par exemple les délais d'envoi des emails de F10) DOIT aussi se régler dans le
  back-office (principe VI).
- **FR-017** : Les prix, tarifs de mise à disposition, remises, promotions, règles des bons
  d'achat et des droits d'assistance et durées de garantie NE DOIVENT PAS être réglables
  dans le back-office ; l'écran des paramètres DOIT rappeler qu'ils se règlent dans Odoo.
- **FR-018** : Chaque modification de paramètre DOIT être historisée : auteur, date,
  ancienne et nouvelle valeur. L'historique DOIT permettre de retrouver une ancienne
  valeur.
- **FR-019** : Une valeur de paramètre incohérente DOIT être refusée avec l'explication.

**Rôles**

- **FR-020** : Le back-office DOIT connaître trois rôles : administrateur (toutes les
  fonctions), commercial (comptes, demandes, contenus), support (consultation des clients
  et de leurs droits d'assistance, accès Cloud).
- **FR-021** : L'offre de bienvenue (activation, conditions d'affichage) DOIT pouvoir être
  réglée par l'administrateur et par le commercial. L'heure limite de commande, les jours
  non livrés, le numéro WhatsApp, les horaires de réponse, le mode de validation des comptes
  et les autres paramètres de fonctionnement NE DOIVENT pouvoir être réglés que par
  l'administrateur.
- **FR-022** : Un utilisateur support NE DOIT pouvoir modifier ni paramètre, ni contenu, ni
  compte, ni demande. Les fonctions qui lui sont interdites NE DOIVENT PAS apparaître dans
  son interface.
- **FR-023** : Seul un administrateur DOIT pouvoir créer, modifier ou désactiver les comptes
  de l'équipe et leurs rôles. Le dernier administrateur NE DOIT PAS pouvoir être retiré.
- **FR-024** : La connexion au back-office DOIT exiger une double authentification, et une
  session inactive DOIT être fermée après un délai.

**Suivi**

- **FR-025** : Le back-office DOIT permettre de traiter les demandes de financement (statuts
  reçue, en étude, accordée, refusée, notes internes) et les demandes de devis (en cours,
  traitée, notes internes), le client étant prévenu des changements de statut prévus par
  F04.
- **FR-026** : Le back-office DOIT permettre de consulter les messages du formulaire de
  contact (F01) et de les marquer traités.
- **FR-027** : Le back-office DOIT présenter les accès au logiciel Cloud à ouvrir ou à
  fermer, et permettre à un administrateur ou à un membre du support de les ouvrir ou de
  les fermer par le connecteur PCA.
- **FR-028** : La fiche d'un client consultable par l'équipe DOIT présenter, en lecture
  seule : l'identité, les coordonnées, le statut du compte, les droits d'assistance, les
  locations en cours et les accès Cloud, ainsi que les commandes récentes (statut, suivi)
  et les factures, lues dans Odoo par son connecteur. Elle NE DOIT PAS présenter
  l'historique complet ni le détail des bons d'achat, consultables dans Odoo.
- **FR-029** : La recherche d'un client DOIT fonctionner par nom, cabinet, téléphone, email,
  numéro RPPS ou SIRET.

**Journal et démonstration**

- **FR-030** : Le back-office DOIT présenter à l'administrateur le journal des échanges de
  tous les connecteurs (date, connecteur, opération, objet, résultat, motif d'erreur),
  filtrable, et l'alerter au-delà d'un seuil d'erreurs.
- **FR-031** : En mode démonstration seulement, et pour l'administrateur seulement, le
  back-office DOIT donner accès à la boîte de démonstration (emails et notifications
  simulés) et aux outils de la base fictive : consultation, modification des prix, stocks
  et paramètres commerciaux, pannes simulées, réinitialisation (F11).
- **FR-032** : Ces outils de démonstration DOIVENT disparaître dès que le connecteur concerné
  est en mode réel.

**Traçabilité, sécurité et charte**

- **FR-033** : Toute action sensible (validation, refus, suspension, publication, retrait,
  modification de paramètre, ouverture ou fermeture d'un accès Cloud, changement de rôle,
  réinitialisation) DOIT être journalisée avec son auteur et sa date.
- **FR-034** : Le back-office DOIT respecter la charte graphique du site, en version plus
  dense, et le niveau WCAG 2.2 AA.
- **FR-035** : Aucun champ du back-office NE DOIT inviter à saisir une donnée de patient, et
  les zones de saisie libre et d'ajout d'images DOIVENT le rappeler.
- **FR-036** : Toutes les données réelles gérées par le back-office (comptes, contenus,
  paramètres, demandes) DOIVENT être conservées par le site ; seules les données de
  gestion passent par le connecteur Odoo.

### Key Entities

- **Utilisateur d'équipe** : nom, email, rôle (administrateur, commercial, support), état
  (actif, désactivé), double authentification.
- **Contenu** : type (bandeau, tuile, actualité, page, FAQ, tutoriel, notice), texte, images
  et textes de remplacement, état (en préparation, publié, retiré), dates de publication.
- **Contenu produit** : référence de l'article Odoo, textes, photos, documents,
  compatibilités, produits associés, catégorie d'affichage, ordre, publication, état
  orphelin.
- **Paramètre du site** : nom, valeur, historique des modifications.
- **Historique de paramètre** : paramètre, auteur, date, ancienne et nouvelle valeur.
- **Demande de financement** et **demande de devis** : client ou demandeur, objet, statut,
  notes internes, copie transmise à Odoo.
- **Message de contact** : motif, coordonnées, texte, date, état.
- **Accès Cloud en attente** : client, appareil ou location, action (ouvrir, fermer), date
  prévue, état.
- **Journal** : actions sensibles de l'équipe et échanges des connecteurs.

## Success Criteria *(mandatory)*

### Measurable Outcomes

Chaque critère est marqué [Phase 1] s'il se vérifie avec les connecteurs de démonstration,
ou [Phase 3] s'il nécessite les vrais services. Sauf mention contraire, les scénarios
d'acceptation des parcours se vérifient en phase 1.

- **SC-001** [Phase 1] : Changer le message du bandeau est visible sur le site en moins d'une
  minute.
- **SC-002** [Phase 1] : Ajouter une photo à un produit d'Odoo depuis le back-office
  l'affiche sur sa fiche, sans développeur.
- **SC-003** [Phase 1] : Un utilisateur support ne peut modifier aucun paramètre, ni
  commercial ni de fonctionnement, et un commercial ne peut modifier que l'offre de
  bienvenue (0 cas contraire sur l'ensemble des tests).
- **SC-004** [Phase 1] : Un commercial valide un compte en moins d'une minute, et la fiche
  client existe dans la base fictive aussitôt après.
- **SC-005** [Phase 1] : Un membre du support retrouve un client et l'état de ses droits
  d'assistance en moins de 15 secondes.
- **SC-006** [Phase 1] : 100 % des modifications de paramètres figurent dans l'historique
  avec auteur, date, ancienne et nouvelle valeur.
- **SC-007** [Phase 1] : Aucun écran du back-office ne permet de modifier un prix, un stock,
  un client, une commande ou une facture.
- **SC-008** [Phase 1] : Les outils de démonstration sont accessibles au seul administrateur
  en mode démonstration, et absents en mode réel.
- **SC-009** [Phase 3] : La validation d'un compte crée la fiche client dans Odoo réel, sans
  doublon, en moins d'une minute.
- **SC-010** [Phase 3] : L'ouverture d'un accès Cloud depuis le back-office est effective sur
  la plateforme PCA en moins de 5 minutes.
- **SC-011** [Phase 1] : Un audit du back-office ne relève aucune non-conformité WCAG 2.2 AA.

## Assumptions

Les points marqués « confirmé » n'étaient pas tranchés dans la demande initiale ; ils ont été
validés par la responsable du projet le 2026-10-14.

- **Double authentification de l'équipe (confirmé)** : obligatoire pour tous les comptes
  du back-office (facultative pour les clients, F02), au titre de l'authentification
  sécurisée du principe V.
- **Accès Cloud par le commercial (confirmé)** : le commercial n'ouvre ni ne ferme les
  accès Cloud ; seuls l'administrateur et le support le font.
- **Messages de contact (confirmé)** : les messages du formulaire de contact de F01 sont
  consultables dans le back-office par l'administrateur et le commercial, en plus de
  l'email reçu par l'équipe.
- **Délai de fermeture de session (confirmé)** : 30 minutes d'inactivité, réglable.
- **Seuil d'alerte des connecteurs (confirmé)** : 5 erreurs successives sur un même
  connecteur, réglable.
- **Usage sur ordinateur (confirmé)** : le back-office est conçu pour un ordinateur et
  reste utilisable sur tablette ; il n'est pas prévu pour le téléphone.
- **Numérotation** : le dossier de cette spec porte le numéro 013 pour correspondre au
  module F13 ; le numéro 012 reste réservé à F12 (logiciel Cloud).
- **Écrans prévus par les modules** : les écrans d'administration annoncés par F01, F02,
  F03, F04, F06, F09, F10 et F11 sont regroupés dans ce back-office, avec la même
  navigation, les mêmes rôles et le même historique.
- **Fiche client dans Odoo** : le site ne supprime jamais une fiche client d'Odoo ; une
  suspension ou une suppression de compte (RGPD, F02) est transmise selon les règles de
  F02.
- **Périmètre** : back-office en français, aucune donnée de patient.
