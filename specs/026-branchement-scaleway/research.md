# Research — F26 Branchement de Scaleway (stockage des fichiers)

## R1. Accès au stockage : SDK S3 officiel, isolé dans le connecteur

- **Decision** : paquet `@aws-sdk/client-s3` (Scaleway Object Storage est compatible S3),
  point d'accès `https://s3.fr-par.scw.cloud`, région `fr-par`. Utilisé seulement dans
  `src/connecteurs/stockage/real/` ; la règle de lint du principe III interdit `@aws-sdk/*`
  ailleurs (motif ajouté). Délai 10 s en lecture, 60 s en dépôt, 2 tentatives.
- **Rationale** : signature des requêtes, lectures par plage (`Range`), contrôle d'intégrité
  (`Content-MD5`) et flux de lecture fournis ; typage complet.
- **Alternatives** : `aws4fetch` (léger, mais signature et erreurs à gérer soi-même) ; API
  propre à Scaleway (non standard, aucun gain).

## R2. Configuration et garde de l'environnement (FR-003, FR-004, US3)

- **Decision** : `CONNECTOR_STOCKAGE` (`demo` | `real`). En mode réel, obligatoires :
  `STOCKAGE_ENVIRONNEMENT` (`recette` | `production`), `STOCKAGE_COMPARTIMENT`,
  `STOCKAGE_CLE_ACCES`, `STOCKAGE_CLE_SECRETE`. Facultative : `STOCKAGE_REGION`
  (défaut `fr-par`).
- **Garde du nom** : le nom du compartiment DOIT contenir le mot de son environnement
  (`recette` ou `production`) et pas l'autre. Sinon `STOCKAGE_COMPARTIMENT` est comptée
  manquante → `ConfigurationIncomplete` à chaque appel et alerte dans « À traiter »
  (comme la clé Stripe incohérente de F24).
- **Rationale** : vérifiable sans appel réseau, impossible à contourner par erreur de
  copier-coller entre les deux sites Scalingo.

## R3. Contrat du connecteur

- **Decision** : trois opérations (voir [contracts/stockage.md](contracts/stockage.md)) :
  `deposer(chemin, type, octets)`, `lire(chemin, plage?)`, `existe(chemin)`.
  `lire` rend `{ type, taille, plage, corps }`, `corps` étant un flux d'octets (une vidéo de
  50 Mo n'est jamais chargée en entier en mémoire en mode réel). Fichier absent →
  `NotFound` ; service injoignable → `ServiceUnavailable` ; configuration →
  `ConfigurationIncomplete`.
- Le **type** servi est déduit de l'extension par le site (liste fermée actuelle), jamais
  des métadonnées de l'objet.
- **Alternatives** : URL pré-signées et redirection (adresses du compartiment exposées,
  en-têtes de sécurité perdus — exclu par la spec).

## R4. Mode démonstration

- **Decision** : le mode démonstration garde les fichiers dans la table `fichier_stocke` de
  la base du site, exactement comme aujourd'hui. Exception assumée au « mini base
  fictive » du principe III : ces fichiers sont des contenus du back-office, réels dès la
  phase 1 (principe III, dernier point). Aucune migration.
- Les pannes simulées du back-office (F11) s'appliquent au connecteur stockage.

## R5. Validation et lecture côté site (FR-002, FR-010)

- **Decision** : `src/lib/stockage.ts` garde les contrôles (type réel, taille, nettoyage SVG,
  nom aléatoire) et appelle `registre.stockage().deposer`. La lecture
  (`app/stockage/[...chemin]/route.ts`) essaie dans l'ordre : connecteur → table
  `fichier_stocke` (secours, mode réel seulement, avant la fin de la reprise) → ancien
  dossier `STORAGE_DIR` → 404.
- Les en-têtes actuels sont conservés tels quels ; la lecture par plage est déléguée au
  connecteur (plage S3 en réel, découpe en démonstration) ; `416` inchangé.

## R6. Panne (FR-014, US4)

- **Decision** : `ServiceUnavailable` au dépôt → message « Le stockage des fichiers est
  momentanément indisponible. Réessayez dans quelques minutes. » dans les actions du
  back-office (catalogue, contenus, aide), formulaire conservé. En lecture, la route répond
  `503` sans détail ; l'image manquante n'empêche pas l'affichage (texte de remplacement).
- Journalisation par l'enveloppe commune des connecteurs (`journal.ts`) : opération,
  chemin, durée, erreur ; jamais les octets (l'objet journalisé est le premier argument,
  le chemin) ni la clé.

## R7. Reprise des fichiers en base (US2, FR-011 à FR-013)

- **Decision** : script `scripts/reprise-stockage.ts` (`npm run stockage:reprise`), lancé
  sur Scalingo par `scalingo --app <app> run npm run stockage:reprise`. Pour chaque ligne
  de `fichier_stocke` : si l'objet existe avec la même taille et la même empreinte MD5
  (ETag d'un dépôt simple) → « déjà présent » ; sinon dépôt avec `Content-MD5`, puis
  contrôle → « copié » ou « en erreur ». Bilan affiché ; code de sortie non nul en cas
  d'erreur. Rejouable sans effet de bord.
- **Effacement** : option séparée `--effacer-la-base`, refusée tant qu'un fichier n'est pas
  vérifié présent ; elle relit chaque objet avant d'effacer sa ligne.
- Les scripts peuvent importer l'implémentation réelle (lint : `scripts/**` exclu), comme
  le remplissage de la démonstration.

## R8. Droits de la clé (FR-005)

- **Decision** : une « application » IAM Scaleway par site, avec une politique limitée au
  projet ExploCardio.fr : `ObjectStorageObjectsRead`, `ObjectStorageObjectsWrite`,
  `ObjectStorageObjectsDelete`, `ObjectStorageBucketsRead`. Pas d'accès à la facturation ni
  au domaine. Clé générée au moment de la saisie dans Scalingo.
- Compartiments **privés**, sans politique publique ; versionnage non activé (fichiers
  jamais modifiés : chaque dépôt a un nom aléatoire nouveau).

## R9. Garde des données fictives et garde réseau

- La garde « données fictives » s'applique comme aux autres connecteurs réels ; elle ignore
  déjà les octets (`Uint8Array`). La garde réseau du mode démonstration est sans objet (le
  mode démonstration n'appelle aucun service).

## R10. Amendement de la constitution

- **Decision** : version **2.4.0** (MINEUR : ajout d'un service externe et d'une règle) —
  principe III (liste des services) et section « Connecteurs et services externes » :
  stockage de fichiers hébergé en France, réservé aux fichiers du back-office, un espace
  privé par environnement, sans donnée de patient, donnée personnelle de client ni facture.
