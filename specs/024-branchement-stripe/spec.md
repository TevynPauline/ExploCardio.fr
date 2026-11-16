# Feature Specification: F24 — Branchement de Stripe

**Feature Branch**: `024-branchement-stripe`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "F24 — Branchement de Stripe (mode réel du connecteur Stripe). Contexte : compte Stripe d'EXPLOCARDIO.FR créé le 2026-11-14 (SARL, gérant représentant, dossier envoyé ; activité « autorisée sous condition » (matériel médical) : informations complémentaires à fournir avant le 28 novembre 2026, sinon virements suspendus) ; Radar Lite ; moyens activés : cartes (CB, Visa, Mastercard, American Express), Apple Pay, Google Pay, prélèvement SEPA ; Klarna, Link et autres désactivés ; libellé de relevé EXPLOCARDIO.FR, libellé abrégé EXPLOCARD (suffixe : numéro de commande) ; image de marque : fond ivoire #FAF8F4, accent #3F7068, logo de la charte ; Pauline a un accès Développeur, Régis est propriétaire. L'interface du connecteur existe avec son mode démonstration et ses tests de contrat ; la route de réception des événements existe, traitement idempotent. Objectif : écrire le mode réel (pages de paiement hébergées par Stripe, abonnements mensuels avec un élément par location, mandat SEPA, prélèvements ponctuels sur l'autorisation conservée, remboursements, résiliation, vérification de signature des événements), activé par configuration, mêmes données et mêmes erreurs qu'en démonstration. Règles F04 : achats par carte (ou virement hors Stripe), abonnements (F05, F12) par carte ou SEPA ; montants TTC en centimes ; idempotence par clé ; aucune donnée de carte sur le site. Recette en mode test Stripe sur l'app Scalingo de recette (F15) ; clés de production seulement à l'ouverture. Reçus et factures Stripe désactivés. Hors périmètre : calcul de TVA par Stripe, facturation Stripe, Stripe Connect, terminal de paiement, Radar avancé."

## Contexte et objectif

Le site encaisse déjà tous ses paiements en démonstration (F04, F05, F12) : une page de
paiement simulée émet les mêmes événements que Stripe vers le même gestionnaire du site.
F24 donne au connecteur Stripe son **mode réel** : les mêmes opérations, servies par le
compte Stripe d'ExploCardio.fr, sans modifier les pages ni les parcours.

État du compte au 2026-11-14 :

- compte de la SARL créé, dossier de vérification envoyé (société, gérant, compte bancaire) ;
- activité « autorisée sous condition » (matériel médical) : Stripe demande des
  informations complémentaires **avant le 28 novembre 2026**, faute de quoi les virements
  vers le compte bancaire seront suspendus ;
- moyens de paiement activés : cartes (CB, Visa, Mastercard, American Express), Apple Pay,
  Google Pay, prélèvement SEPA ; les autres (paiement fractionné, Link…) sont désactivés ;
- libellé sur les relevés : `EXPLOCARDIO.FR` ; libellé abrégé : `EXPLOCARD` ;
- image de marque de la page de paiement : fond ivoire, couleur d'action de la charte, logo
  ExploCardio.fr ;
- protection contre la fraude de base (incluse).

Le branchement suit le même chemin qu'Odoo (F14) : **mode test** de Stripe sur le site de
recette, puis **mode production** sur le site public à l'ouverture, par simple changement
de configuration.

**Phases** : les critères de configuration, de sécurité et de non-régression de la
démonstration se vérifient en **[Phase 1]** ; les parcours de paiement se vérifient en
**[Phase 3]**, avec Stripe en mode test.

## Clarifications

### Session 2026-11-16

- Q : une location payée par prélèvement SEPA attend-elle la confirmation du premier
  prélèvement (plusieurs jours) avant l'envoi du matériel ? → R : non (option A, Régis) :
  la souscription est confirmée dès la signature du mandat ; un rejet ultérieur suit les
  règles d'impayé de F05. Régis demande par ailleurs que la livraison au lendemain ne soit
  jamais présentée comme une promesse sans condition (stock, logistique) : point traité
  dans les textes du site, hors F24.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Payer un achat par carte sur la vraie page de paiement (Priority: P1)

Un cardiologue valide son panier. Il est dirigé vers la page de paiement de Stripe, aux
couleurs d'ExploCardio.fr, voit le montant TTC de sa commande, paie par carte (ou Apple Pay,
Google Pay) avec authentification forte, puis revient sur le site qui confirme sa commande.

**Why this priority**: c'est le parcours qui fait vivre le site ; sans lui, aucune vente en
ligne n'est possible à l'ouverture.

