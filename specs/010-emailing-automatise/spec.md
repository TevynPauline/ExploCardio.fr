# Feature Specification: F10 — Emailing automatisé

**Feature Branch**: `010-emailing-automatise`

**Created**: 2026-10-13

**Status**: Draft

**Input**: User description: "F10 — Emailing automatisé : emails transactionnels toujours envoyés, scénarios automatisés paramétrables et désactivables par le client (réapprovisionnement, bons d'achat et droits d'assistance, fin de garantie, panier abandonné, promotions, factures impayées), respect du consentement, centre de préférences, modèles à la charte, outil d'envoi dédié. Objectif : faire revenir le client au bon moment et l'informer sans effort manuel."

## Contexte et objectif

F10 rassemble tous les emails que le site envoie. Il poursuit deux objectifs :

- **informer sans effort manuel** : chaque événement important (commande, expédition,
  facture, rendez-vous, demande) donne lieu à un email envoyé automatiquement ;
- **faire revenir le client au bon moment** : relance de réapprovisionnement avant qu'il
  manque de consommables, rappel avant la fin de ses droits d'assistance, de ses bons
  d'achat ou d'une garantie.

F10 distingue trois familles d'emails, aux règles différentes :

- les **emails transactionnels**, liés à une action ou à un engagement, toujours envoyés ;
- les **emails de service automatisés**, utiles au client et qu'il peut désactiver ;
- les **emails commerciaux**, réservés aux abonnés à la newsletter.

**Hors périmètre de F10** : le choix de l'outil d'envoi (fait lors de la planification) ; la
décision d'envoyer, qui appartient à chaque module (F02 pour les comptes, F04 pour les
commandes, F05 pour les locations, F06 pour la fidélité et les promotions, F07 pour les
garanties et le SAV, F08 pour les rendez-vous, F09 pour les demandes de rappel) ; le
recueil du consentement à la newsletter (F01, F02) ; le back-office complet (F13).

**Lien avec les autres modules** : les modules déclenchent, F10 met en forme, envoie et
trace. « Mon compte » (F02) accueille le centre de préférences. Les emails affichent le
numéro de la hotline et ses horaires (F09).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Être informé à chaque étape (Priority: P1)

Le client reçoit, sans rien demander, un email à chaque étape importante : inscription,
validation de son compte, commande, expédition, facture, location, rendez-vous, demandes.

**Why this priority**: ces emails sont attendus et parfois obligatoires. Sans eux, le client
appelle pour savoir où en est sa commande.

**Independent Test**: dérouler une inscription, une commande jusqu'à l'expédition et une
réservation de rendez-vous, et vérifier la réception, le contenu et la présentation de
chaque email.

**Acceptance Scenarios**:

1. **Given** l'un des événements suivants : inscription, validation du compte, commande
   confirmée, expédition, facture disponible, échéance ou prélèvement de location,
   résiliation, rendez-vous confirmé ou rappelé, demande de SAV, demande de financement,
   **When** il se produit, **Then** le client reçoit l'email correspondant.
2. **Given** un email transactionnel, **When** le client a désactivé tous les emails
   facultatifs et n'est pas abonné à la newsletter, **Then** il le reçoit tout de même.
3. **Given** un email d'expédition, **When** il est reçu, **Then** il contient le suivi du
   colis.
4. **Given** un email annonçant une facture, **When** il est reçu, **Then** il mène à la
   facture dans « Mon compte », après connexion.
