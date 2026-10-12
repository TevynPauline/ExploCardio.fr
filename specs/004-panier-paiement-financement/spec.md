# Feature Specification: F04 — Panier, paiement Stripe et demandes de financement

**Feature Branch**: `004-panier-paiement-financement`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "F04 — Panier, paiement Stripe et demandes de financement : panier mixte (achats et mises à disposition mensuelles), tunnel de commande en 5 étapes réservé aux clients validés, paiement par carte (dont American Express), virement ou abonnement mensuel, facture automatique, demande de financement longue durée avec suivi, cas d'erreur. Objectif : un passage de commande rapide pour un professionnel, avec trois modes d'acquisition."

## Contexte et objectif

F04 permet à un professionnel de santé validé de passer commande rapidement sur
ExploCardio.fr, selon trois modes d'acquisition :

- **achat comptant**, payé par carte ou par virement ;
- **mise à disposition mensuelle**, payée par abonnement avec prélèvement mensuel ;
- **financement longue durée**, sans paiement en ligne, par une demande traitée par l'équipe.

F04 livre le panier, le tunnel de commande, le paiement, la facture, le suivi de commande et
la demande de financement.

**Hors périmètre de F04** : les fiches produit et l'action « ajouter au panier » (F03), la
création et la validation des comptes (F02), le choix et les conditions d'une mise à
disposition, son contrat, sa résiliation, les retours de matériel et les échéances
impayées (F05), le calcul des points et des bons d'achat (F06), le service après-vente et
les retours de marchandise, le back-office complet (F13), le passage des commandes et de la
facturation sous Odoo (F11).

**Lien avec les autres modules** : seul un compte validé finalise une commande (F02). Le
tensiomètre de bienvenue est ajouté à la première commande (F02). Un produit en « délai X
jours » reste commandable, un produit « indisponible » ne l'est pas (F03). Le solde de bons
d'achat est fourni par F06.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Composer son panier (Priority: P1)

Le médecin ajoute des produits à son panier, à l'achat ou en mise à disposition mensuelle.
Le panier sépare clairement ce qui est payé une fois de ce qui est prélevé chaque mois, et
détaille les montants. Il le retrouve à sa prochaine visite.

**Why this priority**: le panier est le point de passage de toute commande, et sa clarté
conditionne la confiance avant paiement.

**Independent Test**: ajouter un achat et une mise à disposition, vérifier les deux blocs et
leurs totaux, modifier une quantité, se déconnecter, se reconnecter et retrouver le panier.

**Acceptance Scenarios**:

1. **Given** un panier contenant des achats et des mises à disposition, **When** il
   s'affiche, **Then** il présente deux blocs distincts : « Paiement unique » et
   « Abonnement mensuel », chacun avec son propre total.
2. **Given** le bloc « Paiement unique », **When** il s'affiche, **Then** il détaille le
   total HT, les remises, les frais de port, la TVA et le total TTC.
3. **Given** le bloc « Abonnement mensuel », **When** il s'affiche, **Then** il indique
   le montant du premier mois et celui des mois suivants, HT et TTC.
4. **Given** une ligne du panier, **When** le client modifie la quantité ou la supprime,
   **Then** les totaux se mettent à jour aussitôt.
5. **Given** un code promo valide, **When** le client le saisit, **Then** la remise
   apparaît sur une ligne dédiée ; un code invalide ou expiré est refusé avec le motif.
6. **Given** un solde de bons d'achat, **When** le client choisit de l'utiliser, **Then**
   le montant utilisé est déduit, dans la limite du solde et du montant éligible.
7. **Given** un client connecté, **When** il revient plus tard ou sur un autre appareil,
   **Then** il retrouve son panier.
8. **Given** un visiteur non connecté ayant un panier, **When** il se connecte, **Then**
   son panier est fusionné avec celui de son compte, sans doublon.
9. **Given** un produit du panier dont le prix ou la disponibilité a changé, **When** le
   panier s'affiche, **Then** le client en est informé et voit la valeur en vigueur.
10. **Given** un produit en « délai X jours », **When** il figure au panier, **Then** le
    délai est rappelé sur sa ligne.

