# Feature Specification: F02 — Comptes professionnels, inscription et newsletter

**Feature Branch**: `002-comptes-professionnels`

**Created**: 2026-10-12

**Status**: Draft

**Input**: User description: "F02 — Comptes professionnels, inscription et newsletter : inscription avec vérification RPPS ou SIRET, statut en attente puis validé, offre de bienvenue (tensiomètre offert), connexion, tableau de bord Mon compte, droits RGPD. Objectif : réserver la commande aux professionnels de santé vérifiés et recruter des inscrits grâce à l'offre de bienvenue."

## Contexte et objectif

ExploCardio.fr vend et met à disposition du matériel d'exploration fonctionnelle cardiaque à
des professionnels de santé de France métropolitaine. F02 a deux objectifs :

- **réserver la commande aux professionnels vérifiés** : un compte n'est autorisé à commander
  qu'après vérification de son numéro RPPS ou SIRET ;
- **recruter des inscrits** grâce à l'offre de bienvenue (un tensiomètre électronique offert).

F02 livre l'inscription, la validation des comptes, la connexion, l'espace « Mon compte » et
l'exercice des droits RGPD.

**Hors périmètre de F02** : le contenu détaillé des rubriques de « Mon compte » qui relèvent
d'autres modules (commandes, factures, locations, bons d'achat, droits d'assistance,
garanties, rendez-vous, accès logiciels Cloud), le panier et le paiement, l'envoi des
newsletters elles-mêmes, le back-office complet (F13), la reprise des fiches clients dans
Odoo (F11), et le rattachement de plusieurs utilisateurs à un même compte client (reporté
après la première version, voir FR-038). F02 fournit la structure du tableau de bord et les
points d'entrée de ces rubriques.

**Lien avec F01** : le bouton de l'offre de bienvenue et l'accès « Mon compte / Connexion »
de l'en-tête mènent aux écrans de F02. L'inscription à la newsletter depuis le pied de page
(F01) reste possible sans compte, mais ne donne pas droit au cadeau à elle seule.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Créer son compte professionnel (Priority: P1)

Un cardiologue remplit le formulaire d'inscription, accepte les CGU et CGV, choisit ou non de
recevoir la newsletter, puis confirme son adresse email. Son compte est créé au statut « en
attente de validation » : il peut consulter le site, pas commander.

**Why this priority**: sans compte, aucune commande n'est possible. C'est la porte d'entrée
de tout le site marchand.

**Independent Test**: créer un compte avec un RPPS au bon format, confirmer l'email, se
connecter et constater le statut « en attente de validation » et l'impossibilité de
finaliser une commande.

**Acceptance Scenarios**:

1. **Given** un visiteur sur le formulaire, **When** il renseigne tous les champs
   obligatoires et valide, **Then** son compte est créé au statut « en attente de
   validation » et un email de confirmation d'adresse lui est envoyé.
2. **Given** le formulaire d'inscription, **When** il s'affiche, **Then** la case
   newsletter n'est pas cochée et l'acceptation des CGU et CGV est une case distincte et
   obligatoire.
3. **Given** un numéro RPPS ou SIRET au mauvais format, **When** le visiteur valide,
   **Then** le formulaire signale l'erreur sur ce champ, conserve la saisie et ne crée pas
   le compte.
4. **Given** un email ou un numéro RPPS déjà utilisé par un compte, **When** le visiteur
   valide, **Then** l'inscription est refusée et il est orienté vers la connexion ou le
   contact, sans révéler d'information sur le compte existant.
5. **Given** un compte dont l'email n'est pas confirmé, **When** le professionnel clique
   sur le lien reçu, **Then** son adresse est confirmée et le compte est transmis pour
   validation.
6. **Given** un lien de confirmation expiré, **When** le professionnel l'utilise, **Then**
   il peut en demander un nouveau.
7. **Given** une adresse de livraison hors de France métropolitaine, **When** le visiteur
   valide, **Then** le formulaire la refuse en expliquant le périmètre du site.
8. **Given** un compte en attente de validation, **When** son titulaire tente de finaliser
   une commande, **Then** l'action est bloquée et un message explique que le compte est en
   cours de vérification.

---

