# Feature Specification: F14 — Branchement d'Odoo

**Feature Branch**: `014-branchement-odoo`

**Created**: 2026-11-06

**Status**: Draft

**Input**: User description: "F14 — Branchement d'Odoo (mode réel du connecteur Odoo). Contexte : copie de test neutralisée de la base Odoo réelle (Odoo 20 Enterprise en ligne, <copie>.odoo.com), accès API par clé (scope RPC) en lecture vérifié le 2026-11-06 ; modules installés : Ventes, Facturation/Comptabilité, Inventaire, Achats, CRM, Location (sale_renting), Signature ; Studio et Abonnements non installés ; module cartes cadeaux / eWallet présent. La copie contient peu de données (10 produits, 12 contacts, 2 commandes, ni stock ni numéros de série). Objectif : le connecteur Odoo reçoit son mode réel, activé par configuration, sans modifier pages ni composants ; mêmes données et mêmes erreurs qu'en démonstration (tests de contrat communs) ; aucune donnée fictive envoyée dans Odoo ; recette sur la copie dans une app Scalingo de recette séparée de la démo ; bascule vers la base réelle à l'ouverture. Périmètre : catalogue (produits, variantes, prix HT, stocks), clients/comptes, commandes et devis (livraison unique France métropolitaine continentale), location mensuelle, factures, bons d'achat et droits d'assistance, numéros de série et garanties. Questions encore ouvertes auprès de Régis et de l'intégrateur : docs/questions-branchement-odoo.docx."

## Contexte et objectif

Le site complet existe en démonstration (phase 1). Toutes ses données de gestion passent par
le connecteur Odoo, qui lit et écrit aujourd'hui dans une base fictive (F11). F14 donne à ce
connecteur son **mode réel** : les mêmes opérations, servies par l'Odoo d'ExploCardio.fr.

Régis et l'équipe veulent ouvrir le site **une fois les branchements faits** (pas de version
vitrine intermédiaire). F14 est donc sur le chemin de l'ouverture.

Le branchement se fait en trois temps :