---

### User Story 2 - Commander et payer par carte (Priority: P1)

Un client validé passe commande en cinq étapes : adresses, livraison, paiement,
récapitulatif, confirmation. Il paie par carte, y compris American Express, avec
authentification forte. Il reçoit un email récapitulatif et trouve sa facture dans « Mon
compte ».

**Why this priority**: c'est le parcours qui génère le chiffre d'affaires. Il doit être le
plus court et le plus fiable du site.

**Independent Test**: avec un compte validé, payer un panier d'achats par carte American
Express de test, puis vérifier la confirmation, l'email, la commande dans « Mon compte » et
dans le back-office, la facture et la baisse du stock.

**Acceptance Scenarios**:

1. **Given** un client validé avec un panier, **When** il lance la commande, **Then** ses
   adresses de livraison et de facturation sont préremplies et modifiables.
2. **Given** l'étape livraison, **When** elle s'affiche, **Then** elle propose les modes
   disponibles (standard, express), chacun avec son forfait HT et son délai estimé, le
   franco de port s'il est atteint, et le tarif de livraison propre à chaque équipement
   volumineux.
3. **Given** l'étape paiement, **When** le client choisit la carte, **Then** il peut payer
   par Visa, Mastercard ou American Express, avec authentification forte quand elle est
   demandée.
4. **Given** le récapitulatif, **When** il s'affiche, **Then** il reprend les articles, les
   adresses, la livraison, le mode de paiement et tous les montants, et la validation exige
   l'acceptation des CGV.
5. **Given** un paiement confirmé, **When** la confirmation est reçue, **Then** la commande
   est enregistrée dans le référentiel de gestion, le stock est décompté, la facture est
   générée, la page de confirmation s'affiche et l'email récapitulatif est envoyé.
6. **Given** une commande payée, **When** le client ouvre « Mon compte », **Then** il y
   voit la commande, son statut et sa facture téléchargeable.
7. **Given** un compte non validé, **When** son titulaire tente de lancer la commande,
   **Then** l'accès au tunnel est refusé avec une explication, et le panier est conservé.
8. **Given** la première commande d'un bénéficiaire de l'offre de bienvenue, **When** le
   récapitulatif s'affiche, **Then** le tensiomètre offert y figure sur une ligne à 0 €.
9. **Given** un client qui quitte le tunnel à une étape, **When** il y revient, **Then**
   il reprend là où il s'était arrêté, sans ressaisie.

---

### User Story 3 - Ne perdre ni doubler aucune commande (Priority: P1)

Quoi qu'il arrive pendant le paiement (refus, coupure, confirmation tardive ou répétée,
rupture de stock), le client sait où il en est, garde son panier, et chaque paiement
abouti donne exactement une commande.

**Why this priority**: une commande payée et perdue, ou débitée deux fois, détruit la
confiance et coûte cher à rattraper. C'est un critère d'acceptation du module.

**Independent Test**: simuler un paiement refusé, une confirmation reçue deux fois, une
confirmation reçue avec retard après fermeture de la page, et une rupture juste avant le
paiement ; vérifier l'état du panier et le nombre de commandes créées.

**Acceptance Scenarios**:

1. **Given** un paiement refusé, **When** le refus est connu, **Then** un message clair
   l'indique, le panier et les saisies sont conservés et le client peut réessayer ou
   changer de moyen de paiement.
2. **Given** une confirmation de paiement reçue deux fois, **When** elle est traitée,
   **Then** une seule commande et une seule facture existent.
3. **Given** un client qui ferme la page pendant le paiement, **When** la confirmation
   arrive plus tard, **Then** la commande est créée, l'email est envoyé et le panier est
   vidé.
4. **Given** un double clic ou un rechargement à la validation, **When** le paiement est
   lancé, **Then** le client n'est débité qu'une fois.
5. **Given** un produit passé « indisponible » ou en quantité insuffisante depuis son
   ajout au panier, **When** le client arrive au paiement, **Then** il est alerté avant
   de payer et peut ajuster son panier.
6. **Given** le service de paiement injoignable, **When** le client veut payer, **Then**
   il en est informé, rien n'est débité et le panier est conservé.