### User Story 2 - Valider les comptes (Priority: P1)

L'administrateur consulte les comptes en attente, vérifie le numéro RPPS ou SIRET, puis
valide ou refuse chaque compte. Le professionnel est prévenu par email. À la validation, sa
fiche client est créée dans le référentiel de gestion.

**Why this priority**: c'est la règle centrale du module. Tant qu'un compte n'est pas
validé, il ne peut pas commander.

**Independent Test**: valider un compte en attente, vérifier l'email reçu, la création de
la fiche client et la levée du blocage de commande ; refuser un autre compte et vérifier
l'email de refus.

**Acceptance Scenarios**:

1. **Given** des comptes à l'email confirmé et en attente, **When** l'administrateur ouvre
   la liste, **Then** il voit pour chacun l'identité, le numéro RPPS ou SIRET, le cabinet et
   la date d'inscription.
2. **Given** un compte en attente, **When** l'administrateur le valide, **Then** le statut
   passe à « validé », la fiche client est créée dans le référentiel de gestion et le
   professionnel reçoit un email l'informant qu'il peut commander.
3. **Given** un compte en attente, **When** l'administrateur le refuse en indiquant un
   motif, **Then** le statut passe à « refusé » et le professionnel reçoit un email qui
   l'invite à contacter l'équipe.
4. **Given** la validation automatique activée par l'administrateur, **When** un compte
   confirme son email avec un numéro au bon format, **Then** il est validé sans
   intervention.
5. **Given** un compte validé, **When** l'administrateur le suspend, **Then** son titulaire
   ne peut plus commander et en est informé.
6. **Given** une validation, un refus ou une suspension, **When** l'action est effectuée,
   **Then** elle est journalisée avec son auteur et sa date.

---

### User Story 3 - Se connecter et récupérer son accès (Priority: P1)

Le professionnel se connecte avec son email et son mot de passe. S'il a oublié son mot de
passe, il en définit un nouveau par email. Il peut activer une double authentification.

**Why this priority**: sans connexion fiable et sécurisée, ni le compte ni la commande ne
sont utilisables.

**Independent Test**: se connecter, se déconnecter, réinitialiser le mot de passe, puis
activer la double authentification et se reconnecter.

**Acceptance Scenarios**:

1. **Given** un compte à l'email confirmé, **When** son titulaire saisit le bon email et le
   bon mot de passe, **Then** il est connecté et arrive sur « Mon compte » ou sur la page
   qu'il consultait.
2. **Given** des identifiants incorrects, **When** il tente de se connecter, **Then** un
   message d'erreur unique ne précise pas si l'email ou le mot de passe est en cause.
3. **Given** plusieurs échecs successifs, **When** les tentatives continuent, **Then**
   elles sont ralenties ou bloquées temporairement et le titulaire en est informé par email.
4. **Given** un mot de passe oublié, **When** il saisit son email, **Then** il reçoit un
   lien à usage unique et à durée limitée pour en choisir un nouveau, et le même message
   s'affiche que l'email soit connu ou non.
5. **Given** un mot de passe réinitialisé, **When** l'opération aboutit, **Then** les
   autres sessions ouvertes sont fermées et un email de notification est envoyé.
6. **Given** la double authentification activée, **When** il se connecte, **Then** un
   second facteur lui est demandé après le mot de passe.
7. **Given** un second facteur perdu, **When** il utilise un code de secours, **Then** il
   retrouve l'accès à son compte.

---

### User Story 4 - Recevoir le tensiomètre de bienvenue (Priority: P2)

Un professionnel qui s'inscrit et s'abonne à la newsletter reçoit un tensiomètre
électronique offert, ajouté gratuitement à sa première commande. Chaque médecin y a droit une
seule fois.

**Why this priority**: c'est le levier de recrutement du site, mais les comptes fonctionnent
sans lui.

**Independent Test**: inscrire un professionnel abonné à la newsletter, valider son compte,
passer une première commande et vérifier la ligne offerte à 0 € et la sortie de stock ;
passer une deuxième commande et constater qu'aucun cadeau n'est ajouté.

**Acceptance Scenarios**:

