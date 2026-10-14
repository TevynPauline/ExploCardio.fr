# Feature Specification: F05 — Mise à disposition (MAD) Express sans engagement

**Feature Branch**: `005-mise-a-disposition-express`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "F05 — Mise à disposition (MAD) Express sans engagement : pack mensuel (enregistreur, accès logiciel Cloud, formation), renouvelable mois par mois, kit accessoires acheté une seule fois, livraison possible le lendemain, suivi et résiliation dans Mon compte, gestion du parc de location. Objectif : dépanner n'importe quel médecin (client ou non) du jour au lendemain, et permettre d'utiliser un équipement sans l'acheter."

## Contexte et objectif

La mise à disposition (MAD) permet à un médecin d'utiliser un équipement sans l'acheter : un
pack mensuel sans engagement, renouvelé mois par mois, qu'il arrête quand il veut. F05 a
deux objectifs :

- **dépanner du jour au lendemain** n'importe quel médecin, déjà client ou non, dont
  l'appareil est en panne ou indisponible ;
- **permettre d'utiliser un équipement sans l'acheter**, pour tester ou limiter
  l'investissement.

F05 livre le parcours de mise à disposition, la page « Dépannage express », le suivi et la
gestion des locations dans « Mon compte », la résiliation, le retour du matériel et la
gestion du parc de location.

**Hors périmètre de F05** : le panier, le tunnel de commande, le paiement et la création de
l'abonnement (F04) ; la fiche produit et son onglet « Mise à disposition » (F03) ; la
création du compte (F02) ; l'ouverture et la fermeture techniques des accès au logiciel
Cloud (F12) ; la prise de rendez-vous de formation (F08) ; le financement longue durée
(F04) ; le back-office complet (F13) ; la gestion du parc, des tarifs, des échéances et de
leur facturation, qui se fait dans Odoo (base fictive en phase 1).

**Frontière avec F04** : F05 définit l'offre, la date de livraison, le kit d'accessoires et
tout le cycle de vie de la location (renouvellement, résiliation, retour, retard, impayé).
F04 encaisse le premier mois, met en place le prélèvement mensuel et émet les factures.

**Phases (constitution v2.1.0)** : en phase 1, F05 fonctionne avec les connecteurs de démonstration : le parc, les
locations, les tarifs et les échéances viennent de la base fictive du connecteur Odoo ; les
paiements sont simulés par le connecteur Stripe, les accès au logiciel Cloud par le
connecteur PCA, et les emails par le connecteur emailing. L'heure limite et les jours non
livrés sont réglés dans le back-office dès la phase 1.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Se faire dépanner du jour au lendemain (Priority: P1)

L'appareil d'un médecin tombe en panne. Depuis la page « Dépannage express » ou une fiche
produit, il choisit une mise à disposition, voit qu'une livraison est possible le lendemain,
paie le premier mois et reçoit l'équipement prêt à l'emploi.

**Why this priority**: c'est la promesse du module et un argument fort du site : aucun
médecin ne reste sans appareil.

**Independent Test**: un jour ouvré, avant l'heure limite, commander une mise à disposition
d'un appareil disponible et vérifier la date de livraison proposée, le paiement du premier
mois, la réservation d'un appareil du parc et la confirmation.

**Acceptance Scenarios**:

1. **Given** la page « Dépannage express », **When** elle s'affiche, **Then** elle présente
   les équipements disponibles en mise à disposition, leur prix du premier mois et des mois
   suivants en HT, et la date de livraison la plus proche.
2. **Given** un jour ouvré et une heure antérieure à l'heure limite, **When** le médecin
   choisit une mise à disposition d'un appareil disponible, **Then** la livraison au
   lendemain lui est proposée.
3. **Given** une commande passée après l'heure limite, un week-end ou un jour férié,
   **When** il choisit sa date, **Then** la première date proposée est le premier jour de
   livraison réellement possible, et l'heure limite lui est indiquée.
4. **Given** le choix de la date, **When** le médecin préfère une date ultérieure,
   **Then** il peut la choisir parmi les jours ouvrés proposés.
5. **Given** le récapitulatif avant paiement, **When** il s'affiche, **Then** il détaille
   le contenu du pack (enregistreur, accès au logiciel Cloud, formation), le prix du
   premier mois, le prix des mois suivants, la date de livraison, la date de la prochaine
   échéance et l'absence d'engagement de durée.