7. **Given** un paiement abouti pour lequel la commande n'a pas pu être enregistrée,
   **When** l'anomalie est détectée, **Then** l'administrateur est alerté et la commande
   est rattrapée sans nouvelle action du client.

---

### User Story 4 - Payer par virement (Priority: P2)

Le client choisit le virement bancaire. Sa commande est créée « en attente de paiement », il
reçoit le RIB et la référence à rappeler. À réception du virement, la commande est confirmée.

**Why this priority**: beaucoup de cabinets et de centres règlent leurs équipements par
virement, mais le paiement par carte suffit pour ouvrir le site.

**Independent Test**: passer une commande par virement, vérifier le statut et les
coordonnées bancaires communiquées, puis marquer le virement reçu dans le back-office et
vérifier la confirmation, la facture et la baisse du stock.

**Acceptance Scenarios**:

1. **Given** un panier d'achats, **When** le client choisit le virement et valide,
   **Then** la commande est créée au statut « en attente de paiement », et la page de
   confirmation comme l'email indiquent le RIB, le montant TTC et la référence à rappeler.
2. **Given** une commande en attente de paiement, **When** l'administrateur enregistre la
   réception du virement, **Then** la commande passe à « payée », la facture est générée
   et le client est prévenu par email.
3. **Given** une commande en attente de paiement, **When** elle est créée, **Then** son
   stock est réservé pour le délai fixé (7 jours par défaut) ; le client reçoit un rappel
   avant l'échéance, puis la commande est annulée et le stock libéré s'il n'a pas payé.
4. **Given** une mise à disposition mensuelle dans le panier, **When** le client choisit
   son mode de paiement, **Then** le virement n'est proposé que pour la partie achat.

---

### User Story 5 - Souscrire une mise à disposition mensuelle (Priority: P2)

Le client met un équipement en mise à disposition mensuelle dans son panier. À la commande,
il autorise un prélèvement mensuel par carte ou par prélèvement SEPA. Le premier mois est
payé à la commande.

**Why this priority**: la mise à disposition est l'un des trois modes d'acquisition, mais
son cycle de vie complet relève de F05.

**Independent Test**: souscrire une mise à disposition par carte puis par prélèvement SEPA,
vérifier le paiement du premier mois, l'abonnement créé et son affichage dans « Mon
compte ».

**Acceptance Scenarios**:

1. **Given** une mise à disposition au panier, **When** le client arrive au paiement,
   **Then** il choisit la carte ou le prélèvement SEPA pour les échéances mensuelles.
2. **Given** le récapitulatif, **When** il s'affiche, **Then** il indique le montant du
   premier mois, celui des mois suivants, la date de prélèvement et l'absence
   d'engagement de durée.
3. **Given** une souscription confirmée, **When** la confirmation est reçue, **Then**
   l'abonnement est enregistré, le matériel est réservé dans le parc de location et la
   location apparaît dans « Mon compte ».
4. **Given** un panier mixte, **When** le client valide, **Then** l'achat et l'abonnement
   sont confirmés ensemble ; si l'un des deux paiements échoue, le client sait lequel et
   peut le régulariser sans repayer l'autre.
5. **Given** chaque échéance mensuelle prélevée, **When** le prélèvement aboutit,
   **Then** une facture est générée et disponible dans « Mon compte ».

---

### User Story 6 - Demander un financement longue durée (Priority: P2)

Depuis une fiche produit ou son panier, le client remplit « Demander mon financement » :
équipements, durée souhaitée, coordonnées, informations sur le cabinet. Il ne paie rien en
ligne et suit le statut de sa demande dans « Mon compte ».

**Why this priority**: le financement lève le frein de l'investissement sur les
équipements lourds, mais son traitement est fait hors ligne par l'équipe.

**Independent Test**: envoyer une demande depuis une fiche produit et une autre depuis le
panier, vérifier leur enregistrement dans le back-office, faire évoluer le statut et
constater sa mise à jour dans « Mon compte ».

**Acceptance Scenarios**:

1. **Given** une fiche produit ou un panier, **When** le client ouvre « Demander mon
   financement », **Then** les équipements concernés et ses coordonnées sont préremplis.
