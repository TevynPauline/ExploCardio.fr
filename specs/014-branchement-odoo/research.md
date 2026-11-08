# Research: F14 — Branchement d'Odoo

Constats faits le 2026-11-06 sur la copie `<nom de la copie>`, en **lecture seule**,
avec la clé de Régis (scope RPC). Aucune écriture n'a été faite.

## Constats sur la copie

| Sujet | Constat |
|---|---|
| Version | Odoo 20.0 Enterprise, en ligne (odoo.com) |
| Accès | API externe JSON-RPC (`/jsonrpc`, `execute_kw`) avec clé ; temps de réponse d'une lecture de catalogue ≈ 60 ms |
| Neutralisation | paramètre système `database.is_neutralized = True` ; serveur d'envoi « neutralization - disable emails » |
| Modules | Ventes, Facturation et Comptabilité, Inventaire, Achats, CRM, Location, Signature, Rendez-vous, Assistance, Réparations… ; **pas** de Studio, Abonnements, Site web, Livraison (`delivery.carrier` absent), Fabrication |
| Produits | 10 modèles, 22 variantes ; références internes réelles au niveau des variantes (`DMS 300-4L4B`, `98-0239-01`, `ULKE`…) ; stock à 0 partout |
| Variantes | attributs « Type de câble », « Taille de brassard Orbit », « Type de raccord Orbit » ; des attributs génériques importés (Brand, Size, Color…) non utilisés |
| Catégories | Holter ECG, MAPA, MAPA / Accessoires MAPA, ERGOS, Consommables, Consommables / Protecteurs de brassards, Produits, Services… : **ne correspondent pas** aux codes du site (`holter-ecg`, `mapa`, `effort`, `ecg-repos`, `accessoires`) |
| Suivi | `tracking = serial` sur les appareils, `lot` sur le brassard |
| TVA | « 20% G » (biens) et « 20% S » (services), hors taxes |
| Prix | une seule liste de prix « Par défaut », aucune règle |
| Données propres | **pas de champ personnalisé** ; le champ `product_properties` (propriétés définies par catégorie) est disponible sans Studio ; étiquettes produit (`product.tag`) disponibles, aucune créée |
| Location | Odoo 20 : `rent_periodicity` (heures, jours, nuits, semaines — **pas de mois**), `qty_in_rent` ; commandes avec `is_rental_order`, `rental_start_date`, `rental_return_date` ; lignes avec `reserved_lot_ids`, `pickedup_lot_ids`, `returned_lot_ids` |
| Fidélité | programme « Gift Cards » (cartes cadeaux) ; produits « Gift Card » et « Top-up eWallet » sans référence |
| Clients | `l10n_fr_siret`, `l10n_fr_siren`, `vat`, `property_product_pricelist`, `credit_limit`, `trust`, `sale_warn_msg` |
| Prix calculés | aucune méthode publique de calcul de prix par liste de prix : `_get_product_price` est privée (refusée à distance) |

## R1 — Protocole d'accès

- **Decision** : JSON-RPC externe d'Odoo (`/jsonrpc`, services `common` et `object`),
  authentification par clé API, `fetch` natif de Node, sans dépendance.
- **Rationale** : vérifié sur la copie ; disponible avec l'offre Odoo en ligne de Régis ;
  scope RPC de la clé. Pas de SDK à maintenir.
- **Alternatives** : XML-RPC (même API, plus verbeux) ; la nouvelle API JSON-2 d'Odoo 19+
  (`/json/2/<modèle>/<méthode>` avec jeton porteur) — à réévaluer si Odoo annonce la fin de
  `/jsonrpc` ; le client est isolé dans un seul fichier pour en changer facilement.

## R2 — Données propres au site sans Studio

- **Decision** : utiliser les **propriétés produit** d'Odoo (`product_properties`, définies
  sur chaque catégorie Odoo, saisissables dans la fiche produit sans Studio) pour : marque,
  type d'article, quantité par lot, offre de mise à disposition (premier mois HT, mois
  suivants HT, kit requis, valeur de remplacement HT, logiciel Cloud). Le nom exact de chaque
  propriété est fixé dans le [contrat](contracts/odoo-reel.md).
- **Rationale** : principe VI — tout ce qui a une valeur en euros se règle dans Odoo ;
  propriétés natives, sans module ni licence Studio.
- **Alternatives** : Studio (non installé, payant) ; module personnalisé de l'intégrateur
  (plus lourd) ; attributs de variantes (créent des variantes parasites) ; étiquettes (pas de
  valeur numérique).
- **Risque** : les propriétés sont définies **par catégorie** ; une catégorie sans
  définition donne un produit incomplet, signalé par le rapport de contrôle (R7).

## R3 — Catégories du site

- **Decision** : une **correspondance** catégorie Odoo → rubrique du site, paramètre de
  fonctionnement du back-office (`catalogue.correspondance_categories`), une catégorie Odoo
  et ses sous-catégories alimentant une rubrique. Défaut proposé : Holter ECG → `holter-ecg`,
  MAPA → `mapa`, ERGOS → `effort`, Consommables → `accessoires`.