5. **Given** n'importe quel email, **When** il s'affiche, **Then** il respecte la charte
   (logo, police, couleur d'action, ton sobre, vouvoiement) et indique le numéro de la
   hotline et ses horaires.
6. **Given** un même événement signalé deux fois, **When** il est traité, **Then** le
   client ne reçoit qu'un seul email.
7. **Given** un email transactionnel qui ne peut pas être délivré, **When** l'échec est
   connu, **Then** l'administrateur en est alerté.

---

### User Story 2 - Être relancé avant de manquer de consommables (Priority: P1)

Un client commande ses électrodes tous les deux mois. Une semaine avant la date où il
devrait recommander, il reçoit une relance avec un lien pour commander de nouveau.

**Why this priority**: c'est le premier critère d'acceptation et le cœur de l'objectif
« faire revenir le client au bon moment ». Les consommables portent aussi le programme de
fidélité.

**Independent Test**: avec un compte ayant commandé le même consommable à intervalles de
deux mois, vérifier l'envoi d'une relance environ une semaine avant l'échéance prévue, puis
son absence si le client a déjà recommandé.

**Acceptance Scenarios**:

1. **Given** un client qui commande un consommable à un rythme régulier, **When** la date
   prévue de sa prochaine commande approche, **Then** il reçoit une relance environ une
   semaine avant cette date.
2. **Given** une relance, **When** elle est reçue, **Then** elle rappelle le consommable
   concerné, son prix HT, et propose de le commander de nouveau en un geste.
3. **Given** un client qui a déjà recommandé ce consommable, **When** l'échéance approche,
   **Then** aucune relance n'est envoyée.
4. **Given** un client dont l'historique est insuffisant ou trop irrégulier, **When** le
   calcul est fait, **Then** aucune relance n'est envoyée.
5. **Given** une relance déjà envoyée pour une échéance, **When** le client ne commande
   pas, **Then** elle n'est pas renvoyée pour cette même échéance.
6. **Given** une relance, **When** elle est préparée, **Then** elle rappelle, s'il y a
   lieu, ce que la commande rapporterait en bons d'achat et en droits d'assistance.
7. **Given** un client qui a désactivé ces relances, **When** l'échéance approche,
   **Then** aucune relance ne lui est envoyée.

---

### User Story 3 - Ne recevoir que ce à quoi on a consenti (Priority: P1)

Un client qui n'est pas abonné à la newsletter ne reçoit aucun email promotionnel. Un abonné
se désinscrit en un geste depuis n'importe quel email commercial.

**Why this priority**: c'est un critère d'acceptation et une obligation légale (principe V).
Un email promotionnel non consenti expose ExploCardio.fr et agace un médecin.

**Independent Test**: lancer une promotion avec deux comptes, l'un abonné, l'autre non, et
vérifier que seul l'abonné la reçoit ; se désinscrire depuis l'email et vérifier qu'aucun
email commercial n'est plus reçu.

**Acceptance Scenarios**:

1. **Given** un client non abonné à la newsletter, **When** une promotion, une vente flash
   ou une nouveauté est annoncée, **Then** il ne reçoit aucun email à ce sujet.
2. **Given** un abonné, **When** il reçoit un email commercial, **Then** celui-ci
   comporte un lien de désinscription, utilisable sans se connecter.
3. **Given** un abonné qui se désinscrit, **When** sa désinscription est enregistrée,
   **Then** il ne reçoit plus aucun email commercial, et continue de recevoir les emails
   transactionnels.
4. **Given** un email commercial déjà programmé, **When** le destinataire se désinscrit
   avant l'envoi, **Then** il ne le reçoit pas.
5. **Given** un client non abonné à la newsletter, **When** un scénario de
   réapprovisionnement, de panier abandonné ou d'alerte le concerne, **Then** il reçoit
   l'email, avec un lien pour désactiver ce type d'envoi.

---

### User Story 4 - Choisir ce qu'on reçoit (Priority: P2)

Dans « Mon compte », le client règle ses préférences : il active ou désactive chaque type
d'email facultatif et voit ceux qu'il recevra toujours.

**Why this priority**: le choix fin évite qu'un client se désinscrive de tout parce qu'un
seul type d'email le gêne.

**Independent Test**: désactiver un type d'email, vérifier qu'il n'est plus envoyé et que
les autres le sont, puis le réactiver.

**Acceptance Scenarios**:

1. **Given** un client connecté, **When** il ouvre ses préférences de communication,
   **Then** il voit chaque type d'email facultatif avec un réglage, et la liste des emails
   toujours envoyés, avec l'explication.
2. **Given** un type d'email désactivé, **When** son déclencheur se produit, **Then**
   l'email n'est pas envoyé.
3. **Given** un changement de préférence, **When** il est enregistré, **Then** il
   s'applique aux envois suivants, y compris ceux déjà programmés.
4. **Given** le bas d'un email facultatif, **When** le client suit le lien de gestion des
   préférences, **Then** il peut les modifier sans se connecter.
5. **Given** un abonné à la newsletter sans compte, **When** il suit le lien d'un email,
   **Then** il peut se désinscrire ou modifier ses préférences.

---

### User Story 5 - Être prévenu avant de perdre un avantage (Priority: P2)

Le client est prévenu avant que ses bons d'achat n'expirent, que ses droits d'assistance ne
prennent fin ou qu'une garantie n'arrive à échéance.

**Why this priority**: ces alertes rendent le programme de fidélité vivant et évitent les
mauvaises surprises, mais le programme fonctionne sans elles.

**Independent Test**: placer un compte à quelques jours de la fin de ses droits, de
l'expiration de bons et de la fin d'une garantie, et vérifier chaque alerte.

**Acceptance Scenarios**:

1. **Given** des droits d'assistance proches de leur fin, **When** le délai de prévenance
   est atteint, **Then** le client reçoit un email indiquant la date de fin et comment les
   prolonger (« commandez avant le … pour garder votre assistance »).
2. **Given** des bons d'achat proches de leur expiration, **When** le délai de prévenance
   est atteint, **Then** le client reçoit un email indiquant son solde, le montant qui
   expire et la date.
3. **Given** une garantie proche de sa fin, **When** le délai de prévenance est atteint,
   **Then** le client reçoit un email indiquant l'appareil et la date.
4. **Given** une alerte déjà envoyée pour une échéance, **When** le temps passe, **Then**
   elle n'est pas renvoyée pour la même échéance.
5. **Given** une alerte devenue sans objet (droits prolongés, bons utilisés), **When**
   l'échéance approche, **Then** elle n'est pas envoyée.

---

### User Story 6 - Reprendre un panier laissé en attente (Priority: P2)

Le client a rempli un panier puis est parti. Il reçoit un rappel qui le ramène à son panier.

**Why this priority**: la relance récupère des commandes, mais elle est secondaire par
rapport aux emails attendus par le client.

**Independent Test**: laisser un panier sans commander avec un compte connecté et vérifier
l'envoi d'un seul rappel après le délai fixé, puis son absence si la commande a été passée.

**Acceptance Scenarios**:

1. **Given** un client connecté ayant un panier non commandé, **When** le délai fixé par
   l'administrateur est écoulé, **Then** il reçoit un rappel menant à son panier.
2. **Given** un panier commandé ou vidé avant ce délai, **When** le délai est écoulé,
   **Then** aucun rappel n'est envoyé.
3. **Given** un rappel déjà envoyé pour un panier, **When** le panier reste inchangé,
   **Then** aucun autre rappel n'est envoyé.
4. **Given** un rappel, **When** il est reçu, **Then** il indique les articles, leurs prix
   HT en vigueur et leur disponibilité, sans promettre un prix qui aurait changé.

---

### User Story 7 - Être relancé pour une facture impayée (Priority: P2)

Un paiement n'a pas abouti : virement attendu, prélèvement de location refusé. Le client
reçoit des relances graduées qui lui indiquent quoi régler et comment.

**Why this priority**: les relances protègent la trésorerie d'ExploCardio.fr et évitent au
client une suspension qu'il n'avait pas vue venir.

**Independent Test**: simuler un prélèvement refusé et un virement non reçu, et vérifier la
séquence des relances, puis leur arrêt dès la régularisation.

**Acceptance Scenarios**:

1. **Given** un paiement en attente ou refusé, **When** les échéances de relance fixées par
   l'administrateur sont atteintes, **Then** le client reçoit les relances successives,
   chacune indiquant le montant, l'objet et la façon de régulariser.
2. **Given** un paiement régularisé, **When** il est enregistré, **Then** les relances
   suivantes ne sont pas envoyées.
3. **Given** une relance d'impayé, **When** le client a désactivé les emails facultatifs,
   **Then** il la reçoit tout de même.
4. **Given** la dernière relance avant une conséquence (annulation de commande, suspension
   de l'accès Cloud), **When** elle est envoyée, **Then** elle annonce clairement cette
   conséquence et sa date.

---

### User Story 8 - Régler les scénarios et suivre les envois (Priority: P2)

L'administrateur active ou désactive chaque scénario, règle ses délais, modifie les textes
des modèles et consulte ce qui a été envoyé.

**Why this priority**: les réglages et les textes évolueront ; un développeur ne doit pas
être nécessaire pour changer un délai ou une phrase.

**Independent Test**: modifier le délai de la relance de réapprovisionnement et le texte
d'un modèle, envoyer un email de test, puis retrouver un envoi dans le suivi.

**Acceptance Scenarios**:

1. **Given** un administrateur, **When** il active, désactive ou règle un scénario (délai,
   seuil, nombre de relances), **Then** le changement s'applique aux envois suivants.
2. **Given** un modèle d'email, **When** l'administrateur modifie son objet ou son texte,
   **Then** il peut le prévisualiser et s'envoyer un email de test avant de le publier.
3. **Given** un modèle modifié, **When** il est publié, **Then** les emails suivants
   l'utilisent, et la charte reste respectée.
4. **Given** le suivi des envois, **When** l'administrateur recherche un client, **Then**
   il voit les emails qui lui ont été envoyés, leur date et leur état de remise.
5. **Given** un scénario, **When** l'administrateur consulte ses résultats, **Then** il
   voit le nombre d'emails envoyés, remis, ouverts et suivis d'une commande.
6. **Given** une adresse email qui rejette durablement les messages, **When** le rejet est
   connu, **Then** les envois facultatifs vers cette adresse cessent et l'administrateur
   en est informé.

---

### Edge Cases

- Plusieurs emails facultatifs dus au même client le même jour : ils sont regroupés ou
  étalés selon la limite de fréquence, sans retarder aucun email transactionnel.
- Client dont le rythme de commande change (plus rapide ou plus lent) : la date prévue est
  recalculée à chaque commande.
- Consommable retiré du catalogue ou indisponible : la relance n'est pas envoyée, ou propose
  son remplaçant s'il est défini.
- Client qui commande plusieurs consommables à des rythmes différents : une relance par
  échéance, regroupées quand elles sont proches.
- Compte suspendu, refusé ou supprimé : plus aucun email facultatif ni commercial ; les
  emails transactionnels dus pour des engagements en cours sont maintenus.
- Changement d'adresse email non encore confirmé : les emails vont à l'adresse confirmée.
- Email commercial programmé la nuit ou le week-end : il est envoyé à la prochaine plage
  autorisée ; les emails transactionnels partent sans délai.
- Outil d'envoi indisponible : les emails sont conservés et envoyés à son retour, sans
  doublon ; au-delà d'un délai, l'administrateur est alerté.
- Modèle comportant une information manquante (nom, montant) : l'email n'est pas envoyé
  avec un champ vide ; l'administrateur est alerté.
- Désinscription demandée par réponse à l'email plutôt que par le lien : elle est traitée
  par l'équipe et enregistrée.
- Lecture sur mobile, en mode sombre, ou images bloquées : l'email reste lisible et ses
  liens utilisables.
- Lecteur d'écran : l'email est structuré et ses images ont un texte de remplacement.

## Requirements *(mandatory)*

### Functional Requirements

**Familles d'emails**

- **FR-001** : Chaque email du site DOIT appartenir à l'une de trois familles :
  transactionnel, de service automatisé, ou commercial. La famille détermine qui le reçoit
  et s'il peut être désactivé.
- **FR-002** : Tous les emails du site DOIVENT être envoyés et tracés par F10, quel que soit
  le module qui les déclenche.

**Emails transactionnels**

- **FR-003** : Les emails transactionnels DOIVENT toujours être envoyés, sans condition de
  consentement ni de préférence. Ils comprennent au moins : confirmation d'inscription,
  validation du compte, confirmation de commande, expédition avec suivi, facture
  disponible, échéance et prélèvement de location, résiliation, confirmation et rappel de
  rendez-vous, demande de SAV, demande de financement.
- **FR-004** : Les emails de sécurité et de suivi prévus par les autres modules (mot de
  passe, changement d'email, remboursement et avoir, demande de rappel, décision sur un
  compte) DOIVENT relever de cette même famille.
- **FR-005** : Les relances de factures impayées DOIVENT relever de la famille
  transactionnelle : le client ne peut pas les désactiver.
- **FR-006** : Un email transactionnel NE DOIT contenir aucun message promotionnel.
- **FR-007** : Un même événement NE DOIT donner lieu qu'à un seul email.

**Emails de service automatisés**

- **FR-008** : Le site DOIT proposer les scénarios automatisés suivants, chacun activable,
  désactivable et réglable par l'administrateur : relance de réapprovisionnement, alerte de
  solde ou d'expiration de bons d'achat, alerte de fin prochaine des droits d'assistance,
  alerte de fin de garantie, panier abandonné.
- **FR-009** : Le client DOIT pouvoir désactiver chacun de ces scénarios séparément.
- **FR-010** : Un scénario NE DOIT envoyer qu'un email par échéance ou par panier, et NE
  DOIT rien envoyer si son objet a disparu (commande passée, droits prolongés, bons
  utilisés, panier vidé).

**Emails commerciaux et consentement**

- **FR-011** : Les emails de promotion, de vente flash et de nouveauté DOIVENT être envoyés
  uniquement aux abonnés à la newsletter, et comporter un lien de désinscription utilisable
  sans connexion.
- **FR-012** : Les scénarios de réapprovisionnement, de panier abandonné et d'alerte (bons
  d'achat, droits d'assistance, garantie) DOIVENT être envoyés à tout client, abonné ou non
  à la newsletter, tant qu'il ne les a pas désactivés. Seuls les emails de promotion, de
  vente flash et de nouveauté exigent l'abonnement à la newsletter.
- **FR-041** : Chacun de ces emails de service DOIT rappeler pourquoi le client le reçoit et
  comporter un lien pour le désactiver sans se connecter. Il NE DOIT contenir aucune
  promotion étrangère à son objet.
- **FR-013** : Une désinscription DOIT prendre effet immédiatement, y compris pour les
  emails déjà programmés.
- **FR-014** : Chaque consentement, désinscription et changement de préférence DOIT être
  enregistré avec sa date et son origine.

**Relance de réapprovisionnement**

- **FR-015** : La relance DOIT être calculée, pour chaque consommable, à partir du rythme de
  commande habituel du client, et envoyée avant la date prévue de sa prochaine commande,
  selon une avance fixée par l'administrateur (une semaine par défaut).
- **FR-016** : La relance NE DOIT PAS être envoyée si l'historique du client est insuffisant
  ou trop irrégulier, ni s'il a déjà recommandé.
- **FR-017** : La relance DOIT rappeler le consommable, son prix HT, permettre de le
  commander de nouveau en un geste, et indiquer ce que la commande rapporterait en bons
  d'achat et en droits d'assistance.

**Panier abandonné**

- **FR-018** : Un client connecté ayant laissé un panier sans commander DOIT recevoir un seul
  rappel, après un délai fixé par l'administrateur, menant à son panier.
- **FR-019** : Le rappel DOIT refléter les prix et disponibilités en vigueur au moment de
  l'envoi.

**Relances d'impayés**

- **FR-020** : Un paiement en attente ou refusé DOIT donner lieu à une séquence de relances
  dont le nombre et les délais sont fixés par l'administrateur, et qui s'arrête dès la
  régularisation.
- **FR-021** : La dernière relance avant une conséquence DOIT annoncer cette conséquence et
  sa date.

**Préférences**

- **FR-022** : « Mon compte » DOIT comporter un centre de préférences listant chaque type
  d'email facultatif avec son réglage, et les emails toujours envoyés avec leur
  justification.
- **FR-023** : Tout email facultatif ou commercial DOIT comporter un lien permettant de
  gérer ses préférences sans se connecter.
- **FR-024** : Un abonné à la newsletter sans compte DOIT pouvoir se désinscrire et gérer
  ses préférences depuis un email.

**Modèles et présentation**

- **FR-025** : Tous les emails DOIVENT respecter la charte : logo issu de
  `docs/brand/assets/`, police Inter avec une police de repli, couleur d'action de la
  charte, ton sobre, vouvoiement, et le nom « ExploCardio.fr ».
- **FR-026** : L'administrateur DOIT pouvoir modifier l'objet et le texte de chaque modèle
  sans développeur, le prévisualiser et s'envoyer un email de test.
- **FR-027** : Chaque email DOIT indiquer l'identité de l'expéditeur, les mentions légales
  requises, le numéro de la hotline et ses horaires (F09).
- **FR-028** : Chaque email DOIT rester lisible sur mobile, sans images, et être utilisable
  avec un lecteur d'écran (structure, textes de remplacement, contrastes de la charte).
- **FR-029** : Les montants DOIVENT être indiqués en euros HT, avec le TTC lorsqu'il s'agit
  d'un paiement.
- **FR-030** : Aucun email NE DOIT contenir de donnée de patient, ni de donnée de carte
  bancaire, ni de mot de passe.

**Maîtrise des envois**

- **FR-031** : Le nombre d'emails facultatifs et commerciaux reçus par un même client DOIT
  être limité par une fréquence maximale fixée par l'administrateur. Cette limite NE DOIT
  JAMAIS retarder un email transactionnel.
- **FR-032** : Les emails commerciaux DOIVENT être envoyés dans des plages horaires fixées
  par l'administrateur.
- **FR-033** : Les envois facultatifs vers une adresse qui rejette durablement les messages
  DOIVENT cesser, l'administrateur en étant informé.
- **FR-034** : En cas d'indisponibilité de l'outil d'envoi, les emails DOIVENT être conservés
  et envoyés à son retour, sans doublon.

**Suivi et administration**

- **FR-035** : Chaque envoi DOIT être tracé : destinataire, modèle, événement déclencheur,
  date, état de remise.
- **FR-036** : L'administrateur DOIT pouvoir consulter les emails envoyés à un client et les
  résultats de chaque scénario (envoyés, remis, ouverts, suivis d'une commande).
- **FR-037** : Les délais, seuils, nombres de relances, fréquence maximale et plages
  horaires DOIVENT être des paramètres modifiables par l'administrateur, jamais codés en
  dur.
- **FR-038** : F10 DOIT livrer les écrans d'administration nécessaires : scénarios, modèles,
  suivi des envois. Le back-office complet (F13) les étendra.
- **FR-039** : Seules les données nécessaires à l'envoi DOIVENT être transmises à l'outil
  d'emailing, conformément à la constitution.
- **FR-040** : L'outil d'envoi DOIT rester indépendant d'Odoo : le branchement d'Odoo (F11)
  NE DOIT PAS modifier les emails reçus par les clients.

### Key Entities

- **Modèle d'email** : famille, objet, texte, variables, état (brouillon, publié).
- **Scénario automatisé** : type, état actif ou inactif, délais, seuils, nombre de relances.
- **Envoi** : destinataire, modèle, événement déclencheur, date, état (programmé, envoyé,
  remis, rejeté, annulé).
- **Préférences de communication** : pour un client ou un abonné, réglage de chaque type
  d'email facultatif et abonnement à la newsletter.
- **Preuve de consentement** : abonnement ou désinscription, date, origine.
- **Rythme de commande** : pour un client et un consommable, intervalle habituel et date
  prévue de la prochaine commande.
- **Échéance de relance** : objet concerné (consommable, bons, droits, garantie, panier,
  impayé), date, relance déjà envoyée ou non.
- **Règles d'envoi** : fréquence maximale, plages horaires, expéditeur, mentions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** : Un client qui commande un consommable tous les deux mois reçoit une relance
  entre 5 et 9 jours avant l'échéance prévue.
- **SC-002** : Un client non abonné à la newsletter ne reçoit aucun email promotionnel
  (0 cas sur l'ensemble des tests).
- **SC-003** : 100 % des événements transactionnels donnent lieu à un email, envoyé en moins
  de 5 minutes, et à un seul.
- **SC-004** : Une désinscription prend effet en moins d'une minute, y compris pour les
  emails déjà programmés.
- **SC-005** : Aucune relance de réapprovisionnement n'est envoyée à un client qui a déjà
  recommandé (0 cas).
- **SC-006** : 100 % des emails respectent la charte et restent lisibles sur mobile et sans
  images.
- **SC-007** : Au moins 15 % des relances de réapprovisionnement sont suivies d'une commande
  du consommable dans les 14 jours.
- **SC-008** : Moins de 0,5 % des emails commerciaux envoyés donnent lieu à une
  désinscription.
- **SC-009** : Un administrateur modifie le texte d'un modèle ou le délai d'un scénario en
  moins de 5 minutes, sans développeur.
- **SC-010** : Un client modifie ses préférences en moins d'une minute, avec ou sans
  connexion.
- **SC-011** : Aucun email ne contient de donnée de patient, de donnée de carte ni de mot de
  passe.
- **SC-012** : Après une indisponibilité de l'outil d'envoi, 100 % des emails en attente
  sont envoyés, sans doublon.

## Assumptions

Les points marqués « confirmé » n'étaient pas tranchés dans la demande initiale ; ils ont été
validés par la responsable du projet le 2026-10-13.

- **Relances d'impayés (confirmé)** : la demande les range parmi les emails que le client
  peut désactiver. Elles sont ici classées transactionnelles, donc non désactivables : un
  client ne doit pas pouvoir couper les relances d'une somme qu'il doit.
- **Panier abandonné et F04 (confirmé)** : F04 excluait toute relance de panier dans sa
  première version. F10 l'introduit ; l'hypothèse de F04 a été mise à jour.
- **Rythme de commande (confirmé)** : calculé à partir d'au moins trois commandes du même
  consommable ; aucune relance si les intervalles varient de plus de moitié. Avance d'une
  semaine, réglable.
- **Panier abandonné (confirmé)** : un seul rappel, 24 heures après la dernière
  modification du panier, pour les clients connectés uniquement. Valeurs réglables.
- **Promotions et nouveautés (confirmé)** : ces emails sont préparés et lancés par
  l'administrateur ; la création d'une promotion (F06) ne déclenche pas d'envoi automatique.
- **Fréquence maximale (confirmé)** : deux emails facultatifs ou commerciaux par semaine
  et par client, réglable. Cette limite n'était pas dans la demande.
- **Plages d'envoi des emails commerciaux (confirmé)** : jours ouvrés, de 8 h à 19 h,
  réglables.
- **Séquence d'impayés (confirmé)** : trois relances par défaut ; délais et conséquences
  sont ceux fixés par F04 (virement) et F05 (location).
- **Mesure des ouvertures (confirmé)** : les ouvertures et les clics sont mesurés pour
  évaluer les scénarios. Cette mesure est à mentionner dans la politique de confidentialité
  et à valider par le conseil juridique d'ExploCardio.fr.
- **Qualification des emails de service** : envoyer les relances et alertes à des clients
  non abonnés à la newsletter repose sur le régime applicable entre professionnels. Cette
  qualification est à faire confirmer par le conseil juridique d'ExploCardio.fr avant la
  mise en ligne.
- **Modification des modèles** : dans le back-office ou dans l'outil d'emailing, selon le
  choix fait lors de la planification ; dans les deux cas sans développeur.
- **Outil d'envoi** : choisi lors de la planification ; la constitution (v1.1.0) autorise un
  outil d'emailing sous conditions.
- **Liste des emails transactionnels** : celle de la demande n'est pas limitative ; tout
  email de confirmation, de sécurité ou de suivi défini par un autre module en fait partie.
- **Délais de prévenance** des alertes de bons, de droits et de garantie : fixés par F06 et
  F07 ; F10 les applique.
- **Périmètre** : emails en français, destinés à des professionnels de santé de France
  métropolitaine, sans aucune donnée de patient.