2. **Given** le formulaire, **When** le client choisit une durée parmi celles proposées et
   valide, **Then** la demande est enregistrée au statut « reçue », transmise à l'équipe,
   et une confirmation s'affiche et lui est envoyée par email.
3. **Given** une demande, **When** l'administrateur fait passer son statut à « en étude »,
   « accordée » ou « refusée », **Then** le client en est prévenu par email et le voit dans
   « Mon compte ».
4. **Given** le parcours de financement, **When** n'importe quel écran ou email
   s'affiche, **Then** aucun nom d'organisme de financement n'y figure.
5. **Given** une demande envoyée depuis le panier, **When** elle est enregistrée,
   **Then** les équipements concernés quittent le panier d'achat et les autres articles y
   restent.
6. **Given** une mensualité indicative affichée, **When** le formulaire s'affiche,
   **Then** elle est rappelée comme indicative, y compris un montant forcé pour ce client
   (F03).
7. **Given** une demande accordée, **When** l'administrateur crée la commande « financée »
   correspondante, **Then** le stock est décompté, la commande apparaît dans « Mon compte »
   sans montant à payer, et elle suit les mêmes étapes d'expédition qu'un achat.

---

### User Story 7 - Suivre sa commande et un remboursement (Priority: P2)

Le client suit ses commandes dans « Mon compte » : statut, expédition, factures. Si un
remboursement est effectué, il le voit et reçoit l'avoir correspondant.

**Why this priority**: le suivi évite des appels à l'équipe, et la mise à jour après
remboursement est un critère d'acceptation du module.

**Independent Test**: faire évoluer une commande jusqu'à l'expédition, puis la rembourser
une fois depuis le back-office et une fois depuis Stripe, et vérifier le statut et l'avoir
dans « Mon compte ».

**Acceptance Scenarios**:

1. **Given** une commande, **When** son statut change (payée, en préparation, expédiée,
   livrée), **Then** « Mon compte » l'affiche et le client est prévenu par email aux
   étapes clés.
2. **Given** une commande expédiée, **When** le client la consulte, **Then** il voit le
   transporteur et le suivi du colis.
3. **Given** un remboursement total ou partiel effectué depuis le back-office ou
   directement dans Stripe, **When** il est enregistré, **Then** le statut de la commande
   est mis à jour dans « Mon compte », un avoir est généré et le client est prévenu.
4. **Given** une commande, **When** le client ouvre sa facture ou son avoir, **Then** il
   obtient un PDF comportant les mentions légales françaises.

---

### User Story 8 - Traiter les commandes et les demandes (Priority: P3)

L'administrateur consulte les commandes, enregistre les virements reçus, indique les
expéditions, rembourse, traite les demandes de financement et gère les codes promo et les
frais de port.

**Why this priority**: indispensable à l'exploitation, mais ces écrans servent l'équipe et
non le client.

**Independent Test**: depuis le back-office, confirmer un virement, expédier une commande,
rembourser partiellement une autre, changer le statut d'une demande de financement et créer
un code promo.

**Acceptance Scenarios**:

1. **Given** un administrateur, **When** il ouvre la liste des commandes, **Then** il peut
   la filtrer par statut, mode de paiement, client et période.
2. **Given** une commande payée, **When** il indique son expédition avec le transporteur
   et le numéro de suivi, **Then** le client est prévenu.
3. **Given** une commande payée par carte, **When** il la rembourse en tout ou en partie,
   **Then** le remboursement est exécuté, l'avoir est généré et le statut est mis à jour.
4. **Given** une demande de financement, **When** il change son statut ou ajoute une note
   interne, **Then** le changement est enregistré et seul le statut est visible du client.
5. **Given** les règles commerciales, **When** il modifie les frais de port, les seuils,
   les délais ou un code promo, **Then** le changement s'applique aux nouvelles commandes
   sans développeur.
6. **Given** toute action sur une commande, un remboursement ou une demande, **When** elle
   est effectuée, **Then** elle est journalisée avec son auteur et sa date.

---

### Edge Cases