1. **Given** l'offre active et un compte validé, abonné à la newsletter, **When** les
   conditions sont réunies, **Then** le professionnel devient bénéficiaire et « Mon compte »
   lui indique que le tensiomètre sera joint à sa première commande.
2. **Given** un bénéficiaire, **When** il passe sa première commande, **Then** le
   tensiomètre y est ajouté automatiquement sur une ligne à 0 €, visible dans le
   récapitulatif, et le stock diminue d'une unité.
3. **Given** un numéro RPPS ou SIRET ayant déjà reçu le cadeau, **When** une nouvelle
   commande est passée, **Then** aucun cadeau n'est ajouté.
4. **Given** deux médecins inscrits avec leur propre RPPS à la même adresse de cabinet,
   **When** chacun passe sa première commande, **Then** chacun reçoit un tensiomètre.
5. **Given** un professionnel inscrit sans s'abonner à la newsletter, **When** son compte
   est validé, **Then** il n'est pas bénéficiaire, et « Mon compte » lui indique comment le
   devenir tant que l'offre est active.
6. **Given** un bénéficiaire, **When** il se désabonne de la newsletter après avoir reçu
   son cadeau, **Then** le cadeau reste acquis.
7. **Given** l'offre désactivée par l'administrateur, **When** un nouveau compte est
   validé, **Then** il n'est pas bénéficiaire et l'offre n'est plus proposée. Les
   professionnels déjà bénéficiaires conservent leur droit.
8. **Given** un tensiomètre en rupture de stock, **When** un bénéficiaire passe sa première
   commande, **Then** la commande part sans attendre, le cadeau est expédié dès le retour
   en stock, le bénéficiaire est informé du délai et l'administrateur est alerté.
9. **Given** une première commande annulée avant expédition, **When** elle est annulée,
   **Then** le droit au cadeau est rétabli pour la commande suivante.

---

### User Story 5 - Gérer son compte (Priority: P2)

Le professionnel dispose d'un tableau de bord « Mon compte » qui rassemble toute sa relation
avec ExploCardio.fr. Il y met à jour ses informations, ses adresses et ses préférences de
communication.

**Why this priority**: l'autonomie du client réduit les demandes à l'équipe, mais la
première commande est possible sans tableau de bord complet.

**Independent Test**: modifier une adresse de livraison, se désabonner puis se réabonner à
la newsletter, et vérifier que chaque rubrique du tableau de bord s'ouvre sans erreur.

**Acceptance Scenarios**:

1. **Given** un professionnel connecté, **When** il ouvre « Mon compte », **Then** il voit
   le statut de son compte et les rubriques : commandes, factures, locations en cours, bons
   d'achat, droits d'assistance, garanties, rendez-vous, accès logiciels Cloud,
   informations et adresses, préférences de communication.
2. **Given** une rubrique dont le module n'est pas encore livré ou qui est vide, **When**
   il l'ouvre, **Then** un message clair l'indique, sans erreur.
3. **Given** ses informations, **When** il modifie son téléphone, une adresse ou son mot
   de passe, **Then** le changement est enregistré et reporté sur sa fiche client.
4. **Given** un changement d'email, **When** il le demande, **Then** la nouvelle adresse
   doit être confirmée avant de remplacer l'ancienne, et l'ancienne adresse est prévenue.
5. **Given** une demande de changement de numéro RPPS ou SIRET, **When** il la soumet,
   **Then** elle est transmise à l'administrateur pour vérification et n'est pas appliquée
   directement.
6. **Given** ses préférences de communication, **When** il s'abonne ou se désabonne de la
   newsletter, **Then** le choix est appliqué et enregistré avec sa date.

---

### User Story 6 - Exercer ses droits sur ses données (Priority: P2)

Le professionnel demande l'export de ses données personnelles ou la suppression de son
compte.

**Why this priority**: obligation légale (principe V). Elle doit exister à l'ouverture du
site, même si elle sert rarement.

**Independent Test**: demander un export et vérifier son contenu ; demander la suppression
d'un compte ayant une facture et vérifier que le compte est inutilisable et la facture
conservée.

**Acceptance Scenarios**:

1. **Given** un professionnel connecté, **When** il demande l'export de ses données,
   **Then** il reçoit, après une nouvelle vérification de son identité, un fichier lisible
   contenant ses données personnelles.
