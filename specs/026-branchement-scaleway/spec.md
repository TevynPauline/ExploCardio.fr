# Feature Specification: F26 — Branchement de Scaleway (stockage des fichiers)

**Feature Branch**: `026-branchement-scaleway`

**Created**: 2026-11-18

**Status**: Draft

**Input**: User description: "F26 — Branchement de Scaleway (stockage objet des fichiers téléversés). Fichiers du back-office (images, logos, photos et notices PDF des produits, vidéos et sous-titres du centre d'aide) aujourd'hui gardés dans la base du site ; Scaleway Object Storage, région Paris ; connecteur « stockage » démonstration (base) / réel (Scaleway) choisi par configuration ; un compartiment privé par environnement ; adresses /stockage/… et en-têtes de sécurité inchangés ; garde de l'environnement ; clé restreinte saisie dans Scalingo ; reprise des fichiers existants ; panne gérée ; tests de contrat communs ; amendement de la constitution. Hors périmètre : CDN, adresses directes du compartiment, redimensionnement, sauvegarde de la base, factures."

## Contexte et objectif

L'équipe dépose au back-office des images (actualités, vignettes, logos de marques, photos
des produits, centre d'aide), des notices PDF (10 Mo au plus) et des vidéos d'aide avec
leurs sous-titres (50 Mo au plus). Le disque des serveurs de Scalingo étant vidé à chaque
déploiement, ces fichiers sont gardés depuis octobre **dans la base du site**. C'était une
solution d'attente : la base grossit avec chaque vidéo, ses sauvegardes s'alourdissent et
chaque affichage d'image la sollicite.

F26 range ces fichiers dans un **stockage de fichiers hébergé en France** (Scaleway, région
Paris), à travers un nouveau connecteur « stockage » :

- **démonstration** : la base du site, comme aujourd'hui (aucun compte nécessaire) ;
- **réel** : un compartiment Scaleway **privé**, propre à chaque site (recette, public).

Pour les visiteurs et pour l'équipe, rien ne change : mêmes écrans de dépôt, mêmes
contrôles, mêmes adresses `/stockage/…`, mêmes protections.

**Constitution** : la section « Connecteurs et services externes » limite les services
externes à Odoo, Stripe, PCA et l'outil d'emailing. F26 exige un **amendement** ajoutant le
stockage de fichiers hébergé en France, réservé aux contenus du back-office (aucune donnée
de patient, aucune donnée personnelle de client).

**Phases** : connecteur, démonstration et non-régression en **[Phase 1]** ; dépôts,
lectures, reprise et pannes sur Scaleway en **[Phase 3]**, sur le site de recette.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Déposer et afficher un fichier, quel que soit le stockage (Priority: P1)

Un membre de l'équipe dépose une photo de produit, une notice PDF ou une vidéo d'aide. Le
fichier est rangé dans le compartiment du site et s'affiche aussitôt sur la fiche produit
ou dans le centre d'aide, avec la même adresse et les mêmes protections qu'aujourd'hui. La
vidéo se lit et s'avance dans tous les navigateurs, Safari compris.

**Why this priority**: c'est l'usage quotidien ; tout le reste en dépend.

**Independent Test**: sur le site de recette branché sur Scaleway, déposer une image PNG,
un SVG, un PDF et une vidéo MP4 avec ses sous-titres ; les afficher, ouvrir le PDF, avancer
dans la vidéo ; vérifier que les fichiers sont dans le compartiment de recette et non dans
la base.

**Acceptance Scenarios**:

1. **Given** le stockage réel configuré, **When** l'équipe dépose un fichier accepté,
   **Then** il est rangé dans le compartiment du site, son adresse `/stockage/…` est
   enregistrée et il s'affiche sans délai visible.
2. **Given** un fichier refusé (type, signature ou taille), **When** il est déposé,
   **Then** le message de refus est identique à celui d'aujourd'hui et rien n'est rangé.