- Panier vide : le tunnel n'est pas accessible et le panier propose de revenir au catalogue.
- Panier ne contenant que des mises à disposition : le bloc « Paiement unique » n'apparaît
  pas, et inversement.
- Adresse de livraison hors de France métropolitaine : refusée dès l'étape adresses.
- Bons d'achat ou remise supérieurs au montant dû : le total ne devient jamais négatif et
  le solde non utilisé est conservé.
- Code promo et remise automatique sur la même commande : la règle de cumul est appliquée
  et expliquée.
- Carte expirée ou authentification forte abandonnée : traité comme un paiement refusé.
- Virement d'un montant différent de la commande : l'administrateur est alerté et la
  commande reste en attente tant que l'écart n'est pas traité.
- Virement jamais reçu : la commande est annulée au terme du délai, après rappel, et le
  stock réservé est libéré.
- Deux clients commandent en même temps le dernier exemplaire : un seul l'obtient au délai
  normal ; l'autre est alerté avant de payer.
- Mode express indisponible pour un article du panier : le mode n'est pas proposé, avec
  l'explication.
- Compte suspendu entre l'ajout au panier et la commande : le tunnel est refusé.
- Première commande annulée avant expédition : le droit au tensiomètre de bienvenue est
  rétabli (F02).
- Remboursement d'une commande payée par virement : il est effectué par virement et
  enregistré par l'administrateur.
- Client qui n'accepte pas les CGV : la validation est impossible.
- Demande de financement en double pour les mêmes équipements : le client en est averti.

## Requirements *(mandatory)*

### Functional Requirements

**Panier**

- **FR-001** : Le panier DOIT pouvoir contenir à la fois des achats et des mises à
  disposition mensuelles, présentés dans deux blocs distincts avec chacun son total.
- **FR-002** : Le panier DOIT afficher, pour les achats : total HT, remises automatiques,
  remise du code promo, bons d'achat utilisés, frais de port, TVA et total TTC.
- **FR-003** : Le panier DOIT afficher, pour les mises à disposition : le montant du
  premier mois et celui des mois suivants, HT et TTC.
- **FR-004** : Le client DOIT pouvoir modifier les quantités, supprimer une ligne, saisir
  un code promo et choisir d'utiliser son solde de bons d'achat.
- **FR-005** : Le panier d'un client connecté DOIT être conservé entre deux connexions et
  d'un appareil à l'autre. Le panier d'un visiteur DOIT être fusionné avec celui de son
  compte à la connexion.
- **FR-006** : Le panier DOIT appliquer les prix et disponibilités en vigueur et signaler
  au client tout changement depuis l'ajout.
- **FR-007** : Tout visiteur DOIT pouvoir composer un panier. Seul un client validé DOIT
  pouvoir entrer dans le tunnel de commande.

**Tunnel de commande**

- **FR-008** : Le tunnel DOIT comporter cinq étapes : adresses, livraison, paiement,
  récapitulatif, confirmation, avec un repère de progression et un retour possible aux
  étapes précédentes sans perte de saisie.
- **FR-009** : Les adresses de livraison et de facturation DOIVENT être préremplies depuis
  le compte et modifiables. L'adresse de livraison DOIT se situer en France métropolitaine.
- **FR-010** : L'étape livraison DOIT proposer les modes disponibles (standard, express ou
  lendemain), chacun avec son prix HT et son délai estimé.
- **FR-011** : Les frais de port DOIVENT être calculés par forfait : un forfait standard et
  un forfait express, avec franco de port au-delà d'un seuil de commande. Forfaits et seuil
  sont réglés par l'administrateur.
- **FR-046** : Chaque équipement volumineux DOIT porter son propre tarif de livraison, et
  d'installation le cas échéant, fixé par l'administrateur produit par produit et affiché
  HT dès le panier. Ce tarif s'ajoute aux forfaits et n'entre pas dans le franco de port.
  Aucun frais de livraison NE DOIT être « sur demande ».
- **FR-012** : Le récapitulatif DOIT reprendre articles, adresses, livraison, mode de
  paiement et montants, et exiger l'acceptation explicite des CGV avant validation.
