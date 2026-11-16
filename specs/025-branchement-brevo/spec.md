# Feature Specification: F25 — Branchement de Brevo

**Feature Branch**: `025-branchement-brevo`

**Created**: 2026-11-14

**Status**: Draft

**Input**: User description: "F25 — Branchement de Brevo (mode réel du connecteur emailing). Contexte : compte Brevo d'ExploCardio.fr créé (Régis) ; domaine explocardio.fr authentifié le 2026-11-14 (code Brevo, DKIM brevo1/brevo2, DMARC p=none avec rapports vers Brevo ; SPF o2switch inchangé ; DNS chez o2switch, messagerie o2switch sur mail.explocardio.fr) ; expéditeur vérifié « ExploCardio.fr <contact@explocardio.fr> », réponses vers la boîte contact@ ; offre gratuite (300 emails/jour) au départ ; pas encore de clé API. Le sous-domaine mail.explocardio.fr prévu en F10 (D1) est abandonné car déjà utilisé par la messagerie. L'interface du connecteur existe avec mode démonstration et tests de contrat ; les modèles sont rendus par le site (F10, modifiables au back-office) ; Brevo ne fait que transmettre. Objectif : mode réel activé par configuration, mêmes données et mêmes erreurs qu'en démonstration ; suivi de remise et rejets remontés au site ; désinscription en un clic opérante ; seuls adresse, objet, rendu et texte transmis ; liste de contacts Brevo simple reflet des consentements du site. Notifications d'équipe par SMS (F19) mises de côté jusqu'à l'ouverture : les notifications d'équipe partent par email. Recette : le site de recette ne doit envoyer qu'à des adresses autorisées, jamais aux vrais clients de la copie Odoo. Hors périmètre : modèles et campagnes conçus dans Brevo, automatisations Brevo, SMS, sous-domaine de marque des liens de suivi."

## Contexte et objectif

Tous les emails du site existent déjà (F10) : transactionnels (inscription, commande,
facture…), de service (rappels, fin de garantie…) et commerciaux (promotions, newsletter).
Ils sont rédigés et mis en page par le site, modifiables au back-office, et aboutissent
aujourd'hui dans une boîte de démonstration. F25 donne au connecteur emailing son **mode
réel** : les mêmes messages partent vraiment, par Brevo, sans modifier les modèles ni les
scénarios.

État au 2026-11-14 :

- compte Brevo d'ExploCardio.fr créé, offre gratuite (300 emails par jour) ;
- domaine **explocardio.fr** authentifié dans Brevo (signature DKIM, DMARC en observation,
  rapports DMARC reçus par Brevo) ; la messagerie o2switch de l'équipe n'est pas modifiée ;
- expéditeur vérifié : **ExploCardio.fr &lt;contact@explocardio.fr&gt;** ; les réponses des
  clients arrivent dans la boîte contact@ ;
- **décision** : les emails partent du domaine principal et non du sous-domaine
  `mail.explocardio.fr` prévu en F10 (D1), déjà utilisé par la messagerie o2switch.

**Phases** : configuration, garde de la recette et non-régression de la démonstration en
**[Phase 1]** ; envois réels, remise, rejets et désinscription en **[Phase 3]**, sur le site
de recette.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Recevoir les emails du site dans sa vraie boîte (Priority: P1)

Un cardiologue s'inscrit, commande, reçoit une facture. Chaque fois, l'email du site arrive
dans sa boîte de réception (pas dans les indésirables), envoyé par « ExploCardio.fr »
depuis contact@explocardio.fr, identique à l'aperçu du back-office. S'il répond, sa réponse
arrive à l'équipe.

**Why this priority**: sans emails transactionnels, un client ne peut ni confirmer son
compte ni suivre sa commande ; l'ouverture en dépend.

**Independent Test**: sur le site de recette, déclencher chaque modèle transactionnel vers
des adresses de test autorisées (Gmail, Outlook, une boîte o2switch) ; vérifier
l'arrivée en boîte de réception, l'expéditeur, le rendu et la réponse.

**Acceptance Scenarios**:

1. **Given** un événement déclencheur (inscription, commande payée…), **When** le site
   envoie l'email, **Then** il arrive dans la boîte de réception du destinataire, avec
   l'expéditeur « ExploCardio.fr &lt;contact@explocardio.fr&gt; » et le rendu exact du
   modèle (HTML et version texte).
2. **Given** un email reçu, **When** le destinataire y répond, **Then** la réponse arrive
   dans la boîte contact@explocardio.fr.