2. **Given** un professionnel connecté, **When** il demande la suppression de son compte et
   la confirme, **Then** il ne peut plus se connecter, ses données personnelles sont
   supprimées ou anonymisées, et il reçoit une confirmation.
3. **Given** un compte supprimé ayant des factures, **When** la suppression est effectuée,
   **Then** les pièces soumises à une obligation légale de conservation sont gardées
   pendant la durée requise, et rien d'autre.
4. **Given** un compte ayant une location en cours ou un impayé, **When** la suppression
   est demandée, **Then** le professionnel est informé de ce qui doit être soldé d'abord.
5. **Given** un compte supprimé, **When** la suppression est effectuée, **Then** l'adresse
   est retirée de la newsletter et la demande est journalisée.

---

### Edge Cases

- Inscription abandonnée avant la confirmation de l'email : le compte non confirmé est
  supprimé après un délai, et le numéro RPPS redevient utilisable.
- Deux inscriptions simultanées avec le même RPPS ou le même email : une seule aboutit.
- Compte refusé qui se réinscrit avec le même numéro : la demande est signalée à
  l'administrateur.
- Numéro RPPS au bon format mais appartenant à un autre professionnel : seule la
  vérification de l'administrateur le détecte ; un compte validé à tort peut être suspendu.
- Compte suspendu ayant déjà reçu le cadeau : le cadeau n'est pas réclamé, mais le numéro
  reste marqué comme ayant bénéficié de l'offre.
- Bénéficiaire qui ne passe jamais commande : aucun cadeau n'est expédié.
- Structure inscrite par son SIRET, dont un médecin s'inscrit aussi avec son RPPS : chaque
  numéro ouvre droit à un tensiomètre.
- Abonnement à la newsletter après la validation du compte, alors que l'offre est toujours
  active : le professionnel devient bénéficiaire.
- Désabonnement entre l'ouverture du droit et la première commande : le cadeau reste dû.
- Adresse de facturation identique à l'adresse du cabinet : une seule saisie suffit.
- Adresse email déjà inscrite à la newsletter par le pied de page avant la création du
  compte : l'abonnement existant est rattaché au compte, sans doublon.
- Email de validation, de confirmation ou de réinitialisation non reçu : le professionnel
  peut en redemander l'envoi, dans une limite raisonnable.
- Formulaire rempli avec une donnée de patient dans un champ libre : aucun champ libre
  n'invite à en saisir.

## Requirements *(mandatory)*

### Functional Requirements

**Inscription**

- **FR-001** : Le formulaire d'inscription DOIT recueillir : civilité, nom, prénom,
  spécialité, numéro RPPS ou SIRET, nom du cabinet, adresse du cabinet, adresse de
  livraison, adresse de facturation, email, téléphone, mot de passe.
- **FR-002** : Le professionnel DOIT fournir un numéro RPPS s'il s'inscrit comme médecin,
  ou un numéro SIRET s'il s'inscrit au nom d'un cabinet ou d'une structure.
- **FR-003** : Le site DOIT contrôler automatiquement le format du numéro RPPS (11
  chiffres) ou SIRET (14 chiffres, clé de contrôle valide) avant de créer le compte.
- **FR-004** : Un email et un numéro RPPS NE DOIVENT être associés qu'à un seul compte.
- **FR-005** : Les adresses de livraison et de facturation DOIVENT pouvoir reprendre
  l'adresse du cabinet sans nouvelle saisie. L'adresse de livraison DOIT se situer en France
  métropolitaine.
- **FR-006** : La case d'inscription à la newsletter NE DOIT PAS être cochée par défaut.
  L'acceptation des CGU et des CGV DOIT être une case distincte et obligatoire.
- **FR-007** : Le site DOIT envoyer un email de confirmation de l'adresse. Tant que
  l'adresse n'est pas confirmée, le compte NE DOIT PAS être transmis pour validation.
- **FR-008** : Le mot de passe DOIT respecter des règles de robustesse affichées pendant la
  saisie.
- **FR-009** : Le formulaire DOIT informer le professionnel de l'usage de ses données et NE
  DOIT recueillir aucune donnée de patient.