**Independent Test**: sur le site de recette, passer une commande avec une carte de test
Stripe, avec et sans authentification forte, puis avec une carte refusée ; vérifier la
commande, l'email et le panier.

**Acceptance Scenarios**:

1. **Given** un panier d'achats validé, **When** le cardiologue choisit le paiement par
   carte, **Then** il arrive sur la page de paiement hébergée par Stripe qui affiche le
   logo, le nom ExploCardio.fr, le montant TTC exact du récapitulatif et seulement les
   moyens autorisés pour un achat.
2. **Given** un paiement accepté, **When** Stripe confirme le paiement, **Then** la commande
   est créée une seule fois, le panier est vidé et la page de confirmation et l'email du
   site sont émis, exactement comme en démonstration.
3. **Given** une carte refusée, **When** le paiement échoue, **Then** le cardiologue revient
   au site avec un message clair et son panier intact.
4. **Given** une authentification forte demandée par la banque, **When** le cardiologue la
   valide dans l'application de sa banque, **Then** le paiement aboutit ; s'il l'abandonne,
   aucune commande n'est créée.
5. **Given** que le cardiologue ferme la page de paiement, **When** il revient sur le site,
   **Then** son panier est conservé et aucune commande n'est créée.

---

### User Story 2 - Souscrire une mise à disposition ou un abonnement logiciel (Priority: P1)

Un cardiologue souscrit une mise à disposition mensuelle (F05) ou l'abonnement au logiciel
Cloud (F12). Sur la page de Stripe, il paie le premier mois et autorise les prélèvements
mensuels, par carte ou par prélèvement SEPA (mandat signé en ligne). Chaque mois, l'échéance
est prélevée et le site en est informé.

**Why this priority**: la mise à disposition est l'offre phare ; elle repose entièrement sur
le prélèvement mensuel.

**Independent Test**: en mode test, souscrire une mise à disposition par carte puis par
SEPA, avec deux locations dans la même souscription ; faire avancer l'horloge de test de
Stripe d'un mois ; vérifier l'échéance payée puis une échéance refusée.

**Acceptance Scenarios**:

1. **Given** une souscription par carte, **When** le premier mois est payé, **Then**
   l'abonnement est actif sur le site, avec un élément par location, et la prochaine
   échéance est affichée au tarif des mois suivants.
2. **Given** une souscription par prélèvement SEPA, **When** le cardiologue signe le mandat
   en ligne, **Then** la souscription est confirmée aussitôt et le matériel part sans
   attendre la confirmation du premier prélèvement (FR-012) ; un rejet ultérieur est
   traité comme une échéance refusée.
3. **Given** un abonnement logiciel souscrit avant la fin de la période incluse, **When** il
   est validé, **Then** aucun montant n'est prélevé tout de suite et la première mensualité
   tombe à la date de fin de la période incluse (F12).
4. **Given** une échéance mensuelle, **When** elle est payée, **Then** le site reçoit
   l'événement « échéance payée » et déclenche la facture Odoo et l'email, une seule fois.
5. **Given** une échéance refusée, **When** Stripe le signale, **Then** le site applique les
   règles d'impayé de F05 (client prévenu, nouvelles tentatives, suspension au terme).

---

### User Story 3 - Gérer la fin, les retraits et les sommes dues d'une location (Priority: P2)

L'équipe arrête une location parmi plusieurs, résilie un abonnement, prélève une somme due
(retard, dégradation) sur l'autorisation conservée, puis libère cette autorisation une fois
le matériel rendu et tout réglé. Elle peut aussi rembourser un paiement.

**Why this priority**: indispensable au cycle de vie d'une location (F05), mais moins
fréquent que la souscription.

**Independent Test**: en mode test, sur un abonnement à deux locations : retirer une
location, la rétablir, résilier, prélever un montant ponctuel, libérer l'autorisation puis
tenter un nouveau prélèvement (refusé) ; rembourser partiellement un achat.

**Acceptance Scenarios**:

1. **Given** un abonnement à deux locations, **When** l'une est retirée à une date,
   **Then** seules ses mensualités s'arrêtent à cette date et l'autorisation de prélèvement
   reste valable.
2. **Given** une location retirée, **When** l'équipe annule le retrait (« Prolonger »),
   **Then** la location est de nouveau prélevée chaque mois.
3. **Given** une autorisation conservée, **When** l'équipe prélève une somme ponctuelle avec
   son libellé, **Then** le montant est prélevé une seule fois, même si l'action est rejouée,
   et le résultat (payé ou refusé) est connu.