1. **Copie de test** : une copie neutralisée de la base réelle (aucun email ni tâche
   automatique vers l'extérieur), sur laquelle on construit et on vérifie le mode réel.
2. **Recette** : un site de recette, distinct du site de démonstration et de la page
   d'attente, branché sur la copie. Les tests de bout en bout (F15) s'y déroulent.
3. **Ouverture** : le site public est branché sur la base réelle, par simple changement de
   configuration.

État constaté le 2026-11-06 sur la copie (lecture seule) :

- Odoo 20 Enterprise en ligne ; l'accès par clé fonctionne ;
- applications installées : Ventes, Facturation et Comptabilité, Inventaire, Achats, CRM,
  Location, Signature, ainsi que Rendez-vous, Assistance, Réparations, Planning, Projet,
  Connaissances, Sondages ; cartes cadeaux et porte-monnaie électronique présents ;
- **Studio et Abonnements ne sont pas installés** ;
- peu de données : 10 produits (dont plusieurs sans référence interne), 12 contacts,
  2 commandes, aucune facture, aucun stock, aucun numéro de série ;
- neutralisation confirmée (serveur d'envoi « neutralization - disable emails »).

Les questions encore ouvertes sont dans `docs/questions-branchement-odoo.docx` (35 questions
à Régis et à l'intégrateur). La spec fixe ce qui ne dépend pas de leurs réponses ; le plan
sera complété à réception.

**Phases** : la plupart des critères se vérifient en **[Phase 3]**, sur la copie de test.
Les critères de configuration, de sécurité et de non-régression de la démonstration se
vérifient en **[Phase 1]**.

## Clarifications

### Session 2026-11-06

- Q : à l'ouverture, si les règles du lot B ne sont pas prêtes, que fait le site pour la
  fidélité ? → R : option A, on ouvre sans bons d'achat ni droits d'assistance (masqués),
  branchés ensuite ; l'offre de bienvenue est conservée.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Voir le vrai catalogue, les vrais prix et la vraie disponibilité (Priority: P1)

Un cardiologue parcourt le site de recette. Il voit les produits tels qu'ils sont dans Odoo :
nom, référence, prix HT, variantes, disponibilité. Quand l'équipe modifie un prix dans Odoo,
le site affiche le nouveau prix sans intervention technique.

**Why this priority**: c'est le socle de tout le reste et la partie sans risque (lecture
seule). Elle révèle tout de suite ce qui manque dans Odoo pour servir le site (références,
descriptions, catégories, photos).

**Independent Test**: brancher le site de recette sur la copie, en lecture seule ; comparer
les pages catégories, fiches produit et recherche avec les fiches Odoo correspondantes.

**Acceptance Scenarios**:

1. **Given** un produit publié dans Odoo avec une référence et un prix HT, **When** le
   médecin ouvre sa fiche, **Then** le nom, la référence, le prix HT et les variantes sont
   ceux d'Odoo. [Phase 3]
2. **Given** l'équipe modifie le prix d'un produit dans Odoo, **When** le médecin recharge la
   fiche après le délai de rafraîchissement, **Then** le nouveau prix est affiché. [Phase 3]
3. **Given** un médecin connecté avec une liste de prix particulière dans Odoo, **When** il
   consulte un produit, **Then** il voit son prix à lui. [Phase 3]
4. **Given** un produit en stock à 0 dans Odoo, **When** le médecin ouvre sa fiche,
   **Then** il voit la même indication de disponibilité qu'en démonstration pour un produit
   épuisé. [Phase 3]
5. **Given** un produit présent dans Odoo mais non destiné au site (carte cadeau, recharge de
   porte-monnaie, produit sans référence), **When** le médecin parcourt le catalogue,
   **Then** ce produit n'apparaît pas. [Phase 3]

---

### User Story 2 - Brancher sans risque : recette séparée, bascule par configuration (Priority: P1)

Pauline active le mode réel sur le site de recette en saisissant elle-même l'adresse, la
base, l'identifiant et la clé d'Odoo dans la configuration. Le site de démonstration et la
page d'attente ne changent pas. Le jour de l'ouverture, elle remplace l'adresse et la base
de la copie par celles de la base réelle, sans modifier le site.

**Why this priority**: une erreur de branchement pourrait envoyer des données fictives dans
la vraie gestion de l'entreprise, ou mettre la démonstration hors service. Ces garde-fous
doivent exister avant toute écriture.

**Independent Test**: sur un environnement de test, laisser une variable vide, puis donner
une clé invalide, puis pointer vers une base non neutralisée en recette : à chaque fois le
site refuse de fonctionner en réel avec un message clair, sans jamais retomber seul en
démonstration.

**Acceptance Scenarios**:

1. **Given** le mode réel demandé avec une information de connexion manquante, **When** le
   site appelle Odoo, **Then** l'appel échoue avec « configuration incomplète » et le site ne
   bascule jamais seul en démonstration. [Phase 1]
2. **Given** une clé refusée par Odoo (révoquée, expirée ou erronée), **When** le site
   appelle Odoo, **Then** l'appel échoue avec une erreur d'accès, le médecin voit le même
   message qu'en cas de service indisponible, et l'équipe voit la cause dans le journal des
   connecteurs. [Phase 3]
3. **Given** le site de recette déclaré « recette », **When** la base Odoo visée n'est pas
   neutralisée, **Then** le site refuse toute écriture vers Odoo et le signale. [Phase 3]
4. **Given** le mode réel actif, **When** une donnée de démonstration (référence `FICT-`,
   adresse `@demo.explocardio.test`) doit partir vers Odoo, **Then** elle est refusée et
   rien n'est écrit. [Phase 1]
5. **Given** le site de démonstration (explocardio.osc-fr1.scalingo.io) et la page
   d'attente (www.explocardio.fr), **When** le site de recette passe en mode réel, **Then**
   ils restent en démonstration et inchangés. [Phase 1]
6. **Given** la recette validée, **When** Pauline change l'adresse et la base d'Odoo pour
   celles de la base réelle et redémarre, **Then** le site public sert les données réelles
   sans aucune modification de pages ni de composants. [Phase 3]

---

### User Story 3 - Comptes clients reliés à Odoo (Priority: P2)

Quand l'équipe valide l'inscription d'un médecin, le site retrouve sa fiche client dans
Odoo s'il est déjà client, ou la crée sinon. Les coordonnées modifiées dans « Mon compte »
sont reportées dans Odoo. L'éventuel blocage pour impayé décidé dans Odoo s'applique sur le
site.

**Why this priority**: toute commande, location ou facture dépend d'une fiche client juste,
et ExploCardio.fr a déjà des clients dans Odoo : il ne faut pas créer de doublons.

**Independent Test**: sur la copie, valider trois inscriptions de test : un client déjà
présent dans Odoo (même SIRET), un nouveau client, un client archivé ; vérifier dans Odoo
qu'aucun doublon n'est créé et que les coordonnées correspondent.

**Acceptance Scenarios**:

1. **Given** un médecin déjà client dans Odoo, **When** l'équipe valide son inscription,
   **Then** le site le relie à sa fiche existante, sans en créer une seconde. [Phase 3]
2. **Given** un nouveau médecin, **When** l'équipe valide son inscription, **Then** une
   fiche client est créée dans Odoo avec les seules données nécessaires (identité du cabinet,
   SIRET, adresses, email, téléphone). [Phase 3]
3. **Given** un médecin qui modifie son adresse de livraison dans « Mon compte », **When** il
   enregistre, **Then** la fiche Odoo est mise à jour. [Phase 3]
4. **Given** un client bloqué dans Odoo, **When** il tente de commander, **Then** le site
   applique le même comportement qu'en démonstration pour un client bloqué. [Phase 3]
5. **Given** une demande de devis ou de financement envoyée depuis le site, **When** elle est
   enregistrée, **Then** une opportunité correspondante apparaît dans le CRM d'Odoo.
   [Phase 3]

---

### User Story 4 - Commander et payer, avec la commande dans Odoo (Priority: P2)

Un médecin commande un Holter et des consommables, paie par carte ou par virement. La
commande apparaît dans Odoo avec les bons articles, prix, frais de port (livraison unique,
France métropolitaine continentale) et paiement. Le stock est réservé. Quand l'équipe fait
avancer la commande dans Odoo (préparée, expédiée, livrée), le médecin le voit dans « Mon
compte ».

**Why this priority**: c'est le revenu du site. Il vient après les comptes, dont il dépend.

**Independent Test**: sur la copie, passer une commande payée par carte (Stripe en mode
test) et une commande par virement ; vérifier dans Odoo les lignes, montants, frais de port,
réservation de stock ; faire avancer la commande dans Odoo et vérifier « Mon compte ».

**Acceptance Scenarios**:

1. **Given** un panier, **When** le médecin arrive au récapitulatif, **Then** le montant HT,
   la TVA, les frais de port et le total sont ceux calculés par Odoo. [Phase 3]
2. **Given** un paiement par carte accepté, **When** la commande est créée, **Then** elle
   existe une seule fois dans Odoo, même si la création est relancée après une coupure.
   [Phase 3]
3. **Given** une commande par virement, **When** elle est créée, **Then** elle est en
   attente dans Odoo avec son échéance, et annulée si le virement n'arrive pas à temps.
   [Phase 3]
4. **Given** l'équipe expédie une commande dans Odoo, **When** le médecin ouvre « Mon
   compte », **Then** il voit le nouvel état. [Phase 3]
5. **Given** un devis enregistré par le médecin, **When** il le télécharge, **Then** il
   obtient le document émis par Odoo. [Phase 3]
6. **Given** un remboursement décidé dans Odoo, **When** il est exécuté, **Then** l'avoir
   correspondant existe dans Odoo. [Phase 3]

---

### User Story 5 - Location mensuelle d'appareils (Priority: P3)

Un médecin loue un Holter au mois. La location est enregistrée dans Odoo, avec l'appareil
réservé dans le parc (numéro de série), puis facturée chaque mois. Il peut résilier depuis
« Mon compte » et imprimer l'étiquette de retour.

**Why this priority**: c'est une offre distinctive, mais elle dépend du parc de location et
des numéros de série, absents de la copie aujourd'hui, et de la réponse sur le module à
utiliser.

**Independent Test**: sur la copie, avec au moins un appareil de location saisi, louer,
vérifier la réservation de l'appareil, déclencher une échéance, résilier, télécharger
l'étiquette.

**Acceptance Scenarios**:

1. **Given** un appareil disponible dans le parc Odoo, **When** le médecin loue,
   **Then** la location et l'appareil réservé (numéro de série) apparaissent dans Odoo.
   [Phase 3]
2. **Given** une location en cours, **When** l'échéance mensuelle arrive, **Then** la
   facture du mois est émise par Odoo et prélevée. [Phase 3]
3. **Given** une location en cours, **When** le médecin résilie, **Then** Odoo enregistre la
   fin au terme du mois payé et la date limite de retour. [Phase 3]
4. **Given** aucun appareil disponible à la date souhaitée, **When** le médecin consulte la
   location, **Then** il voit la première date possible calculée d'après le parc Odoo.
   [Phase 3]

---

### User Story 6 - Factures (Priority: P3)

Le médecin retrouve dans « Mon compte » toutes ses factures émises par Odoo, et les
télécharge.

**Why this priority**: obligatoire pour l'ouverture, mais simple et en lecture seule.

**Independent Test**: émettre une facture de test dans la copie et la retrouver,
téléchargeable, dans « Mon compte » du client concerné uniquement.

**Acceptance Scenarios**:

1. **Given** une facture émise par Odoo pour un client, **When** ce client ouvre « Mon
   compte », **Then** il la voit et télécharge le document d'Odoo. [Phase 3]
2. **Given** une facture d'un autre client, **When** un médecin tente d'y accéder, **Then**
   l'accès est refusé. [Phase 3]

---

### User Story 7 - Ouvrir sans la fidélité, garder l'offre de bienvenue (Priority: P4)

À l'ouverture, le site ne propose ni bons d'achat ni droits d'assistance : leurs règles
sont en cours de refonte (F18 lot B : cagnotte de points, service au trimestre,
parrainage), en attente de Régis. Le médecin ne voit aucune mention de ces avantages, ni
lien vers une page vide. L'offre de bienvenue reste proposée. Décision de Pauline du
2026-11-06 (option A).

**Why this priority**: l'ouverture ne dépend pas du lot B. Le branchement de la fidélité
sur Odoo fera l'objet d'un lot ultérieur.

**Independent Test**: sur le site de recette, parcourir l'accueil, les fiches, le panier,
« Mon compte » et les emails : aucune mention des bons d'achat ni des droits d'assistance ;
passer une première commande et vérifier dans Odoo la ligne gratuite de l'offre de
bienvenue.

**Acceptance Scenarios**:

1. **Given** la fidélité masquée, **When** le médecin parcourt le site, son panier et « Mon
   compte », **Then** il ne voit aucune mention des bons d'achat ni des droits d'assistance,
   et aucune adresse de ces pages ne renvoie une page vide. [Phase 1]
2. **Given** un médecin inscrit avec l'offre de bienvenue, **When** il passe sa première
   commande, **Then** la commande créée dans Odoo comporte la ligne gratuite de l'offre.
   [Phase 3]
3. **Given** le lot fidélité livré plus tard, **When** l'équipe lève le masquage, **Then**
   les avantages réapparaissent sans modification des pages. [Phase 1]

---

### Edge Cases

- **Odoo indisponible ou trop lent** : le site affiche le même message qu'en démonstration
  quand la panne est simulée. Aucune commande n'est payée sans exister dans Odoo : si la
  création échoue après le paiement, elle est reprise automatiquement, sans doublon, et
  l'équipe est alertée si la reprise échoue.
- **Clé révoquée, expirée ou changement de mot de passe du compte** : erreur d'accès
  journalisée ; le site ne bascule pas en démonstration.
- **Donnée incomplète dans Odoo** (produit sans référence, sans prix, sans catégorie) : le
  produit n'est pas affiché ; il figure dans un rapport de contrôle destiné à l'équipe.
- **Doublon client dans Odoo** (deux fiches avec le même SIRET) : le site ne choisit pas au
  hasard ; il relie la fiche principale indiquée par l'équipe ou signale le cas.
- **Modification simultanée** : un prix ou un stock change entre l'ajout au panier et le
  paiement ; le récapitulatif recalculé par Odoo fait foi et le médecin en est informé.
- **Limites d'appels d'Odoo en ligne** : en cas de refus pour trop d'appels, le site
  réessaie avec un délai, puis affiche le message d'indisponibilité.
- **Bascule vers la base réelle** : les comptes créés pendant la recette n'existent pas dans
  la base réelle. Les liens entre comptes du site et fiches Odoo de la copie ne doivent pas
  être réutilisés à l'ouverture.
- **Champs propres au site absents d'Odoo** (par exemple « publié sur le site », texte de
  fiche, valeur de remplacement en location) : sans Studio, ils sont créés par l'intégrateur
  ou remplacés par un champ standard ; la liste est arrêtée au plan.

## Requirements *(mandatory)*

### Functional Requirements

**Configuration et sécurité**

- **FR-001**: Le mode réel d'Odoo DOIT s'activer par la seule configuration de
  l'environnement (mode, adresse, base, identifiant, clé), sans modifier de page ni de
  composant.
- **FR-002**: Les secrets d'accès DOIVENT rester hors du dépôt et être saisis par Pauline
  dans la configuration de chaque environnement.
- **FR-003**: Une configuration incomplète ou un accès refusé DOIT faire échouer chaque
  appel avec une erreur explicite ; le connecteur NE DOIT JAMAIS basculer seul en
  démonstration.
- **FR-004**: Aucune donnée de démonstration NE DOIT être envoyée vers Odoo en mode réel.
- **FR-005**: Un site déclaré « recette » DOIT refuser d'écrire dans une base Odoo qui n'est
  pas neutralisée.
- **FR-006**: La recette DOIT se faire sur un environnement distinct du site de démonstration
  et de la page d'attente, qui restent en démonstration.
- **FR-007**: Le site NE DOIT envoyer à Odoo que les données strictement nécessaires à la
  gestion (aucune donnée de patient, aucune donnée de carte).
- **FR-008**: Chaque appel à Odoo DOIT être inscrit au journal des connecteurs (opération,
  durée, résultat), sans jamais y écrire la clé.

**Équivalence avec la démonstration**

- **FR-009**: Pour chaque opération du connecteur, le mode réel DOIT renvoyer des données de
  même forme et les mêmes erreurs que le mode démonstration ; les tests de contrat existants
  DOIVENT passer dans les deux modes.
- **FR-010**: En mode réel, les calculs qui touchent à l'argent (prix client, remises,
  frais de port, taxes, bons d'achat) DOIVENT être faits par Odoo ; le site NE DOIT PAS les
  recalculer.
- **FR-011**: Toute opération d'écriture DOIT être rejouable sans effet double (une commande
  relancée après une coupure n'est créée qu'une fois).