3. **Given** le même envoi demandé deux fois avec la même clé, **When** le site le rejoue,
   **Then** un seul email part.
4. **Given** les contrôles d'authentification d'une messagerie destinataire, **When**
   l'email est examiné, **Then** la signature du domaine et la politique DMARC sont
   reconnues valides.

---

### User Story 2 - Savoir si un email est arrivé (Priority: P1)

L'équipe consulte les emails envoyés à un client (F10) et voit pour chacun s'il a été remis,
ouvert ou rejeté, avec la raison. Une adresse qui n'existe pas est repérée et les envois
facultatifs vers elle cessent.

**Why this priority**: c'est la seule façon de savoir qu'un client n'a pas reçu sa facture
ou son lien d'activation.

**Independent Test**: envoyer vers une adresse valide, une adresse inexistante et une
adresse de test de rejet temporaire ; vérifier les états affichés au back-office.

**Acceptance Scenarios**:

1. **Given** un email envoyé, **When** Brevo confirme la remise, **Then** l'état passe à
   « remis » au back-office, sans action de l'équipe.
2. **Given** une adresse inexistante, **When** l'email est rejeté, **Then** l'état passe à
   « rejeté » avec un motif et la mention « définitif », les envois facultatifs vers cette
   adresse cessent et l'administrateur est informé (F10).
3. **Given** une boîte pleine, **When** l'email est rejeté temporairement, **Then** l'état
   indique un rejet temporaire et l'adresse n'est pas écartée.
4. **Given** un email ouvert, **When** l'ouverture est connue, **Then** sa date s'affiche.

---

### User Story 3 - Se désinscrire en un clic (Priority: P1)

Un abonné à la newsletter se désinscrit depuis le bouton de sa messagerie ou le lien en bas
d'un email commercial. Sa désinscription prend effet immédiatement sur le site et dans Brevo,
et il ne reçoit plus d'email commercial.

**Why this priority**: obligation légale et condition de remise imposée par les grandes
messageries.

**Independent Test**: depuis une adresse de test, se désinscrire par le bouton de la
messagerie, puis par le lien ; programmer un email commercial et vérifier qu'il ne part pas.

**Acceptance Scenarios**:

1. **Given** un email commercial ou de service, **When** il est reçu, **Then** la messagerie
   propose la désinscription en un clic.
2. **Given** une désinscription, **When** elle est faite, **Then** le consentement est
   retiré sur le site immédiatement et le contact est mis à jour dans Brevo.
3. **Given** un destinataire qui signale un email commercial comme indésirable, **When**
   Brevo le remonte, **Then** le site retire son consentement commercial.
4. **Given** un email transactionnel, **When** il est reçu, **Then** il ne comporte pas de
   lien de désinscription (il est toujours envoyé, F10).

---

### User Story 4 - Une recette sans risque pour les vrais clients (Priority: P1)

Le site de recette est branché sur une copie d'Odoo qui contient de vrais clients. Il
n'envoie d'emails qu'aux adresses autorisées (équipe, adresses de test) ; tout autre envoi
est bloqué et visible.

**Why this priority**: un email de test reçu par un vrai cardiologue serait une faute
grave d'image et de conformité.

**Independent Test**: sur le site de recette, déclencher un email vers une adresse
autorisée puis vers une adresse non autorisée ; vérifier que la seconde ne part pas et
qu'elle est consultable.

**Acceptance Scenarios**:

1. **Given** le site de recette, **When** un email vise une adresse non autorisée, **Then**
   il n'est pas envoyé, il est tracé comme « bloqué en recette » et son contenu reste
   consultable par l'équipe.
2. **Given** le site de recette, **When** un email vise une adresse autorisée, **Then** il
   part normalement.
3. **Given** le site public, **When** la liste d'adresses autorisées est renseignée par
   erreur, **Then** le site le signale à l'administrateur (aucun blocage silencieux en
   production).

---

### User Story 5 - Alertes de l'équipe et indisponibilité de l'outil (Priority: P2)

L'équipe reçoit ses notifications (nouvelle demande de financement, impayé…) par email. Si
Brevo est indisponible ou si le quota du jour est atteint, aucun email n'est perdu : il est
conservé et envoyé dès que possible.

**Why this priority**: important pour le fonctionnement interne, mais la démonstration et
F10 couvrent déjà la logique ; F25 n'ajoute que le transport.