6. **Given** un paiement confirmé, **When** la commande est enregistrée, **Then** un
   appareil du parc est réservé pour ce client et la location apparaît dans « Mon compte ».
7. **Given** l'expédition de l'appareil, **When** elle est enregistrée, **Then** le numéro
   de série est rattaché à la location, l'accès au logiciel Cloud est ouvert, un créneau de
   formation est proposé et le client est prévenu avec le suivi du colis.
8. **Given** aucun appareil disponible à la date voulue, **When** le médecin consulte
   l'offre, **Then** la première date possible lui est indiquée, sans promesse de
   lendemain.

---

### User Story 2 - Louer sans être encore client (Priority: P1)

Un médecin qui n'a pas de compte veut un dépannage. Il crée son compte dans le même parcours,
sans le quitter ni ressaisir son choix.

**Why this priority**: le dépannage s'adresse à « n'importe quel médecin, client ou non ».
Un parcours qui renverrait à une inscription séparée perdrait l'urgence.

**Independent Test**: sans compte, lancer une mise à disposition, créer le compte en cours
de route et vérifier que l'appareil, la date et le kit choisis sont conservés jusqu'au
paiement.

**Acceptance Scenarios**:

1. **Given** un visiteur sans compte ayant choisi une mise à disposition, **When** il
   arrive à l'étape d'identification, **Then** il peut créer son compte (champs de F02)
   sans perdre l'appareil, la date ni le kit choisis.
2. **Given** un visiteur qui a déjà un compte, **When** il se connecte dans le parcours,
   **Then** il le reprend au même point.
3. **Given** un compte non encore validé, **When** son titulaire arrive au paiement,
   **Then** il est informé que l'expédition dépend de la vérification de son compte, puis
   peut payer.
4. **Given** un compte en attente de validation qui a payé, **When** la commande est
   enregistrée, **Then** l'administrateur reçoit une alerte de validation prioritaire et
   l'appareil n'est pas expédié avant la validation.
5. **Given** ce compte validé avant l'heure limite, **When** la validation est
   enregistrée, **Then** l'appareil part pour la date annoncée.
6. **Given** ce compte validé après l'heure limite, **When** la validation est
   enregistrée, **Then** la date de livraison est recalculée et le médecin en est prévenu.
7. **Given** ce compte refusé, **When** le refus est enregistré, **Then** la commande est
   annulée, intégralement remboursée, et le médecin est prévenu.

---

### User Story 3 - Suivre et gérer sa location (Priority: P1)

Dans « Mon compte », le client voit ses locations en cours et agit dessus : poursuivre,
résilier, demander l'étiquette de retour, passer à l'achat ou au financement.

**Why this priority**: une location sans engagement n'a de sens que si le client la pilote
lui-même, sans appeler.

**Independent Test**: avec une location en cours, vérifier les informations affichées et
utiliser chaque bouton.

**Acceptance Scenarios**:

1. **Given** une location en cours, **When** le client ouvre « Mon compte », **Then** il
   voit l'appareil, son numéro de série, la date de début, la prochaine échéance et son
   montant HT et TTC.
2. **Given** une location en cours, **When** il la consulte, **Then** il dispose des
   actions : résilier, demander l'étiquette de retour, passer à l'achat, passer au
   financement.
3. **Given** une résiliation programmée dont la date de fin n'est pas atteinte, **When**
   il choisit « Prolonger », **Then** la résiliation est annulée et la location se
   poursuit au tarif des mois suivants.
4. **Given** plusieurs locations en cours, **When** il ouvre la rubrique, **Then** chacune
   est présentée et gérée séparément.
5. **Given** une location terminée, **When** il consulte son historique, **Then** il la
   retrouve avec ses dates et ses factures.

---

### User Story 4 - Résilier et retourner l'appareil (Priority: P1)

Le client résilie sa location avant l'échéance suivante. Le prélèvement suivant est arrêté,
la fermeture de l'accès au logiciel Cloud est programmée à la date de fin, et il reçoit les
instructions et l'étiquette de retour.

**Why this priority**: « sans engagement » doit être vrai et simple. C'est un critère
d'acceptation du module.