**Catalogue et stock**

- **FR-012**: Le catalogue DOIT être lu dans Odoo : catégories, produits, variantes,
  références, prix HT, disponibilité ; seuls les produits destinés au site sont affichés.
- **FR-013**: Une modification de prix ou de stock dans Odoo DOIT être visible sur le site
  au plus tard 15 minutes après, et immédiatement au récapitulatif de commande.
- **FR-014**: La réservation et la libération de stock à la commande DOIVENT être faites
  dans Odoo.

**Clients**

- **FR-015**: La validation d'un compte DOIT relier le médecin à sa fiche client Odoo
  existante (recherche par SIRET, puis email) ou en créer une, sans doublon.
- **FR-016**: Les changements de coordonnées faits sur le site DOIVENT être reportés dans
  Odoo ; la situation du client (encours, blocage) DOIT être lue dans Odoo.
- **FR-017**: Les demandes de devis et de financement DOIVENT être copiées en opportunités
  dans le CRM d'Odoo.

**Commandes, devis, remboursements**

- **FR-018**: Le devis de commande (montants, frais de port de la livraison unique en France
  métropolitaine continentale) DOIT être calculé par Odoo.
- **FR-019**: Les commandes payées par carte et par virement DOIVENT être créées dans Odoo
  avec leurs lignes, leurs montants et leur mode de paiement ; une commande par virement non
  réglée à l'échéance DOIT être annulée dans Odoo.