- **FR-013** : La page de confirmation et un email récapitulatif DOIVENT suivre toute
  commande validée.
- **FR-014** : Le tensiomètre de bienvenue DOIT être ajouté sur une ligne à 0 € à la
  première commande d'un bénéficiaire, selon les règles de F02.

**Paiement**

- **FR-015** : Le client DOIT pouvoir payer ses achats par carte bancaire Visa, Mastercard
  ou American Express, avec authentification forte.
- **FR-016** : Tout paiement par carte ou par prélèvement DOIT passer par Stripe. Aucune
  donnée de carte ni coordonnée bancaire du client NE DOIT transiter par les serveurs du
  site ni y être stockée.
- **FR-017** : Le client DOIT pouvoir payer ses achats par virement bancaire. La commande
  est alors créée « en attente de paiement » et le RIB, le montant et la référence à
  rappeler lui sont communiqués.
- **FR-018** : Le stock d'une commande en attente de virement DOIT être réservé pendant un
  délai réglé par l'administrateur (7 jours par défaut). Le client DOIT recevoir un rappel
  avant l'échéance. Sans paiement à l'échéance, la commande DOIT être annulée
  automatiquement, le stock libéré et le client prévenu.
- **FR-019** : Une mise à disposition mensuelle DOIT être payée par abonnement avec
  prélèvement mensuel, par carte ou par prélèvement SEPA. Le virement NE DOIT PAS être
  proposé pour un abonnement.
- **FR-020** : Un panier mixte DOIT être validé en une seule fois, l'achat et l'abonnement
  étant chacun confirmés et suivis séparément.
- **FR-021** : Un paiement refusé DOIT donner lieu à un message clair et permettre de
  réessayer ou de changer de moyen de paiement, sans perte du panier ni des saisies.

**Fiabilité**

- **FR-022** : Chaque paiement confirmé DOIT donner lieu à exactement une commande, y
  compris si la confirmation est reçue en retard, en double, ou après fermeture de la page.
- **FR-023** : Un client NE DOIT PAS pouvoir être débité deux fois pour la même validation.
- **FR-024** : La disponibilité de chaque article DOIT être revérifiée juste avant le
  paiement, et le client alerté en cas de rupture ou de quantité insuffisante.
- **FR-025** : Tout paiement abouti sans commande enregistrée DOIT déclencher une alerte à
  l'administrateur et pouvoir être rattrapé.

**Commande, stock et facture**

- **FR-026** : La commande DOIT être enregistrée dans le référentiel de gestion dès le
  paiement confirmé, et le stock décompté, par la couche d'accès unique (principe III),
  avec les notions d'Odoo (commande de vente, ligne, facture).
- **FR-027** : Une commande DOIT porter l'un des statuts : en attente de paiement, payée,
  en préparation, expédiée, livrée, annulée, remboursée partiellement, remboursée.
- **FR-028** : Une facture PDF DOIT être générée automatiquement à chaque paiement
  confirmé, avec les mentions légales françaises et une numérotation continue, sans trou
  ni doublon, et être disponible dans « Mon compte ».
- **FR-029** : Chaque échéance mensuelle prélevée DOIT donner lieu à une facture.
- **FR-030** : Tout remboursement DOIT donner lieu à un avoir, numéroté de façon continue,
  disponible dans « Mon compte ». Une facture émise NE DOIT JAMAIS être modifiée ni
  supprimée.
- **FR-031** : Un remboursement effectué depuis le back-office ou directement dans Stripe
  DOIT mettre à jour le statut de la commande dans « Mon compte ».
- **FR-032** : Le client DOIT être prévenu par email à la confirmation, à l'expédition (avec
  le suivi) et en cas de remboursement ou d'annulation.

**Financement longue durée**

- **FR-033** : Le client DOIT pouvoir demander un financement depuis une fiche produit ou
  depuis son panier, sans aucun paiement en ligne.
- **FR-034** : Le formulaire DOIT recueillir les équipements choisis, la durée souhaitée
  parmi celles que l'administrateur propose (par exemple 24, 36, 48, 60 mois), les
  coordonnées et les informations sur le cabinet, préremplies depuis le compte.