**Independent Test**: résilier une location, vérifier qu'aucun prélèvement n'a lieu à
l'échéance suivante, que la fermeture de l'accès Cloud est programmée, puis enregistrer le
retour de l'appareil dans le back-office.

**Acceptance Scenarios**:

1. **Given** une location en cours, **When** le client résilie avant l'échéance suivante,
   **Then** la date de fin est fixée au terme du mois payé, le prélèvement suivant est
   arrêté et une confirmation lui est envoyée.
2. **Given** une résiliation enregistrée, **When** elle est confirmée, **Then** la
   fermeture de l'accès au logiciel Cloud est programmée à la date de fin, et le client en
   est informé.
3. **Given** une résiliation enregistrée, **When** le client la consulte, **Then** il
   trouve les instructions de retour, la date limite de retour et l'étiquette
   préaffranchie à télécharger.
4. **Given** un appareil retourné, **When** l'administrateur enregistre sa réception,
   **Then** la location passe à « terminée », l'appareil passe au statut « en retour » puis
   « disponible » ou « en maintenance », et le client est prévenu.
5. **Given** une résiliation demandée le jour de l'échéance ou après, **When** elle est
   enregistrée, **Then** le mois entamé reste dû et la date de fin est fixée au terme de
   ce mois.

---

### User Story 5 - Ne payer le kit d'accessoires qu'une fois (Priority: P2)

À sa première location d'un type d'appareil, le client achète le kit d'accessoires
obligatoire, qu'il conserve. À ses locations suivantes du même type, le site le reconnaît et
ne le lui repropose pas.

**Why this priority**: c'est un critère d'acceptation, et une double facturation serait
vécue comme une faute.

**Independent Test**: louer deux fois de suite un même type d'appareil avec le même compte
et vérifier que le kit n'est facturé que la première fois ; louer un autre type d'appareil
et vérifier que son kit est proposé.

**Acceptance Scenarios**:

1. **Given** un client qui n'a jamais acquis le kit compatible, **When** il choisit une
   mise à disposition, **Then** le kit est ajouté comme achat obligatoire, avec son prix HT
   et l'explication qu'il le conserve.
2. **Given** un client qui a déjà acquis un kit compatible, **When** il choisit une mise à
   disposition du même type d'appareil, **Then** le kit n'est ni proposé ni facturé, et le
   site le lui indique.
3. **Given** un client possédant le kit d'un type d'appareil, **When** il loue un autre
   type d'appareil, **Then** le kit propre à cet autre type lui est demandé.
4. **Given** un client qui veut racheter un kit (perte, usure), **When** il le souhaite,
   **Then** il peut l'ajouter volontairement.
5. **Given** un client qui possède un kit acquis autrement, **When** l'administrateur
   l'enregistre sur son compte, **Then** le kit ne lui est plus demandé.

---

### User Story 6 - Poursuivre mois après mois (Priority: P2)

Sans action du client, la location se poursuit : chaque mois, l'échéance est prélevée au
tarif des mois suivants et une facture est émise. Si un prélèvement échoue ou si l'appareil
n'est pas rendu à temps, des règles claires s'appliquent.

**Why this priority**: c'est le fonctionnement courant d'une location qui dure, et la
protection d'ExploCardio.fr contre les impayés et les non-retours.

**Independent Test**: laisser une location passer une échéance et vérifier le prélèvement et
la facture ; simuler un prélèvement échoué, puis un retour en retard, et vérifier les
rappels et la facturation.

**Acceptance Scenarios**:

1. **Given** une location en cours non résiliée, **When** l'échéance arrive, **Then** le
   mois suivant est prélevé au tarif des mois consécutifs et le client reçoit sa facture.
2. **Given** une échéance proche, **When** le délai de prévenance est atteint, **Then** le
   client reçoit un rappel indiquant le montant et la possibilité de résilier.
3. **Given** un prélèvement échoué, **When** l'échec est connu, **Then** le client est
   prévenu, invité à régulariser, et de nouvelles tentatives ont lieu selon la règle
   fixée par l'administrateur.
4. **Given** un impayé non régularisé au terme du délai fixé, **When** ce terme est
   atteint, **Then** l'accès au logiciel Cloud est suspendu, le retour de l'appareil est
   demandé et l'administrateur est alerté.