- **FR-020**: Les changements d'état faits dans Odoo (préparation, expédition, livraison,
  annulation) DOIVENT être repris par le site au plus tard 15 minutes après.
- **FR-021**: Les devis enregistrés et leurs documents DOIVENT provenir d'Odoo.
- **FR-022**: Les remboursements DOIVENT être enregistrés dans Odoo avec leur avoir.

**Location**

- **FR-023**: Les locations mensuelles DOIVENT être enregistrées dans Odoo, avec l'appareil
  réservé dans le parc et son numéro de série, leurs échéances, leur résiliation et la date
  limite de retour.
- **FR-024**: Le module Odoo utilisé pour la location DOIT être celui que Régis et
  l'intégrateur confirment ; en l'absence du module Abonnements, la facturation mensuelle
  est déclenchée par le site et émise par Odoo.

**Factures**

- **FR-025**: Les factures et leurs documents DOIVENT être lus dans Odoo et accessibles au
  seul client concerné ; les niveaux de relance DOIVENT venir d'Odoo.

**Fidélité**

- **FR-026**: À l'ouverture, les bons d'achat et les droits d'assistance NE SONT PAS
  proposés : les pages, mentions et emplacements correspondants sont masqués, sans lien
  cassé. Ils seront branchés sur Odoo dans un lot ultérieur, selon les règles du lot B de
  F18. Le masquage DOIT pouvoir être levé sans modification des pages (paramètre de
  fonctionnement).