- **FR-035** : La demande DOIT être enregistrée dans le back-office, transmise à l'équipe,
  et confirmée au client à l'écran et par email.
- **FR-036** : Une demande DOIT porter l'un des statuts : reçue, en étude, accordée,
  refusée. Le client DOIT voir ce statut dans « Mon compte » et être prévenu de chaque
  changement.
- **FR-037** : Le nom des organismes de financement NE DOIT apparaître dans aucun écran ni
  email destiné au client.
- **FR-038** : Une fois le financement accordé, l'administrateur DOIT pouvoir créer depuis la
  demande une commande marquée « financée », sans paiement du client. Cette commande DOIT
  décompter le stock et être suivie comme une commande normale (préparation, expédition,
  livraison, garanties), et apparaître dans « Mon compte ».
- **FR-047** : Une commande « financée » NE DOIT donner lieu à aucune facture adressée au
  client par le site ; la facturation relève de l'organisme de financement, hors du site.

**Administration et règles commerciales**

- **FR-039** : F04 DOIT livrer les écrans d'administration nécessaires : liste et détail des
  commandes, réception d'un virement, expédition, remboursement, demandes de financement,
  codes promo, frais et modes de livraison. Le back-office complet (F13) les étendra.
- **FR-040** : Les frais de port, seuils, délais, durées de financement, codes promo et
  règles de cumul DOIVENT être des paramètres modifiables par l'administrateur, jamais
  codés en dur.
- **FR-041** : Toute action sur une commande, un paiement, un remboursement ou une demande
  de financement DOIT être journalisée avec son auteur et sa date.
- **FR-042** : Les clés et secrets du service de paiement NE DOIVENT JAMAIS figurer dans le
  code.

**Charte, accessibilité et langue**

- **FR-043** : Tous les montants DOIVENT être affichés HT en premier, avec la TVA et le TTC
  détaillés.
- **FR-044** : Tous les écrans et emails de F04 DOIVENT respecter la charte, le niveau WCAG
  2.2 AA, le vouvoiement et le ton sobre du site.
- **FR-045** : Aucun champ de F04 NE DOIT inviter à saisir une donnée de patient.

### Key Entities

- **Panier** : rattaché à un compte ou à un visiteur. Lignes d'achat et lignes de mise à
  disposition, code promo, bons d'achat utilisés.
- **Ligne de panier** : article et configuration, formule (achat ou mise à disposition),
  quantité, prix appliqué.
- **Commande (commande de vente)** : client, adresses, lignes, mode de livraison, mode de
  paiement (carte, virement ou financée), montants HT, TVA et TTC, statut, dates.
- **Paiement** : commande ou abonnement concerné, moyen, montant, état, référence externe.
  Aucune donnée de carte.
- **Abonnement de mise à disposition** : client, équipement, montant du premier mois et des
  suivants, moyen de prélèvement, état, échéances.
- **Facture** : numéro continu, commande ou échéance, lignes, montants, mentions légales,
  PDF.
- **Avoir** : numéro continu, facture d'origine, montant remboursé, motif.
- **Mode de livraison** : libellé, forfait, délai estimé, conditions de disponibilité, seuil
  de franco de port.
- **Tarif de livraison spécifique** : pour un équipement volumineux, prix de livraison et
  d'installation.
- **Code promo** : code, type et valeur de la remise, période, limites d'usage, règle de
  cumul.
- **Demande de financement** : client, équipements, durée souhaitée, informations sur le
  cabinet, mensualité indicative, statut, notes internes, historique.
- **Journal des opérations** : actions sensibles sur les commandes, paiements,
  remboursements et demandes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** : Un paiement American Express aboutit, et la commande apparaît dans le
  back-office et dans « Mon compte » en moins d'une minute.
- **SC-002** : Aucune commande payée n'est perdue ni créée en double (0 cas sur l'ensemble
  des tests, y compris confirmations tardives, répétées et simultanées).
- **SC-003** : Un remboursement fait depuis le back-office ou depuis Stripe met à jour le
  statut de la commande dans « Mon compte » en moins de 5 minutes.
- **SC-004** : Un client validé dont les adresses sont enregistrées passe du panier à la
  confirmation en moins de 2 minutes.