5. **Given** une location résiliée dont l'appareil n'est pas rendu à la date limite,
   **When** le retard est constaté, **Then** des rappels automatiques sont envoyés.
6. **Given** un retard de retour qui dépasse le délai de tolérance, **When** ce délai est
   dépassé, **Then** le mois suivant est facturé selon la règle fixée par
   l'administrateur, et le client en est prévenu à l'avance.
7. **Given** un client qui rend l'appareil puis reloue plus tard, **When** il commande,
   **Then** le tarif du premier mois s'applique de nouveau.

---

### User Story 7 - Passer de la location à l'achat ou au financement (Priority: P2)

Convaincu par l'appareil, le client décide de l'acquérir. Depuis sa location, il passe à
l'achat ou demande un financement.

**Why this priority**: la location sert aussi d'essai avant achat. Ce passage doit être
simple, mais il intervient après la mise en service.

**Independent Test**: depuis une location en cours, utiliser « Passer à l'achat » puis
« Passer au financement » et vérifier le résultat attendu pour chacun.

**Acceptance Scenarios**:

1. **Given** une location en cours, **When** le client choisit « Passer à l'achat »,
   **Then** un appareil neuf est ajouté à son panier au prix du catalogue, et il est
   informé que sa location continue jusqu'à ce qu'il la résilie.
2. **Given** une location en cours, **When** le client choisit « Passer au financement »,
   **Then** le formulaire de demande de financement (F04) s'ouvre, prérempli avec
   l'équipement loué.
3. **Given** un appareil acheté ou financé livré, **When** le client résilie sa location,
   **Then** elle prend fin au terme du mois payé et il rend l'appareil loué selon la
   procédure habituelle.

---

### User Story 8 - Suivre le parc de location (Priority: P2)

L'équipe tient le parc dans Odoo : chaque appareil a un numéro de série et un statut. Elle y
affecte les appareils, enregistre les retours et règle les tarifs. Le site lit la
disponibilité et l'affiche ; le back-office règle l'heure limite et les jours non livrés.

**Why this priority**: la promesse de livraison au lendemain ne tient que si la
disponibilité du parc est exacte.

**Independent Test**: dans la base fictive du connecteur Odoo, ajouter un appareil,
l'affecter à une location, enregistrer son retour, le passer en maintenance puis le remettre
disponible, et vérifier à chaque étape la disponibilité affichée sur le site.

**Acceptance Scenarios**:

1. **Given** un appareil ajouté au parc dans Odoo, **When** le site lit le parc, **Then**
   l'appareil compte dans la disponibilité affichée.
2. **Given** une commande de mise à disposition, **When** l'équipe affecte un appareil dans
   Odoo, **Then** il passe à « loué » et son numéro de série apparaît dans « Mon compte ».
3. **Given** un appareil rendu, **When** l'équipe enregistre sa réception et son état dans
   Odoo, **Then** la location est close et l'appareil passe à « en retour », puis à
   « disponible » ou « en maintenance ».
4. **Given** un appareil « en maintenance » ou « loué », **When** la disponibilité est
   calculée, **Then** il n'est pas proposé à la location.
5. **Given** un administrateur, **When** il modifie l'heure limite ou les jours non livrés
   dans le back-office, **Then** le changement s'applique aux nouvelles commandes sans
   développeur.
6. **Given** le back-office du site, **When** un administrateur ouvre le parc, **Then** il
   ne peut que le consulter.

---

### Edge Cases

- Dernier appareil disponible convoité par deux médecins en même temps : un seul l'obtient ;
  l'autre voit la date suivante avant de payer.
- Commande passée quelques secondes après l'heure limite : la livraison au lendemain n'est
  plus proposée, et le médecin le voit avant de payer.
- Adresse de livraison où la livraison au lendemain n'est pas assurée (Corse, zones
  éloignées) : le délai réel est affiché, sans promesse de lendemain.
- Appareil affecté trouvé défectueux à la préparation : un autre appareil est affecté, ou
  le client est prévenu et choisit de reporter ou d'annuler sans frais.
- Colis non livré ou refusé : la location ne commence pas, et l'administrateur est alerté.
- Client qui résilie avant même la livraison : la commande est annulée et remboursée si
  l'appareil n'est pas expédié.