4. **Given** une autorisation libérée, **When** un prélèvement ponctuel est demandé,
   **Then** il est refusé avec la même erreur qu'en démonstration.
5. **Given** un paiement d'achat, **When** l'équipe rembourse tout ou partie, **Then** le
   remboursement est fait une seule fois et le site reçoit l'événement « remboursement ».

---

### User Story 4 - Recevoir les événements de Stripe en toute sécurité (Priority: P1)

Stripe informe le site de chaque paiement, échéance et remboursement. Le site n'accepte que
les messages réellement émis par Stripe et traite chacun une seule fois, même s'il arrive
en retard, en double ou dans le désordre.

**Why this priority**: c'est ce qui crée les commandes ; un message falsifié ou traité deux
fois créerait une commande non payée ou en double.

**Independent Test**: envoyer au site un événement de test de Stripe, puis le même rejoué,
puis un message à la signature falsifiée.

**Acceptance Scenarios**:

1. **Given** un événement émis par Stripe, **When** le site le reçoit, **Then** sa signature
   est vérifiée et il est traduit dans le même événement typé qu'en démonstration.
2. **Given** un message à la signature absente ou fausse, **When** il arrive, **Then** il
   est rejeté sans aucun effet.
3. **Given** un événement déjà traité, **When** Stripe le renvoie, **Then** il n'a aucun
   nouvel effet.
4. **Given** un événement que le site n'utilise pas, **When** il arrive, **Then** il est
   accepté et ignoré, sans erreur ni nouvelle tentative de Stripe.

---

### User Story 5 - Basculer du test à la production sans risque (Priority: P2)

L'équipe configure le site de recette avec les clés de test, puis, à l'ouverture, le site
public avec les clés de production. Une erreur de configuration est détectée avant tout
paiement.

**Why this priority**: c'est la condition d'une ouverture sereine, mais elle n'intervient
qu'une fois.

**Independent Test**: démarrer le site de recette avec une clé de production, puis le site
public avec une clé de test, puis avec une variable manquante ; vérifier les refus.

**Acceptance Scenarios**:

1. **Given** le connecteur en mode réel sans clé ou sans secret de signature, **When** une
   opération est demandée, **Then** elle échoue avec « configuration incomplète » et le site
   ne bascule jamais en démonstration.
2. **Given** le site de recette, **When** il est configuré avec une clé de production,
   **Then** il refuse de démarrer les paiements et le signale.
3. **Given** le site public, **When** il est configuré avec une clé de test, **Then** il
   refuse de même.
4. **Given** le connecteur en mode démonstration, **When** F24 est livré, **Then** la
   démonstration fonctionne exactement comme avant.

### Edge Cases

- Paiement confirmé après que le cardiologue a fermé l'onglet : la commande est créée quand
  même, à réception de l'événement.
- Événements reçus dans le désordre (échéance refusée avant le paiement initial) : le
  traitement reste cohérent.
- Stripe indisponible à l'ouverture de la page de paiement : message clair, panier conservé,
  erreur « service indisponible » comme en démonstration.
- Prélèvement SEPA rejeté plusieurs jours après la signature du mandat (compte clôturé,
  opposition) : traité comme une échéance refusée.
- Contestation d'un paiement par le client (rétrofacturation) : l'équipe est alertée ; le
  traitement est manuel dans Stripe.