- **SC-005** : Au moins 70 % des clients validés qui entrent dans le tunnel vont jusqu'à la
  confirmation.
- **SC-006** : 100 % des commandes payées ont une facture, et la numérotation des factures
  et des avoirs ne présente ni trou ni doublon.
- **SC-007** : Après un paiement refusé, 100 % des paniers et des saisies sont conservés.
- **SC-008** : Aucune donnée de carte bancaire n'est présente dans les données ni dans les
  journaux du site.
- **SC-009** : Aucun compte non validé ne parvient à finaliser une commande.
- **SC-010** : Une demande de financement est envoyée en moins de 3 minutes, et son statut
  est visible dans « Mon compte » dès l'envoi.
- **SC-011** : Aucun nom d'organisme de financement n'apparaît dans les écrans et emails
  du parcours client.
- **SC-012** : Un audit des écrans de F04 ne relève aucune non-conformité WCAG 2.2 AA, et
  tout le tunnel est réalisable au clavier seul.

## Assumptions

Les points marqués « confirmé » n'étaient pas tranchés dans la demande initiale ; ils ont été
validés par la responsable du projet le 2026-10-12.

- **Frontière avec F05 (confirmé, à réajuster avec F05)** : F04 gère la ligne de mise à disposition dans le
  panier, le paiement du premier mois et la création de l'abonnement. Le choix des options,
  le contrat, la résiliation, les retours et les échéances impayées relèvent de F05. Cette
  frontière sera réajustée lors de la spécification de F05.
- **Bons d'achat (confirmé)** : ils s'appliquent comme une remise commerciale sur les
  achats, pas sur les mises à disposition ni sur les frais de port. Leur traitement
  comptable et fiscal est à valider par l'expert-comptable d'ExploCardio.fr. Ils ne sont
  utilisables qu'une fois F06 livré.
- **Cumul des remises (confirmé)** : un seul code promo par commande ; il se cumule avec
  les dégressifs de quantité et les bons d'achat, sauf réglage contraire de
  l'administrateur.
- **Qui peut demander un financement (confirmé)** : tout compte connecté, validé ou en
  attente de validation. Un visiteur est invité à créer un compte.
- **Virement (confirmé)** : proposé pour tout achat, sans montant minimum. La commande
  est payée quand l'administrateur enregistre la réception ; aucune facture n'est émise
  avant, seulement un récapitulatif de commande.
- **Annulation et retours (confirmé)** : le client ne peut pas annuler ni retourner une
  commande en ligne ; il contacte l'équipe, qui annule ou rembourse depuis le back-office.
  Les conditions (vente entre professionnels, sans droit de rétractation légal) sont fixées
  par les CGV.
- **Panier d'un visiteur (confirmé)** : conservé 30 jours sur son appareil. Le panier
  d'un compte n'expire pas.
- **Express (confirmé)** : proposé seulement si tous les articles du panier sont en
  stock et si la commande est passée avant une heure limite réglée par l'administrateur.
- **Relance de panier abandonné (confirmé)** : aucune relance par email dans cette
  version.
- **Facturation d'un équipement financé** : hypothèse retenue — le site n'émet pas de
  facture au client pour une commande « financée ». Le circuit exact (facture à l'organisme
  de financement) est à valider par l'expert-comptable d'ExploCardio.fr.
- **Taux de TVA** : celui de chaque article (F03), 20 % par défaut. Ventes en France
  métropolitaine uniquement.
- **Mentions des factures** : la liste des mentions légales et le format de numérotation
  sont à valider par l'expert-comptable d'ExploCardio.fr avant la mise en ligne.
- **Emails** : envoyés par l'outil d'emailing d'ExploCardio.fr, à la charte.
- **Stripe** : ExploCardio.fr dispose d'un compte Stripe actif acceptant American Express et
  le prélèvement SEPA.
- **Référentiel de gestion** : commandes, factures, avoirs et stocks sont lus et écrits par
  la couche d'accès unique, reprise par Odoo lors de F11.
- **Périmètre** : site en français, professionnels de santé de France métropolitaine, aucune
  donnée de patient.