- **FR-026b**: L'offre de bienvenue (tensiomètre offert à la première commande) reste
  proposée à l'ouverture : elle figure comme une ligne gratuite de la commande créée dans
  Odoo, sans passer par les bons d'achat.

**Contrôle des données**

- **FR-027**: Le site DOIT produire, à la demande de l'équipe, un rapport de contrôle des
  données Odoo nécessaires au site (produits sans référence, sans prix, sans catégorie,
  appareils de location sans numéro de série, clients en doublon).

### Key Entities

Les entités sont celles déjà définies par le connecteur (F11) ; F14 les relie à Odoo.

- **Produit et variante** : référence, nom, catégorie, prix HT, disponibilité, destination au
  site.
- **Client** : fiche du cabinet ou du médecin, SIRET, adresses, contacts, situation
  (encours, blocage).
- **Commande et devis** : lignes, montants, frais de port, paiement, état.
- **Location** : appareil (numéro de série), échéances, résiliation, retour.
- **Facture et avoir** : numéro, montants, document, niveau de relance.
- **Bon d'achat et droit d'assistance** : hors de l'ouverture (FR-026), branchés dans un
  lot ultérieur.
- **Opportunité** : copie d'une demande de devis ou de financement.
- **Lien compte-fiche** : relie un compte du site à une fiche client d'une base Odoo
  précise (copie ou réelle).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100 % des tests de contrat du connecteur Odoo passent en mode réel sur la
  copie, comme en démonstration. [Phase 3]