- **Rationale** : les adresses des rubriques du site sont fixes (`/holter-ecg`…) ; Régis
  garde son rangement Odoo ; le choix de la rubrique est du fonctionnement du site
  (principe VI).
- **Alternatives** : renommer les catégories d'Odoo comme le site (impose une organisation à
  Régis) ; propriété « rubrique du site » sur chaque produit (saisie répétitive).

## R4 — Produits visibles sur le site

- **Decision** : un produit n'est proposé que s'il a une référence interne, `sale_ok`, est
  actif, appartient à une catégorie reliée à une rubrique, **et** a un contenu publié dans le
  back-office du site (règle existante de F13/F16). Les produits sans référence (cartes
  cadeaux, porte-monnaie) sont exclus d'office.
- **Rationale** : la publication existe déjà côté site ; pas de nouveau champ dans Odoo.
- **Alternatives** : étiquette « Site » dans Odoo (doublon de la publication du back-office).

## R5 — Prix client et paliers

- **Decision** : en **lecture de catalogue**, le connecteur lit les règles de la liste de
  prix du client (`property_product_pricelist`) et de la liste par défaut, et applique le
  sous-ensemble standard : prix fixe ou remise en % sur le prix de vente, par variante,
  modèle, catégorie ou global, quantité minimale, dates de validité. Les paliers dégressifs
  sont les règles à quantité minimale de la liste par défaut. Toute règle hors de ce
  sous-ensemble (formule sur coût, autre liste, arrondis, marges) est **signalée** au rapport
  de contrôle et la règle est ignorée pour l'affichage.
  **Au récapitulatif de commande, le montant fait foi est celui calculé par Odoo** sur le
  devis (lot Commandes) ; un écart avec l'affichage est montré au médecin (cas limite de la
  spec).
- **Rationale** : Odoo n'expose aucune méthode publique de calcul de prix ; créer un devis
  brouillon à chaque affichage écrirait dans Odoo à chaque visite.
- **Alternatives** : action serveur ou petit module de l'intégrateur exposant le calcul
  (question à poser ; si elle existe, elle remplace la lecture des règles, sans changer le
  contrat) ; devis brouillon par consultation (écritures massives, refusé).

## R6 — Disponibilité

- **Decision** : quantité libre `free_qty` de chaque variante dans l'entrepôt « WH » ;
  `disponible` si > 0 ; sinon `delai` avec le délai du fournisseur principal
  (`seller_ids.delay`) s'il existe, sinon `indisponible`. Mise à disposition : nombre
  d'appareils (numéros de série) libres du modèle ; détail au lot Location.
- **Rationale** : champs standards, aucune saisie supplémentaire.
- **Alternatives** : `virtual_available` (inclut les réceptions prévues, trop optimiste).

## R7 — Rapport de contrôle des données

- **Decision** : opération de lecture du connecteur (`catalogue.controlerDonnees`, en
  démonstration comme en réel) qui renvoie la liste des anomalies par produit ou client :
  sans référence, référence en double, sans prix, sans TVA, catégorie non reliée à une
  rubrique, propriété requise manquante (marque, type ; offre complète si proposé en mise à
  disposition), appareil suivi sans numéro de série en stock, règle de prix non prise en
  charge, client sans SIRET, SIRET en double. Page du back-office « Contrôle des données
  Odoo » avec export CSV, pour l'envoyer à Régis.
- **Rationale** : FR-027 ; donne à Régis une liste de travail à jour à chaque nouvelle copie.
- **Alternatives** : script en ligne de commande (inaccessible à l'équipe).

## R8 — Garde de neutralisation (FR-005)

- **Decision** : variable `ODOO_ENVIRONNEMENT` = `recette` ou `production` (exigée en mode
  réel). En `recette`, avant la **première écriture**, le connecteur lit
  `database.is_neutralized` ; s'il n'est pas `True` (ou illisible), toute écriture lève
  `OperationRefused`. En `production`, si la base est neutralisée, le site le signale au
  journal (base de test branchée par erreur) et refuse aussi les écritures.
- **Rationale** : paramètre posé par Odoo lui-même à la neutralisation, vérifié sur la copie.
- **Alternatives** : contrôler le nom de la base (fragile).

## R9 — Erreurs, reprises, journal

- **Decision** : correspondance des erreurs Odoo → erreurs du connecteur : réseau, délai
  dépassé (10 s), HTTP 429/502/503 → `ServiceUnavailable` après 2 nouvelles tentatives
  espacées (0,5 s puis 2 s, lectures uniquement) ; authentification refusée →
  `ServiceUnavailable` côté médecin, cause « accès refusé » au journal ; enregistrement
  absent → `NotFound`. Le journal existant (`journal.ts`) enregistre opération, durée,
  résultat ; la clé n'apparaît jamais (elle est retirée de tout message d'erreur).
- **Rationale** : FR-003, FR-008, FR-009 ; mêmes codes qu'en démonstration.