3. **Given** une vidéo rangée, **When** un navigateur demande un morceau de la vidéo,
   **Then** seul ce morceau est servi, et la lecture et l'avance rapide fonctionnent.
4. **Given** un SVG ou un PDF rangé, **When** il est ouvert directement, **Then** les mêmes
   protections qu'aujourd'hui s'appliquent (SVG en pièce jointe, aucun script exécuté).
5. **Given** le connecteur en démonstration, **When** l'équipe dépose un fichier, **Then**
   il est gardé dans la base, comme aujourd'hui.

---

### User Story 2 - Reprendre les fichiers déjà déposés (Priority: P1)

Au branchement d'un site sur Scaleway, les fichiers déjà gardés dans sa base sont copiés
dans son compartiment, sans perte et sans changer leurs adresses. Les pages, les fiches et
les contenus qui les citent continuent de fonctionner.

**Why this priority**: sans reprise, chaque photo et chaque vidéo déjà déposées
disparaîtraient du site au branchement.

**Independent Test**: sur une copie du site contenant des fichiers en base, lancer la
reprise, l'interrompre, la relancer ; vérifier que chaque fichier est dans le compartiment,
identique octet pour octet, et que toutes les pages s'affichent.

**Acceptance Scenarios**:

1. **Given** des fichiers en base, **When** la reprise est lancée, **Then** chacun est copié
   dans le compartiment sous la même adresse et le nombre copié est affiché.
2. **Given** une reprise interrompue, **When** elle est relancée, **Then** elle reprend
   sans copier deux fois ni perdre de fichier.
3. **Given** un fichier pas encore repris, **When** une page le demande, **Then** il est
   servi depuis la base (secours).
4. **Given** une copie dont le contenu ne correspond pas à l'original, **When** la reprise
   la contrôle, **Then** elle est signalée et refaite ; l'original en base n'est jamais
   effacé par la reprise.

---

### User Story 3 - Jamais de mélange entre recette et site public (Priority: P1)