- Montant à 0 (premier mois offert, prise d'effet différée) : l'autorisation est recueillie
  sans prélèvement.
- Client déjà connu de Stripe : le même client est réutilisé, sans doublon.
- Remboursement supérieur au montant restant : refusé.
- Carte expirée pendant un abonnement : traitée comme une échéance refusée ; le client peut
  mettre à jour son moyen de paiement depuis un lien sécurisé de Stripe.

## Requirements *(mandatory)*

### Functional Requirements

**Branchement et configuration**

- **FR-001** : Le connecteur Stripe DOIT disposer d'un mode réel offrant toutes les
  opérations du contrat existant (sessions de paiement et d'abonnement, remboursement,
  résiliation, retrait et rétablissement d'un élément, prélèvement ponctuel, libération de
  l'autorisation, vérification d'un événement), sans modification des pages ni des
  parcours.
- **FR-002** : Le passage en mode réel DOIT se faire par configuration seule
  (mode du connecteur, clé secrète, secret de signature des événements).
- **FR-003** : Une configuration réelle incomplète DOIT faire échouer chaque opération avec
  « configuration incomplète », sans jamais basculer en démonstration.
- **FR-004** : Le site de recette DOIT n'accepter que des clés de test et le site public que
  des clés de production ; toute incohérence DOIT bloquer les paiements et être signalée à
  l'administrateur.
- **FR-005** : La clé utilisée par le site DOIT être limitée aux seules permissions
  nécessaires à ses opérations.
- **FR-006** : Les clés et secrets NE DOIVENT JAMAIS figurer dans le code, le dépôt ni les
  journaux.

**Paiement des achats**

- **FR-007** : Un achat DOIT être payé sur la page de paiement hébergée par Stripe, par carte
  (CB, Visa, Mastercard, American Express), y compris par Apple Pay et Google Pay, avec
  authentification forte quand la banque l'exige. Le prélèvement SEPA et le paiement
  fractionné NE DOIVENT PAS être proposés pour un achat ; le virement reste traité hors
  Stripe (F04).
- **FR-008** : La page de paiement DOIT afficher le montant TTC exact du récapitulatif du
  site, en euros, au centime près.
- **FR-009** : Sur le relevé du client, le paiement DOIT apparaître sous le libellé
  `EXPLOCARDIO.FR`, complété du numéro de commande quand c'est possible.

**Abonnements**

- **FR-010** : Une mise à disposition (F05) ou un abonnement logiciel (F12) DOIT être
  souscrit sur la page de Stripe, par carte ou par prélèvement SEPA avec mandat signé en
  ligne : premier montant, puis mensualité au tarif des mois suivants.
- **FR-011** : Chaque location DOIT être un élément distinct de l'abonnement, pour pouvoir
  être arrêtée, rétablie ou facturée seule.
- **FR-012** : Pour un paiement par prélèvement SEPA, dont la confirmation par la banque
  prend plusieurs jours, la souscription DOIT être confirmée **dès la signature du mandat**
  : la commande est enregistrée et le matériel préparé et expédié selon les règles et les
  délais habituels, sans attendre la confirmation du premier prélèvement. Un rejet
  ultérieur du premier prélèvement DOIT être traité comme une échéance refusée (règles
  d'impayé de F05) et signalé à l'administrateur.
- **FR-013** : Une prise d'effet différée DOIT recueillir l'autorisation sans prélèvement et
  placer la première mensualité à la date prévue.
- **FR-014** : Les nouvelles tentatives après un prélèvement refusé et la suspension pour
  impayé DOIVENT suivre les règles de F05 (réglées dans Odoo) ; le comportement automatique
  de Stripe NE DOIT PAS les contredire (pas de résiliation automatique par Stripe).
- **FR-015** : Un client DOIT pouvoir mettre à jour la carte ou le compte bancaire de son
  abonnement par un lien sécurisé de Stripe, sans que ces données passent par le site.

**Opérations de l'équipe**

- **FR-016** : Le retrait d'une location DOIT arrêter ses seules mensualités à la date
  d'effet, sans libérer l'autorisation ; le rétablissement DOIT les reprendre.
- **FR-017** : Un prélèvement ponctuel DOIT utiliser l'autorisation conservée, porter un
  libellé et renvoyer son résultat (payé ou refusé). Après libération de l'autorisation, il
  DOIT être refusé (« opération refusée »).
- **FR-018** : La résiliation DOIT arrêter toutes les mensualités à la date de fin.
- **FR-019** : Un remboursement, total ou partiel, DOIT être limité au montant restant
  remboursable.
- **FR-020** : Toute opération d'écriture DOIT être idempotente par sa clé : rejouée, elle ne
  produit aucun second effet et renvoie le même résultat.

**Événements**

- **FR-021** : Le site DOIT vérifier la signature de chaque événement reçu et rejeter tout
  message non signé ou mal signé.
- **FR-022** : Les événements de Stripe DOIVENT être traduits dans les six événements typés
  existants (paiement réussi, paiement refusé, authentification requise, échéance payée,
  échéance refusée, remboursement), avec les mêmes champs qu'en démonstration.
- **FR-023** : Chaque événement DOIT être traité une seule fois, quel que soit son ordre ou
  son nombre d'arrivées ; les événements non utilisés DOIVENT être acceptés et ignorés.
- **FR-024** : Une contestation de paiement (rétrofacturation) DOIT déclencher une alerte à
  l'administrateur.

**Données, documents et sécurité**

- **FR-025** : Aucune donnée de carte ni coordonnée bancaire NE DOIT transiter par le site
  ni y être stockée.
- **FR-026** : Stripe NE DOIT recevoir que le strict nécessaire : nom et email du client,
  référence du client, référence de commande ou d'abonnement, montants et libellés ; jamais
  de donnée de santé.
- **FR-027** : Les reçus et factures envoyés par Stripe aux clients DOIVENT être désactivés :
  seules les factures d'Odoo et les emails du site leur parviennent.
- **FR-028** : Les montants DOIVENT être transmis TTC, en centimes, calculés par le site ;
  Stripe NE DOIT PAS calculer de taxe.
- **FR-029** : Chaque opération et chaque événement DOIVENT être journalisés (date, type,
  références, résultat), sans aucune donnée de paiement sensible.

**Tests**

- **FR-030** : Le mode réel DOIT passer les mêmes tests de contrat que le mode démonstration,
  exécutés contre Stripe en mode test.
- **FR-031** : Les erreurs DOIVENT être les mêmes dans les deux modes (service indisponible,
  introuvable, opération refusée, signature invalide, configuration incomplète).

### Key Entities

- **Client Stripe** : reflet minimal d'un client du site (référence, nom, email), réutilisé
  pour tous ses paiements.
- **Session de paiement** : passage d'un cardiologue sur la page de Stripe pour un achat ou
  une souscription ; liée à une commande ou à un abonnement du site.
- **Abonnement** : prélèvement mensuel d'un client, composé d'un élément par location ou
  par abonnement logiciel, adossé à une autorisation (carte ou mandat SEPA).
- **Autorisation de prélèvement** : moyen de paiement conservé pour les échéances et les
  prélèvements ponctuels, jusqu'à sa libération.
- **Événement de paiement** : message de Stripe traduit en l'un des six événements typés,
  traité une seule fois.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** [Phase 3] : 100 % des tests de contrat du connecteur Stripe passent dans les
  deux modes.
- **SC-002** [Phase 3] : sur le site de recette, un cardiologue paie un achat par carte et
  voit sa commande confirmée en moins de 2 minutes, authentification forte comprise.
- **SC-003** [Phase 3] : rejouer 10 fois le même événement ou la même opération produit
  exactement un effet.
- **SC-004** [Phase 3] : 100 % des messages à la signature falsifiée sont rejetés sans effet.
- **SC-005** [Phase 3] : sur un abonnement de test avancé de trois mois, chaque échéance
  produit exactement une facture Odoo et un email ; une échéance refusée déclenche les
  règles d'impayé de F05.
- **SC-006** [Phase 1] : avec le connecteur en démonstration, toute la suite de tests
  existante passe sans modification.
- **SC-007** [Phase 1] : une configuration incomplète ou incohérente (clé de test sur le
  site public, clé de production sur la recette) est refusée dans 100 % des cas.
- **SC-008** [Phase 3] : aucune donnée de carte ni coordonnée bancaire n'apparaît dans les
  journaux, la base ou les emails du site.

## Assumptions

- Le dossier de vérification de Stripe est accepté, y compris les informations
  complémentaires demandées pour le matériel médical, **avant le 28 novembre 2026** (action
  de Régis, guidée). Le mode test fonctionne sans attendre cette validation.
- Les moyens de paiement, le libellé de relevé et l'image de marque sont réglés dans le
  tableau de bord de Stripe (fait le 2026-11-14) ; F24 ne les modifie pas.
- La protection contre la fraude de base suffit : comptes clients vérifiés, authentification
  forte des cartes, faibles volumes.
- Les commandes, factures et avoirs restent écrits dans Odoo par son connecteur (F14,
  lots 3 et 4) ; F24 ne fait que fournir les événements de paiement.
- Le site de recette (application Scalingo distincte) est créé avant la recette de F24 ;
  Stripe y est en mode test.
- L'adresse de réception des événements du site est déclarée dans Stripe, en mode test pour
  la recette, en mode production à l'ouverture ; le secret de signature correspondant est
  saisi dans la configuration de chaque site par Pauline ou Régis, jamais transmis dans
  une conversation.
- Les contestations de paiement se traitent à la main dans le tableau de bord de Stripe.

## Dépendances

- **F04, F05, F12** : parcours et règles de paiement, d'abonnement et d'impayé (inchangés).
- **F11** : contrat du connecteur, mode démonstration et tests de contrat.
- **F14** : écriture des commandes, factures et avoirs dans Odoo.
- **F15** : recette de bout en bout sur le site de recette.
- **F25** : envoi réel des emails déclenchés par les paiements.

## Hors périmètre

- Calcul de la TVA par Stripe, factures émises par Stripe.
- Paiement fractionné ou différé (Klarna et équivalents), Link.
- Stripe Connect, terminal de paiement en cabinet.
- Règles anti-fraude avancées (Radar payant).
- Paiement par virement (traité hors Stripe par F04).