**Independent Test**: déclencher une notification d'équipe ; simuler une indisponibilité de
l'outil ; vérifier la conservation puis l'envoi au retour.

**Acceptance Scenarios**:

1. **Given** une notification d'équipe, **When** elle est émise, **Then** elle arrive par
   email aux destinataires réglés au back-office.
2. **Given** une notification demandée par SMS, **When** les SMS ne sont pas encore
   branchés, **Then** elle est envoyée par email aux mêmes personnes et l'écart est tracé.
3. **Given** Brevo indisponible ou le quota journalier atteint, **When** un email doit
   partir, **Then** il est conservé avec l'erreur « indisponible » et renvoyé
   automatiquement ensuite ; l'administrateur est alerté si le quota bloque des envois.

### Edge Cases

- Adresse syntaxiquement invalide : envoi refusé (« erreur de validation »), alerte, comme
  en démonstration.
- Destinataire mis en liste de blocage par Brevo (désinscription antérieure faite
  directement chez Brevo) : traité comme un rejet définitif et signalé.
- Événement de remise reçu avant la fin de l'enregistrement de l'envoi, ou en double :
  traité une seule fois, sans perte.
- Message de suivi falsifié envoyé à l'adresse de réception du site : rejeté.
- Email volumineux (facture jointe en lien, longues lignes de commande) : envoyé sans
  troncature.
- Clé API révoquée ou erronée : « configuration incomplète » à chaque envoi, alerte, emails
  conservés.
- Envoi commercial massif dépassant le quota journalier : étalé sur les jours suivants,
  les emails transactionnels restant prioritaires.

## Requirements *(mandatory)*

### Functional Requirements

**Branchement et configuration**