- Location résiliée puis « Prolonger » après la date de fin : l'action n'est plus
  disponible ; une nouvelle location est nécessaire.
- Client ayant deux locations du même type d'appareil : un seul kit est exigé.
- Kit acheté puis remboursé : le client n'est plus considéré comme le possédant.
- Compte suspendu pendant une location : la location en cours est traitée par
  l'administrateur ; aucune nouvelle location n'est possible.
- Accès Cloud ou prise de rendez-vous indisponibles au moment de l'expédition :
  l'administrateur est alerté et l'ouverture est rattrapée, sans bloquer l'expédition.
- Étiquette de retour perdue : le client peut la redemander.
- Appareil rendu incomplet ou endommagé : l'administrateur l'enregistre, chiffre la
  dégradation et la facture (FR-047).
- Appareil rendu après facturation de la valeur de remplacement : l'administrateur peut
  émettre un avoir.

## Requirements *(mandatory)*

### Functional Requirements

**Offre**

- **FR-001** : Une mise à disposition DOIT être un pack mensuel sans engagement de durée,
  comprenant l'enregistreur, l'accès au logiciel Cloud et la formation.
- **FR-002** : La location DOIT durer un mois, se renouveler automatiquement mois par mois,
  et être résiliable à tout moment avant l'échéance suivante.
- **FR-003** : Le prix du premier mois DOIT inclure les frais d'envoi et de retour. Le prix
  des mois consécutifs suivants DOIT être inférieur. Les deux montants, comme le prix du
  kit d'accessoires, DOIVENT être fixés dans Odoo pour chaque produit (base fictive en
  phase 1, principe VI) et affichés HT, avec le TTC en complément.
- **FR-004** : Après un retour de l'appareil, toute nouvelle location DOIT repartir au tarif
  du premier mois.
- **FR-005** : Le site DOIT proposer une page « Dépannage express » présentant les
  équipements disponibles en mise à disposition, leurs prix et la date de livraison la plus
  proche.

**Parcours**

- **FR-006** : Le médecin DOIT pouvoir lancer une mise à disposition depuis une fiche
  produit ou depuis la page « Dépannage express ».
- **FR-007** : Le médecin DOIT choisir sa date de livraison parmi les jours ouvrés
  possibles. La livraison au lendemain DOIT être proposée si la commande est passée un jour
  ouvré avant l'heure limite et si un appareil est disponible. L'heure limite et les jours
  non livrés DOIVENT être réglés dans le back-office du site (principe VI).
- **FR-008** : Un médecin sans compte DOIT pouvoir créer son compte dans le parcours, sans
  perdre ses choix.
- **FR-009** : Un compte non encore validé DOIT pouvoir commander et payer une mise à
  disposition. L'administrateur DOIT alors recevoir une alerte de validation prioritaire.
  L'appareil NE DOIT PAS être expédié tant que le compte n'est pas validé.
- **FR-044** : Avant de payer, le titulaire d'un compte non validé DOIT être informé que
  l'expédition dépend de la vérification de son compte, et que la date de livraison
  annoncée en dépend.
- **FR-045** : Si le compte est refusé, la commande DOIT être annulée et intégralement
  remboursée, et le médecin prévenu. Cette exception aux règles de F02 et F04 est limitée à
  la mise à disposition et au kit d'accessoires qui l'accompagne.
- **FR-010** : Le paiement du premier mois et la mise en place du prélèvement mensuel
  DOIVENT se faire par le tunnel de commande de F04, par carte ou prélèvement SEPA.
- **FR-011** : Avant le paiement, le médecin DOIT voir le contenu du pack, le prix du
  premier mois et des suivants, la date de livraison, la date de la prochaine échéance, les
  conditions de résiliation et de retour, et les accepter.
- **FR-012** : À l'expédition, l'accès au logiciel Cloud DOIT être ouvert automatiquement
  (F12) et un créneau de formation proposé (F08).

**Kit d'accessoires**

- **FR-013** : Un kit d'accessoires, propre à chaque type d'appareil, DOIT être acheté à la
  première location de ce type. Le client le conserve.
- **FR-014** : Le site DOIT détecter qu'un client possède déjà un kit compatible et, dans ce
  cas, ne pas le proposer ni le facturer.