## R10 — Tests de contrat en mode réel

- **Decision** : les tests de contrat lisent leurs références de test dans un **jeu de
  références par environnement** (`tests/contract/odoo/references.ts` : jeu `demo` actuel et
  jeu `copie` à remplir quand Régis aura saisi le jeu de test). En mode réel, les tests
  d'écriture sont ignorés tant que leur lot n'est pas livré, et ne tournent que si
  `ODOO_ENVIRONNEMENT=recette`.
- **Rationale** : SC-001 ; aucune écriture possible hors copie neutralisée.

## R11 — Découpage en lots

- **Decision** :
  1. **Lot 1 (ce plan, détaillé)** : client JSON-RPC, garde de neutralisation, catalogue,
     stock en lecture, prix client, rapport de contrôle. Lecture seule.
  2. Lot 2 : clients et opportunités.
  3. Lot 3 : commandes, devis, réservation de stock, remboursements, frais de port (produit
     « Livraison » en ligne de commande, le module Livraison n'étant pas installé).
  4. Lot 4 : location (module Location, facturation mensuelle déclenchée par le site),
     factures.
  5. Lot 5 : masquage de la fidélité à l'ouverture (FR-026) et offre de bienvenue (FR-026b).
  Les lots 2 à 5 seront détaillés quand les réponses à `docs/questions-branchement-odoo.docx`
  seront arrivées. Tant qu'un domaine n'est pas livré, ses opérations lèvent
  `ConfigurationIncomplete` en mode réel (comportement actuel).
- **Rationale** : la copie ne contient pas encore de quoi tester les écritures ; le lot 1 est
  utile tout de suite et sans risque.

## Questions ajoutées pour Régis et l'intégrateur

1. Accepter les **propriétés produit** (R2) pour la marque, le type et l'offre de mise à
   disposition ? Sinon, quel autre emplacement ?
2. Correspondance des catégories proposée en R3 : est-elle juste ? Où ranger l'ECG de repos ?
3. Existe-t-il, ou l'intégrateur peut-il ajouter, une méthode publique de calcul de prix par
   client (R5) ?
4. Packs (composants) : Fabrication n'est pas installé ; utiliser les produits « combo »
   d'Odoo 20, ou renoncer aux packs au démarrage ?
5. Barème de financement : où le tenir dans Odoo tant que le partenaire n'est pas choisi ?
   Par défaut, aucun barème (mensualités non affichées).

## Réponses de Régis (2026-11-08) et décisions de Pauline

Document commenté reçu le 2026-11-08 (`donnees-test-odoo.docx`).

| Sujet | Réponse | Effet |
|---|---|---|
| Références | seules les variantes ont une référence ; le parent n'en a pas et n'est jamais vendu | conforme au lot 1 (lecture par variante) |
| Catégories | sous-catégories créées (ex. « Accessoires Holter ECG » sous « Holter ECG ») | déjà pris en compte : la sous-catégorie suit son parent, ou sa propre ligne de correspondance (la plus précise l'emporte) |
| Correspondance (question 2) | validée | défaut inchangé ; ECG de repos toujours sans catégorie |
| Prix TTC | les clients ne récupèrent pas la TVA | **décision de Pauline : TTC en caractères principaux, HT juste en dessous** ; constitution 2.3.0 (principe II) ; module d'affichage à spécifier à part. Odoo reste tenu en HT |
| Produits non publiés | souhaite pouvoir ne pas publier un produit (composant de pack, produit interne) | **décision : masqué par défaut** ; un produit n'apparaît que si sa fiche est publiée dans le back-office (R4 inchangé) |
| Location (question 1) | hésite entre références dédiées et variante achat/location | **décision : références dédiées à la location**, avec un parc dédié ; à détailler au lot 4 (les propriétés de mise à disposition portent sur ces références) |
| Entrepôt | un seul pour l'instant | conforme à R6 |
| TVA | 20 % seulement prévu | conforme |
| Livraison | forfait sous un seuil de franco ; exceptions (table ULKE) | lot 3 : exclusion par produit (propriété « Hors forfait de livraison ») plutôt que des combos |
| Packs (question 4) | module Fabrication installé, un combo créé | lire les combos et nomenclatures après la prochaine copie |
| Financement (question 5) | barème d'au moins un financeur à venir, mention « à titre indicatif » | lot ultérieur |
| Utilisateur dédié | une seule licence : compte de Régis pour les tests | clé API dédiée au site, révocable ; à revoir avant l'ouverture |
| CRM | demandes vers contact@explocardio.fr | lot 2 |
| Factures, relances | modèles à adapter (Studio ou code, intégrateur) ; relances non prioritaires | lot 4 |
| À expliquer de vive voix | catégorie et type de produit, journal « Carte », question 3 (prix client) | — |

Prochaine étape : nouvelle copie neutralisée après la saisie de Régis (location, liste de prix,
propriétés Marque et Type d'article), puis nouveau rapport de contrôle.