**Statuts et validation**

- **FR-010** : Un compte DOIT porter l'un des statuts : email à confirmer, en attente de
  validation, validé, refusé, suspendu.
- **FR-011** : Un compte qui n'est pas « validé » DOIT pouvoir consulter le site et ses
  prix, mais NE DOIT PAS pouvoir finaliser une commande. Seule exception : la mise à
  disposition express (F05, FR-009), qu'un compte en attente peut commander et payer, sans
  expédition avant sa validation.
- **FR-012** : L'administrateur DOIT pouvoir consulter les comptes en attente, les valider,
  les refuser avec un motif, et suspendre un compte validé.
- **FR-013** : L'administrateur DOIT pouvoir choisir entre validation manuelle et
  validation automatique après contrôle de format. Ce réglage DOIT être modifiable sans
  développeur.
- **FR-014** : Le professionnel DOIT être prévenu par email de la validation, du refus ou
  de la suspension de son compte.
- **FR-015** : À la validation, la fiche client DOIT être créée dans le référentiel de
  gestion, avec les notions et champs repris d'Odoo (client / partenaire, adresses).
- **FR-016** : Toute validation, tout refus et toute suspension DOIVENT être journalisés
  avec leur auteur et leur date.

**Offre de bienvenue**

- **FR-017** : Quand l'offre est active, tout professionnel dont le compte est validé et qui
  est abonné à la newsletter DOIT devenir bénéficiaire d'un tensiomètre électronique offert.
- **FR-018** : Le formulaire d'inscription et « Mon compte » DOIVENT présenter l'offre et
  ses conditions tant qu'elle est active.
- **FR-019** : Un même numéro RPPS ou SIRET NE DOIT obtenir qu'un seul tensiomètre.
- **FR-020** : La limite s'applique par médecin : chaque numéro RPPS ouvre droit à un
  tensiomètre, quelle que soit l'adresse du cabinet. Plusieurs médecins d'un même cabinet
  peuvent donc chacun en recevoir un.
- **FR-021** : Le tensiomètre DOIT être ajouté automatiquement et gratuitement à la première
  commande du bénéficiaire, et apparaître dans le récapitulatif et sur les documents de la
  commande. Il n'est jamais expédié sans commande.
- **FR-022** : Chaque cadeau remis DOIT être enregistré dans le référentiel de gestion comme
  une ligne à 0 € de la première commande, et décompté du stock.
- **FR-023** : Un cadeau déjà remis DOIT rester acquis si le bénéficiaire se désabonne de
  la newsletter.
- **FR-024** : L'administrateur DOIT pouvoir, sans développeur, activer ou désactiver
  l'offre et modifier son article, son texte et ses conditions.
- **FR-025** : En cas de rupture de stock, la commande NE DOIT PAS être retardée : le cadeau
  DOIT être expédié dès le retour en stock, le bénéficiaire informé et l'administrateur
  alerté.

**Newsletter et consentement**

- **FR-026** : Chaque abonnement à la newsletter DOIT être enregistré avec sa date, son
  heure, son origine (inscription, « Mon compte », pied de page) et le texte de
  consentement présenté.
- **FR-027** : Chaque désabonnement DOIT être possible depuis « Mon compte » et depuis
  chaque email, et être enregistré avec sa date.
- **FR-028** : L'état d'abonnement DOIT être transmis à l'outil d'emailing
  d'ExploCardio.fr.

**Connexion et sécurité**

- **FR-029** : Le professionnel DOIT pouvoir se connecter par email et mot de passe, et se
  déconnecter.
- **FR-030** : Le professionnel DOIT pouvoir réinitialiser un mot de passe oublié par un
  lien à usage unique et à durée limitée.
- **FR-031** : Les messages de connexion, d'inscription et de mot de passe oublié NE
  DOIVENT PAS révéler si un email est déjà enregistré.
- **FR-032** : Les tentatives de connexion répétées en échec DOIVENT être limitées.
- **FR-033** : Le professionnel DOIT pouvoir activer une double authentification
  facultative, avec des codes de secours.
- **FR-034** : Les connexions, échecs de connexion, changements de mot de passe, d'email et
  de double authentification DOIVENT être journalisés.