- **FR-015** : Le kit NE DOIT JAMAIS être facturé deux fois d'office au même client pour un
  même type d'appareil. Le client DOIT pouvoir en racheter un volontairement.
- **FR-016** : La possession d'un kit acquis autrement DOIT pouvoir être enregistrée dans
  Odoo pour un client ; le site en tient compte.

**Suivi et gestion par le client**

- **FR-017** : « Mon compte » DOIT présenter, pour chaque location en cours : l'appareil,
  son numéro de série, la date de début, la prochaine échéance et son montant.
- **FR-018** : Le client DOIT disposer, pour chaque location, des actions : prolonger,
  résilier, demander l'étiquette de retour, passer à l'achat, passer au financement.
- **FR-019** : « Prolonger » DOIT annuler une résiliation programmée tant que la date de fin
  n'est pas atteinte.
- **FR-020** : Le client DOIT retrouver l'historique de ses locations terminées et leurs
  factures.

**Résiliation et retour**

- **FR-021** : Une résiliation DOIT fixer la fin de la location au terme du mois payé,
  arrêter le prélèvement suivant et être confirmée au client.
- **FR-022** : Une résiliation DOIT programmer la fermeture de l'accès au logiciel Cloud à la
  date de fin de la location (F12).
- **FR-023** : À la résiliation, le client DOIT recevoir les instructions de retour, la date
  limite de retour et une étiquette préaffranchie.
- **FR-024** : La location DOIT être close quand l'équipe enregistre dans Odoo la réception de
  l'appareil ; le site lit ce changement.

**Échéances, impayés et retards**

- **FR-025** : Chaque échéance DOIT être prélevée au tarif des mois consécutifs et donner
  lieu à une facture (F04). Le client DOIT être prévenu avant chaque échéance.
- **FR-026** : En cas de prélèvement échoué, le client DOIT être prévenu et de nouvelles
  tentatives effectuées selon une règle fixée dans Odoo.
- **FR-027** : Un impayé non régularisé au terme d'un délai fixé dans Odoo DOIT
  entraîner la suspension de l'accès au logiciel Cloud, la demande de retour de l'appareil
  et une alerte à l'administrateur.
- **FR-028** : Un appareil non rendu à la date limite DOIT déclencher des rappels
  automatiques.
- **FR-029** : Au-delà d'un délai de tolérance, le mois suivant DOIT être facturé selon une
  règle fixée dans Odoo, le client en étant prévenu à l'avance.
- **FR-030** : L'autorisation de prélèvement DOIT rester valable jusqu'à l'enregistrement du
  retour de l'appareil, afin de permettre la facturation d'un retard.

**Passage à l'achat ou au financement**

- **FR-031** : « Passer à l'achat » DOIT ajouter au panier un appareil neuf au prix du
  catalogue, comme un achat normal (F04). Les loyers déjà payés ne sont pas déduits. La
  location se poursuit jusqu'à ce que le client la résilie, puis il rend l'appareil loué.
- **FR-032** : « Passer au financement » DOIT ouvrir la demande de financement de F04,
  préremplie avec l'équipement loué.
- **FR-033** : À la livraison d'un appareil acheté ou financé, le client DOIT être invité à
  résilier la location correspondante ; la résiliation suit les règles habituelles.

**Non-restitution et dégradation**

- **FR-034** : Aucun dépôt de garantie NE DOIT être demandé. Chaque produit proposé en mise
  à disposition DOIT porter une valeur de remplacement fixée dans Odoo, annoncée
  au client avant le paiement.
- **FR-046** : La valeur de remplacement DOIT être facturée en cas de perte déclarée, ou
  quand l'appareil n'est pas rendu au terme d'un délai de non-retour fixé dans Odoo, après
  rappels et préavis au client.
- **FR-047** : Une dégradation constatée au retour DOIT être enregistrée dans Odoo par
  l'équipe avec son montant, puis facturée au client par Odoo ; le client en est informé
  avec le détail.

**Parc de location**

- **FR-035** : Chaque appareil du parc DOIT être identifié par son numéro de série et porter
  l'un des statuts : disponible, loué, en retour, en maintenance. Un appareil
  prêté gratuitement dans le cadre du SAV (F07) est « loué » avec le motif « prêt SAV » :
  il est indisponible à la location et ne donne lieu à aucune échéance.