Le site de recette et le site public ont chacun leur compartiment. Une erreur de
configuration (compartiment de production sur le site de recette, ou l'inverse) est
détectée et bloque les dépôts, avec une alerte pour l'administrateur.

**Why this priority**: un fichier de test publié sur le site public, ou un fichier du site
public modifié depuis la recette, serait une faute visible des clients.

**Independent Test**: sur le site de recette, configurer le nom du compartiment de
production ; vérifier que tout dépôt est refusé et que l'alerte s'affiche.

**Acceptance Scenarios**:

1. **Given** un site de recette configuré avec un compartiment non marqué « recette »,
   **When** un dépôt est tenté, **Then** il est refusé (« configuration incomplète ») et
   l'administrateur voit l'alerte dans « À traiter ».
2. **Given** le site public configuré avec un compartiment non marqué « production »,
   **When** le site démarre, **Then** la même alerte s'affiche et aucun dépôt n'est fait.
3. **Given** une configuration réelle incomplète, **When** un fichier est demandé, **Then**
   le site n'utilise jamais en cachette le stockage de démonstration.

---

### User Story 4 - Une panne de stockage ne casse pas le site (Priority: P2)

Si Scaleway est momentanément injoignable, l'équipe voit un message clair au dépôt et peut
réessayer ; les visiteurs voient les pages normalement, une image manquante étant
remplacée par son texte de remplacement.

**Why this priority**: rare, mais une page blanche ou un dépôt perdu sans explication
serait inacceptable.

**Independent Test**: simuler l'indisponibilité du stockage ; déposer un fichier, afficher
une fiche produit avec photo, ouvrir une vidéo d'aide.

**Acceptance Scenarios**:

1. **Given** le stockage injoignable, **When** l'équipe dépose un fichier, **Then** le dépôt
   est refusé avec « Le stockage des fichiers est momentanément indisponible. Réessayez
   dans quelques minutes. », et le formulaire garde les autres champs saisis.
2. **Given** le stockage injoignable, **When** un visiteur ouvre une page avec une image,
   **Then** la page s'affiche, l'image manquante ne bloque rien.
3. **Given** une panne, **When** elle se produit, **Then** elle est journalisée comme pour
   les autres connecteurs et visible dans le journal de l'administrateur.

---

### Edge Cases

- Fichier demandé qui n'existe ni dans le compartiment ni dans la base : « introuvable »
  (404), comme aujourd'hui.
- Adresse forgée pour sortir du dossier de stockage (`../`) : refusée.
- Même fichier déposé deux fois : deux adresses distinctes (noms aléatoires), aucun
  écrasement.
- Dépôt interrompu en cours de transfert : aucune adresse n'est enregistrée pour un fichier
  incomplet.
- Vidéo de 50 Mo : déposée et lue sans saturer la mémoire du serveur.
- Morceau de vidéo demandé hors des limites : réponse « plage non satisfaisable », comme
  aujourd'hui.
- Clé révoquée ou erronée : « configuration incomplète » à chaque dépôt, alerte.
- Anciens fichiers encore sur le disque local (avant octobre) : toujours lus en local, sans
  changement.
- Retour en démonstration après un branchement : les fichiers rangés dans le compartiment
  ne sont plus lisibles sur ce site ; à ne pas faire sur un site déjà branché (documenté).

## Requirements *(mandatory)*

### Functional Requirements

**Connecteur et configuration**

- **FR-001** : Le dépôt, la lecture et l'effacement des fichiers téléversés DOIVENT passer
  par un connecteur « stockage », avec un mode démonstration (base du site) et un mode réel
  (Scaleway, région Paris), choisi par configuration seule.
- **FR-002** : Les écrans de dépôt, les contrôles de type, de signature et de taille, le
  nettoyage des SVG et les messages de refus DOIVENT rester ceux d'aujourd'hui.
- **FR-003** : Une configuration réelle incomplète, une clé refusée ou un compartiment
  incohérent avec l'environnement DOIVENT donner « configuration incomplète », sans jamais
  basculer en démonstration, et s'afficher en alerte dans « À traiter ».
- **FR-004** : Chaque site DOIT déclarer son environnement (recette ou production) ; le nom
  du compartiment DOIT correspondre à cet environnement, sinon FR-003 s'applique.
- **FR-005** : La clé d'accès NE DOIT JAMAIS figurer dans le code, le dépôt ni les journaux.
  Elle DOIT être limitée au stockage de fichiers du projet ExploCardio.fr.

**Dépôt et lecture**

- **FR-006** : Un fichier déposé DOIT être rangé dans le compartiment du site sous un nom
  aléatoire et garder une adresse publique `/stockage/<dossier>/<nom>` ; aucune adresse
  directe du compartiment NE DOIT être exposée.
- **FR-007** : Le compartiment DOIT être privé ; seul le site y lit et y écrit.
- **FR-008** : Le site DOIT servir chaque fichier avec les en-têtes de sécurité et de cache
  actuels, y compris les morceaux de vidéo demandés par les navigateurs.
- **FR-009** : Un fichier NE DOIT être enregistré comme déposé qu'une fois entièrement rangé.
- **FR-010** : La lecture DOIT chercher d'abord dans le compartiment, puis dans la base
  (fichiers non encore repris), puis dans l'ancien dossier local ; sinon « introuvable ».

**Reprise des fichiers existants**

- **FR-011** : Une commande de reprise DOIT copier dans le compartiment chaque fichier gardé
  en base, sous la même adresse, en vérifiant que la copie est identique.
- **FR-012** : La reprise DOIT pouvoir être relancée sans doublon ni perte et afficher un
  bilan (copiés, déjà présents, en erreur).
- **FR-013** : La reprise NE DOIT PAS effacer les fichiers en base. Leur effacement est une
  étape séparée, manuelle, possible seulement quand tous les fichiers sont repris et
  vérifiés.

**Disponibilité et journal**

- **FR-014** : Stockage indisponible : le dépôt DOIT être refusé avec un message clair, les
  autres champs du formulaire conservés ; les pages DOIVENT s'afficher, les fichiers
  manquants ne bloquant pas le rendu.
- **FR-015** : Les opérations et les erreurs du connecteur DOIVENT être journalisées comme
  celles des autres connecteurs (sans contenu de fichier ni clé).

**Données et conformité**

- **FR-016** : Seuls les fichiers déposés par l'équipe au back-office DOIVENT être rangés :
  contenus éditoriaux, photos et documents produits, vidéos d'aide. Aucune donnée de
  patient, aucune donnée personnelle de client, aucune facture.
- **FR-017** : La constitution DOIT être amendée pour autoriser ce service externe dans ces
  limites, avant le branchement réel.

**Tests**

- **FR-018** : Le mode réel DOIT passer les mêmes tests de contrat que le mode
  démonstration, avec les mêmes erreurs (introuvable, indisponible, configuration
  incomplète).

### Key Entities

- **Fichier stocké** : contenu déposé par l'équipe, identifié par son adresse publique
  `/stockage/…`, avec son type et sa taille.
- **Compartiment** : espace de stockage privé d'un site, marqué recette ou production.
- **Reprise** : copie, rejouable et vérifiée, des fichiers gardés en base vers le
  compartiment, avec son bilan.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** [Phase 1] : avec le connecteur en démonstration, toute la suite de tests
  existante passe sans modification.
- **SC-002** [Phase 3] : 100 % des tests de contrat du connecteur stockage passent dans les
  deux modes.
- **SC-003** [Phase 3] : sur le site de recette, une image, un PDF et une vidéo de 50 Mo
  déposés s'affichent ou se lisent, la vidéo s'avance dans Safari, Chrome et Firefox.
- **SC-004** [Phase 3] : après la reprise, 100 % des fichiers de la base sont dans le
  compartiment, identiques, et aucune page ne montre d'image manquante.
- **SC-005** [Phase 3] : une image déjà affichée une fois s'affiche en moins d'une seconde
  pour un visiteur.
- **SC-006** [Phase 3] : un compartiment incohérent avec l'environnement bloque 100 % des
  dépôts et s'affiche en alerte.
- **SC-007** [Phase 3] : stockage indisponible, les pages publiques s'affichent et le dépôt
  renvoie le message prévu, sans erreur technique visible.

## Assumptions

- Le compte Scaleway d'ExploCardio.fr existe (domaine `explocardio.fr` enregistré chez
  Scaleway par Régis) ; Pauline ou Régis y créent le projet, les compartiments et la clé,
  et saisissent la clé directement dans Scalingo, jamais dans une conversation.
- Deux compartiments : un pour la recette, un pour le site public, dans la région Paris.
  Le site de démonstration reste en mode démonstration (base).
- Volumes faibles (quelques centaines de fichiers, vidéos d'aide de 50 Mo au plus) :
  l'offre standard de Scaleway suffit, pour un coût de quelques euros par mois au plus.
- Les fichiers restent servis par le site, qui garde ses protections ; un réseau de
  diffusion pourra être ajouté plus tard sans changer les adresses.
- Le site public sera branché directement sur son compartiment à l'ouverture ; la reprise
  sert surtout au site de recette et aux contenus préparés avant l'ouverture.

## Dépendances

- **F01, F03, F09, F13, F16** : écrans de dépôt et contenus qui citent les fichiers
  (inchangés).
- **F11** : modèle des connecteurs, journal, tests de contrat.
- **F14** : site de recette (`explocardio-recette`) sur lequel F26 est validée.
- **Constitution** : amendement de la section « Connecteurs et services externes ».

## Hors périmètre

- Réseau de diffusion (CDN) et adresses directes du compartiment.
- Redimensionnement ou conversion des images.
- Sauvegarde de la base du site.
- Factures et documents émis par Odoo.
- Effacement automatique des fichiers devenus inutilisés.