- **SC-002**: 100 % des produits destinés au site dans Odoo sont affichés avec le bon prix
  HT ; le rapport de contrôle ne signale aucun produit bloquant avant l'ouverture. [Phase 3]
- **SC-003**: Un changement de prix, de stock ou d'état de commande fait dans Odoo est
  visible sur le site en 15 minutes au plus. [Phase 3]
- **SC-004**: Sur 20 commandes de recette, dont des créations interrompues puis relancées,
  0 doublon et 0 commande payée absente d'Odoo. [Phase 3]
- **SC-005**: 0 donnée de démonstration écrite dans la copie ou dans la base réelle,
  vérifié par recherche dans Odoo à la fin de la recette. [Phase 3]
- **SC-006**: Les pages catalogue et fiche produit restent aussi rapides qu'en
  démonstration pour le médecin : affichage en moins de 2 secondes dans 95 % des cas.
  [Phase 3]
- **SC-007**: La bascule de la copie vers la base réelle se fait en moins de 30 minutes,
  sans modification du site. [Phase 3]
- **SC-008**: Le site de démonstration et la page d'attente fonctionnent sans changement
  pendant toute la recette. [Phase 1]

## Assumptions

- Une seule clé d'accès par environnement ; pour la recette, le compte de Régis peut servir.
  Pour l'ouverture, un utilisateur dédié au site, aux droits limités, est recommandé
  (question posée à Régis et à l'intégrateur).
- Le mode réel s'active pour tout le connecteur Odoo à la fois, pas domaine par domaine :
  mélanger des commandes fictives et des produits réels créerait des incohérences.
- Les données de la copie (catalogue complet, parc de location, numéros de série, stocks)
  sont saisies dans Odoo par l'équipe ou l'intégrateur avant la recette ; le site n'écrit
  jamais de catalogue dans Odoo.
- Les données de test créées pendant la recette (clients et commandes de test) restent dans
  la copie et ne portent aucune marque de démonstration.
- Stripe est utilisé en mode test pendant la recette ; son branchement réel est traité à
  part.
- La location s'appuie sur le module Location d'Odoo ; la facturation mensuelle est
  déclenchée par le site, comme en démonstration, tant qu'Abonnements n'est pas installé.
- Sans Studio, les champs propres au site absents d'Odoo sont ajoutés par l'intégrateur ou
  remplacés par des champs standards ; la liste est établie au plan.
- Le SAV, les garanties et la prise de rendez-vous restent hors du site, même si Odoo
  dispose des applications Assistance, Réparations et Rendez-vous.
- Les emails envoyés aux clients restent ceux du site (connecteur emailing), pas ceux
  d'Odoo ; à l'ouverture, les envois automatiques d'Odoo vers les clients du site sont à
  régler avec l'intégrateur pour éviter les doublons.

## Dependencies

- Réponses de Régis et de l'intégrateur à `docs/questions-branchement-odoo.docx`.
- Lot B de F18 (cagnotte, parrainage) pour le lot ultérieur de fidélité ; il ne bloque pas
  l'ouverture (FR-026).
- Création d'un environnement de recette distinct (application Scalingo de recette).
- F15 (banc de tests et recette) rejoue l'ensemble des parcours sur cet environnement.