- **FR-036** : La disponibilité affichée sur le site DOIT refléter le parc en temps réel :
  seuls les appareils « disponibles » sont proposés.
- **FR-037** : Un même appareil NE DOIT JAMAIS être affecté à deux locations en même temps.
- **FR-038** : Le parc, ses numéros de série et ses statuts DOIVENT être gérés dans Odoo et
  lus par son connecteur (base fictive en phase 1, principe III).
- **FR-039** : L'affectation des appareils, les expéditions, la réception des retours, les
  impayés, les tarifs et les règles de facturation DOIVENT se gérer dans Odoo. Le
  back-office du site peut afficher les locations en cours, les impayés et les retards en
  lecture seule, et règle l'heure limite et les jours non livrés.

**Règles commerciales et traçabilité**

- **FR-040** : Aucune règle de mise à disposition NE DOIT être codée en dur. Les tarifs, la
  valeur de remplacement, les délais de tolérance, de régularisation et de non-retour, et la
  date limite de retour se règlent dans Odoo. L'heure limite, les jours non livrés et les
  délais d'envoi des rappels par email se règlent dans le back-office (principe VI).
- **FR-048** : L'ouverture et la fermeture des accès au logiciel Cloud DOIVENT passer par le
  connecteur PCA ; en phase 1, il les simule.
- **FR-041** : Toute commande, résiliation, prolongation, affectation, réception de retour
  et suspension DOIT être journalisée avec son auteur et sa date.

**Charte, accessibilité et langue**

- **FR-042** : Tous les écrans et emails de F05 DOIVENT respecter la charte, le niveau WCAG
  2.2 AA, le vouvoiement et le ton sobre du site.
- **FR-043** : Aucun écran ni formulaire de F05 NE DOIT inviter à saisir une donnée de
  patient. L'appareil rendu NE DOIT donner lieu à aucun traitement de données de patient
  sur le site.

### Key Entities

- **Offre de mise à disposition** : pour un produit, contenu du pack, prix du premier mois,
  prix des mois suivants, type d'appareil, kit requis, valeur de remplacement.
- **Type d'appareil** : famille servant à déterminer le kit d'accessoires compatible.
- **Kit d'accessoires** : article acheté une fois par type d'appareil ; possession
  enregistrée sur le compte client (par achat ou par l'administrateur).
- **Appareil du parc** : produit, numéro de série, statut, historique des locations et des
  interventions.
- **Location** : client, appareil, dates de commande, de livraison, de début, de fin
  prévue, prochaine échéance, état (commandée, en cours, résiliée, en retard de retour,
  suspendue pour impayé, terminée).
- **Échéance** : mois concerné, montant, état du prélèvement, facture.
- **Résiliation** : date de la demande, date de fin, date limite de retour, annulation
  éventuelle.
- **Retour** : étiquette, date de réception, état constaté de l'appareil.
- **Règles de mise à disposition** : heure limite, jours non livrés, délais de prévenance,
  de rappel, de tolérance, de régularisation et de non-retour.

## Success Criteria *(mandatory)*

### Measurable Outcomes

Chaque critère est marqué [Phase 1] s'il se vérifie avec les connecteurs de démonstration,
ou [Phase 3] s'il nécessite les vrais services. Sauf mention contraire, les scénarios
d'acceptation des parcours se vérifient en phase 1.

- **SC-001** [Phase 1] : Un médecin qui commande avant l'heure limite un jour ouvré, pour un appareil
  disponible, se voit proposer une livraison au lendemain dans 100 % des cas.
- **SC-002** [Phase 1] : Une résiliation arrête le prélèvement suivant et programme la fermeture de
  l'accès Cloud dans 100 % des cas testés.
- **SC-003** [Phase 1] : Le kit d'accessoires n'est jamais facturé deux fois d'office au même client
  pour un même type d'appareil (0 cas sur l'ensemble des tests).
- **SC-004** [Phase 1] : Un client connecté et validé commande une mise à disposition en moins de
  3 minutes ; un médecin sans compte, en moins de 8 minutes.
- **SC-005** [Phase 1] : Aucun appareil n'est affecté à deux locations en même temps (0 cas, y compris
  en cas de commandes simultanées).