- **FR-001** : Le connecteur emailing DOIT disposer d'un mode réel offrant toutes les
  opérations du contrat existant (envoi d'un email, notification d'équipe, mise à jour des
  consentements d'un contact, lecture du suivi), sans modification des modèles, scénarios
  ni écrans.
- **FR-002** : Le passage en mode réel DOIT se faire par configuration seule (mode du
  connecteur, clé de l'outil d'envoi).
- **FR-003** : Une configuration réelle incomplète ou une clé refusée DOIT faire échouer les
  envois avec « configuration incomplète », sans jamais basculer en démonstration ; les
  emails DOIVENT être conservés pour un envoi ultérieur.
- **FR-004** : La clé NE DOIT JAMAIS figurer dans le code, le dépôt ni les journaux.

**Envoi**

- **FR-005** : Tous les emails DOIVENT partir de l'expéditeur « ExploCardio.fr »,
  `contact@explocardio.fr`, avec réponse vers cette même adresse.
- **FR-006** : Le rendu HTML et la version texte produits par le site DOIVENT être transmis
  tels quels ; l'outil NE DOIT ajouter ni pied de page, ni logo, ni lien de désinscription
  qui lui soit propre.
- **FR-007** : Chaque envoi DOIT être idempotent par sa clé : rejoué, il ne produit qu'un
  email et renvoie le même identifiant d'envoi.
- **FR-008** : Les emails de service et commerciaux DOIVENT porter la désinscription en un
  clic (en-têtes normalisés pointant vers l'adresse de désinscription du site) ; les emails
  transactionnels NE DOIVENT PAS en porter.
- **FR-009** : Seuls l'adresse du destinataire, l'objet, le rendu, la version texte et les
  éléments techniques de suivi DOIVENT être transmis ; jamais de donnée de patient ni de
  donnée de carte.

**Suivi**

- **FR-010** : Les états de remise (envoyé, remis, rejeté temporaire, rejeté définitif),
  le motif de rejet et la date de première ouverture DOIVENT remonter au site et être
  visibles là où F10 les affiche.
- **FR-011** : Un rejet définitif DOIT arrêter les envois facultatifs vers l'adresse et
  informer l'administrateur (F10, FR-033).
- **FR-012** : Les messages de suivi reçus de l'outil DOIVENT être authentifiés ; un message
  non authentifié DOIT être rejeté sans effet. Chaque message DOIT être traité une seule
  fois.

**Contacts et consentements**

- **FR-013** : La liste de contacts de l'outil DOIT être un reflet des consentements du site
  (adresse et consentements uniquement) ; le site reste la référence.
- **FR-014** : Une désinscription ou un signalement comme indésirable reçu par l'outil DOIT
  retirer le consentement correspondant sur le site, immédiatement.

**Notifications d'équipe**

- **FR-015** : Les notifications d'équipe DOIVENT partir par email. Tant que les SMS ne sont
  pas branchés (F19), une notification demandée par SMS DOIT être envoyée par email aux
  mêmes destinataires et l'écart tracé.

**Recette et protection des clients**

- **FR-016** : Sur le site de recette, seuls les envois vers une liste d'adresses autorisées
  (adresses exactes ou domaines) DOIVENT partir ; les autres DOIVENT être bloqués, tracés
  « bloqué en recette » et consultables par l'équipe.
- **FR-017** : Sur le site public, la présence d'une liste d'adresses autorisées DOIT être
  signalée à l'administrateur.

**Disponibilité**

- **FR-018** : En cas d'indisponibilité de l'outil ou de quota atteint, les emails DOIVENT
  être conservés et renvoyés automatiquement (F10, FR-034), les transactionnels en
  priorité ; l'administrateur DOIT être alerté d'un quota atteint.
- **FR-019** : Chaque envoi, chaque état de suivi et chaque blocage DOIVENT être journalisés
  (date, modèle, destinataire, résultat).

**Tests**

- **FR-020** : Le mode réel DOIT passer les mêmes tests de contrat que le mode
  démonstration ; les erreurs DOIVENT être les mêmes (indisponible, erreur de validation,
  introuvable, configuration incomplète).

### Key Entities

- **Envoi** : un email transmis à l'outil, avec sa clé, son identifiant chez l'outil, son
  modèle, son destinataire et son état de suivi.
- **État de suivi** : remise, ouverture ou rejet (temporaire ou définitif) d'un envoi,
  remonté par l'outil et traité une seule fois.
- **Contact** : reflet d'un client dans l'outil (adresse, consentements).
- **Adresse autorisée** : adresse ou domaine vers lequel le site de recette peut envoyer.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** [Phase 3] : 100 % des tests de contrat du connecteur emailing passent dans les
  deux modes.
- **SC-002** [Phase 3] : chaque modèle transactionnel envoyé à des boîtes de test Gmail,
  Outlook et o2switch arrive en boîte de réception (pas en indésirables) en moins de
  2 minutes, signature du domaine et DMARC validés.
- **SC-003** [Phase 3] : l'état « remis » ou « rejeté » d'un email est visible au
  back-office en moins de 5 minutes après l'envoi.
- **SC-004** [Phase 3] : une désinscription en un clic retire le consentement sur le site
  en moins d'une minute ; aucun email commercial ne part ensuite vers cette adresse.
- **SC-005** [Phase 3] : sur le site de recette, 0 email part vers une adresse non
  autorisée, sur l'ensemble des parcours de F15.
- **SC-006** [Phase 1] : avec le connecteur en démonstration, toute la suite de tests
  existante passe sans modification.
- **SC-007** [Phase 3] : après une indisponibilité simulée, 100 % des emails conservés
  partent une fois, et une seule.

## Assumptions

- La clé de l'outil d'envoi est créée par Pauline ou Régis au moment de la recette et saisie
  directement dans la configuration de chaque site (recette, puis public), jamais transmise
  dans une conversation. Une clé distincte par site est recommandée.
- L'offre gratuite (300 emails par jour) suffit à la recette et au démarrage ; le passage à
  une offre payante se décidera selon les volumes, sans changement du site.
- Le suivi des ouvertures reste actif comme prévu par F10 ; il ne sert qu'aux statistiques
  des scénarios.
- Les liens de suivi gardent le domaine de l'outil ; un sous-domaine de marque pourra être
  ajouté plus tard sans changement du site.
- La politique DMARC reste en observation ; son durcissement éventuel (après lecture des
  rapports) est une décision séparée, prise avec l'hébergeur de la messagerie.
- La décision D1 de F10 (envoi depuis `mail.explocardio.fr`) est remplacée par l'envoi depuis
  `explocardio.fr` ; F10 sera mise à jour par renvoi à F25.

## Dépendances

- **F10** : modèles, scénarios, consentements, centre de préférences, écrans de suivi
  (inchangés).
- **F11** : contrat du connecteur, mode démonstration et tests de contrat.
- **F15** : recette de bout en bout sur le site de recette.
- **F19** (mise de côté) : SMS d'alerte à l'équipe, après l'ouverture.

## Hors périmètre

- Modèles, campagnes et automatisations conçus dans l'outil d'envoi.
- Envoi de SMS.
- Sous-domaine de marque pour les liens de suivi.
- Durcissement de la politique DMARC.