- **FR-035** : Les événements sensibles (changement de mot de passe ou d'email, blocage)
  DOIVENT être notifiés au titulaire par email.

**Mon compte**

- **FR-036** : Le tableau de bord « Mon compte » DOIT présenter le statut du compte et les
  rubriques : commandes, factures, locations en cours, solde de bons d'achat, droits
  d'assistance, garanties, rendez-vous, accès logiciels Cloud, informations et adresses,
  préférences de communication.
- **FR-037** : Le professionnel DOIT pouvoir modifier ses informations, ses adresses, son
  mot de passe et ses préférences de communication. Un changement d'email DOIT être
  confirmé ; un changement de numéro RPPS ou SIRET DOIT être vérifié par l'administrateur.
- **FR-038** : Dans la première version, un compte client a un seul utilisateur. Le compte
  client (le cabinet au sens commercial) et l'utilisateur (la personne qui se connecte)
  DOIVENT néanmoins rester deux notions distinctes, pour permettre de rattacher plus tard
  plusieurs utilisateurs à un même compte sans reprise des comptes existants.

**Droits sur les données**

- **FR-039** : Le professionnel DOIT pouvoir demander l'export de ses données personnelles
  et le recevoir dans un format lisible, dans le délai légal d'un mois.
- **FR-040** : Le professionnel DOIT pouvoir demander la suppression de son compte. Ses
  données personnelles DOIVENT alors être supprimées ou anonymisées, à l'exception des
  pièces soumises à une obligation légale de conservation.
- **FR-041** : Les demandes d'export et de suppression DOIVENT être journalisées.

**Charte, accessibilité et langue**

- **FR-042** : Tous les écrans et emails de F02 DOIVENT respecter la charte
  (`docs/brand/design-system.md`, tokens), le niveau WCAG 2.2 AA, le vouvoiement et le ton
  sobre du site.
- **FR-043** : Chaque erreur de formulaire DOIT être signalée sur le champ concerné, en
  texte, sans effacer la saisie.

### Key Entities

- **Utilisateur** : personne qui se connecte. Civilité, nom, prénom, email, téléphone,
  spécialité, état de confirmation de l'email, double authentification.
- **Compte client** : le professionnel ou le cabinet au sens commercial, correspondant au
  client / partenaire d'Odoo. Numéro RPPS ou SIRET, nom du cabinet, statut, dates
  d'inscription et de validation. Un seul utilisateur par compte client dans la première
  version, plusieurs à terme.
- **Adresse** : adresse du cabinet, de livraison ou de facturation, rattachée à un compte
  client.
- **Décision de validation** : validation, refus ou suspension d'un compte, avec auteur,
  date et motif.
- **Consentement newsletter** : état (abonné, désabonné), date, origine et texte présenté.
- **Offre de bienvenue** : état actif ou inactif, article offert, texte, conditions.
- **Attribution du cadeau** : bénéficiaire, numéro RPPS ou SIRET concerné, état (droit
  ouvert, en attente de stock, remis), commande et ligne à 0 € associées.
- **Demande RGPD** : export ou suppression, date, état de traitement.
- **Journal de sécurité** : événements sensibles liés aux comptes, avec date et auteur.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** : Aucun compte non validé ne peut finaliser une commande, hors mise à
  disposition express de F05 (0 cas sur l'ensemble des tests).
- **SC-002** : Un même numéro RPPS ou SIRET n'obtient jamais plus d'un tensiomètre (0 cas
  sur l'ensemble des tests, y compris en cas de demandes simultanées).
- **SC-003** : 100 % des abonnements à la newsletter sont enregistrés avec leur date, leur
  origine et le texte de consentement présenté.
- **SC-004** : Un professionnel complète le formulaire d'inscription en moins de 4 minutes.
- **SC-005** : Au moins 85 % des professionnels qui commencent le formulaire le terminent.
- **SC-006** : En validation manuelle, 95 % des comptes sont traités en moins d'un jour
  ouvré.
- **SC-007** : L'email de validation parvient au professionnel moins de 5 minutes après la
  décision.
- **SC-008** : Un professionnel réinitialise son mot de passe en moins de 2 minutes.
- **SC-009** : 100 % des cadeaux remis correspondent à une ligne de commande à 0 € et à une
  sortie de stock dans le référentiel de gestion.
- **SC-010** : Toute demande d'export ou de suppression est traitée en moins de 30 jours ;
  un export en libre-service est disponible en moins de 10 minutes.
- **SC-011** : Un audit des écrans de F02 ne relève aucune non-conformité WCAG 2.2 AA, et
  tout le parcours d'inscription et de connexion est réalisable au clavier seul.
- **SC-012** : Aucun message du site ne permet de savoir si une adresse email donnée
  possède un compte.

## Assumptions

Les points marqués « confirmé pour la V1 » n'étaient pas tranchés dans la demande initiale ;
ils ont été validés par la responsable du projet le 2026-10-12 pour la première version.

- **Mode de validation par défaut (confirmé pour la V1)** : manuel à l'ouverture du site. Le mode
  automatique (après contrôle de format) est un réglage que l'administrateur peut activer.
  Le contrôle de format ne prouve pas que le numéro appartient bien au demandeur.
- **Écrans d'administration (confirmé pour la V1)** : comme pour F01, F02 livre les écrans
  nécessaires (liste des comptes en attente, validation, refus, suspension, réglages de
  l'offre de bienvenue). F13 les reprendra et les étendra.
- **RPPS ou SIRET (confirmé pour la V1)** : un seul des deux est exigé. Un médecin fournit son
  RPPS ; une structure fournit son SIRET. Le SIRET peut être partagé par plusieurs comptes
  (plusieurs médecins d'une même structure), le RPPS non.
- **Spécialités (confirmé pour la V1)** : liste fermée gérée par l'administrateur, « Cardiologie »
  en tête, avec un choix « Autre ». Tout professionnel de santé peut s'inscrire, pas
  seulement les cardiologues.
- **Abonnement tardif (confirmé pour la V1)** : un professionnel validé qui s'abonne à la newsletter
  après son inscription devient bénéficiaire, tant que l'offre est active.
- **Désabonnement avant la remise (confirmé pour la V1)** : si le bénéficiaire se désabonne entre
  l'ouverture du droit et sa première commande, le cadeau reste dû.
- **Conditionner un cadeau à l'abonnement (à valider par le conseil juridique)** : lier un avantage à un
  consentement commercial est encadré par le RGPD. La formulation de l'offre est à faire
  valider par le conseil juridique d'ExploCardio.fr avant la mise en ligne.
- **Compte refusé (confirmé pour la V1)** : il reste consultable par son titulaire, qui peut
  contacter l'équipe. Il ne peut pas commander.
- **Comptes non confirmés (confirmé pour la V1)** : supprimés automatiquement après 30 jours sans
  confirmation de l'email.
- **Conservation après suppression (confirmé pour la V1)** : les factures et pièces comptables sont
  conservées 10 ans ; les autres données personnelles sont supprimées ou anonymisées.
- **Plusieurs utilisateurs par cabinet** : reporté après la première version. Les niveaux
  de droits (utilisateur principal, commande, consultation) seront spécifiés à ce moment.
- **Texte de l'offre** : le cadeau étant joint à la première commande, la promesse affichée
  est « offert avec votre première commande », et non « offert à l'inscription ». Le texte
  de l'accueil (F01, FR-022) est aligné.
- **Rubriques de « Mon compte »** : F02 livre la structure, les informations, les adresses
  et les préférences. Les autres rubriques sont alimentées par leurs modules respectifs.
- **Double authentification** : facultative pour les clients. Le choix de la méthode relève
  de la planification.
- **Newsletter** : l'envoi et la gestion des campagnes passent par l'outil d'emailing
  d'ExploCardio.fr. Pour un compte, la confirmation de l'email vaut confirmation de
  l'abonnement.
- **Textes légaux** : CGU, CGV et politique de confidentialité sont fournis par
  ExploCardio.fr (pages livrées par F01).
- **Référentiel de gestion** : la fiche client et la commande à 0 € sont lues et écrites
  par la couche d'accès unique (principe III), reprise par Odoo lors de F11.
- **Périmètre** : site en français, professionnels de santé de France métropolitaine,
  aucune donnée de patient.