- **SC-006** [Phase 1] : La disponibilité affichée correspond à l'état réel du parc : un appareil
  passé en maintenance ou loué cesse d'être proposé en moins d'une minute.
- **SC-007** [Phase 1] : Un client résilie sa location en moins de 2 minutes, sans contacter
  l'équipe.
- **SC-008** [Phase 3] : 95 % des commandes passées avant l'heure limite sont livrées à la date
  annoncée.
- **SC-009** [Phase 1] : 100 % des échéances prélevées donnent lieu à une facture disponible dans
  « Mon compte ».
- **SC-010** [Phase 1] : 100 % des retards de retour déclenchent un rappel avant toute facturation
  supplémentaire.
- **SC-011** [Phase 1] : Un audit des écrans de F05 ne relève aucune non-conformité WCAG 2.2 AA.

## Assumptions

Les points marqués « confirmé » n'étaient pas tranchés dans la demande initiale ; ils ont été
validés par la responsable du projet le 2026-10-12.

- **Montants exacts (confirmé)** : les prix du premier mois, des mois suivants et des
  kits ne sont pas fixés par la spec. Ce sont des données saisies par l'administrateur pour
  chaque produit ; elles doivent être fournies avant la mise en ligne.
- **Début de la location (confirmé)** : le mois commence à la date de livraison. Les
  échéances suivantes tombent à la même date chaque mois.
- **Sens de « Prolonger » (confirmé)** : la location se renouvelant d'elle-même, le
  bouton sert à annuler une résiliation programmée. Il n'apparaît que dans ce cas.
- **Date limite de retour (confirmé)** : 5 jours ouvrés après la date de fin, réglable.
  Le délai de tolérance avant facturation du mois suivant est réglable lui aussi.
- **Impayé (confirmé)** : trois nouvelles tentatives sur 10 jours par défaut, puis
  suspension de l'accès Cloud et demande de retour. Valeurs réglables.
- **Livraison au lendemain (confirmé)** : assurée en France continentale, du lundi au
  vendredi hors jours fériés. Pour la Corse et les zones où le transporteur ne la garantit
  pas, le délai réel est affiché.
- **Détection du kit (confirmé)** : fondée sur les achats du client enregistrés dans Odoo,
  complétée par un enregistrement manuel dans Odoo.
- **Dépendances F12 et F08 (confirmé)** : tant que ces modules ne sont pas livrés,
  l'ouverture de l'accès Cloud et la proposition d'un créneau de formation sont faites par
  l'équipe, alertée à chaque expédition et à chaque résiliation.
- **Annulation avant expédition (confirmé)** : gratuite et remboursée intégralement.
- **Données sur l'appareil rendu (confirmé)** : l'effacement des données de patients
  éventuellement présentes dans un enregistreur rendu est une procédure interne
  d'ExploCardio.fr, hors du site.
- **Passage à l'achat après la V1** : garder l'appareil loué ou déduire une part des loyers
  pourra être étudié dans une version ultérieure. La V1 ne prévoit ni l'un ni l'autre.
- **Valeur de remplacement et dégradations** : les montants et les clauses correspondantes
  sont à valider par le conseil juridique d'ExploCardio.fr.
- **Produits concernés** : seuls les produits pour lesquels la formule « Mise à
  disposition » est activée dans Odoo (F03).
- **Kit dans le panier** : le kit est une ligne d'achat, payée en une fois avec le premier
  mois (panier mixte de F04).
- **Conditions contractuelles** : les conditions de location (résiliation, retour,
  responsabilité) sont rédigées par ExploCardio.fr et son conseil juridique ; F05 les
  présente et recueille leur acceptation.
- **Données de gestion** : parc, locations, échéances et factures sont lus et écrits dans
  Odoo par son connecteur (base fictive en phase 1, principe III). Les paiements passent
  par le connecteur Stripe et les accès Cloud par le connecteur PCA, simulés en phase 1.
- **Écran de démonstration (F11)** : en mode démonstration uniquement, un écran simple du
  back-office, réservé à l'administrateur, permet de modifier les prix, stocks et
  paramètres commerciaux de la base fictive et de la réinitialiser. Il disparaît en mode
  réel. C'est une exigence de F11 (connecteurs et base de démonstration).
- **Périmètre** : site en français, professionnels de santé de France métropolitaine, aucune
  donnée de patient sur le site.
